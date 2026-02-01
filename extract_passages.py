#!/usr/bin/env python3
"""Extract passages from 'How We Die' EPUB using Claude Sonnet API."""

import json
import os
import sys
import time

import anthropic
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup

EPUB_PATH = "Library/Sherwin_Nuland/How We Die /How We Die - Nuland, Sherwin B.epub"
OUTPUT_PATH = "library/how-we-die/passages.json"

# Chapters to extract (index in spine, chapter label, body_system)
CHAPTERS = [
    (8,  "Foreword",                        "general"),
    (10, "Introduction",                    "general"),
    (12, "I - The Strangled Heart",         "heart"),
    (13, "II - A Valentine—and How It Fails","heart"),
    (14, "III - Three Score and Ten",       "general"),
    (15, "IV - Doors to Death of the Aged", "general"),
    (16, "V - Alzheimer's Disease",         "brain"),
    (17, "VI - Murder and Serenity",        "cancer"),
    (18, "VII - Accidents, Suicide, and Euthanasia", "general"),
    (19, "VIII - A Story of AIDS",          "immune"),
    (20, "IX - The Life of a Virus and the Death of a Man", "immune"),
    (21, "X - The Malevolence of Cancer",   "cancer"),
    (22, "XI - Hope and the Cancer Patient","cancer"),
    (23, "XII - The Lessons Learned",       "general"),
    (24, "Epilogue",                        "general"),
]

CHUNK_PROMPT = """You are processing a chapter from "How We Die" by Sherwin B. Nuland.

Break this chapter text into passages of 150-400 words each. Cut at natural narrative break points — scene changes, topic shifts, paragraph boundaries. Preserve the author's exact words and paragraph breaks within each passage.

For each passage, provide:
- title: A vivid 5-8 word title capturing the passage's hook
- summary: One sentence summarizing what happens/is discussed
- theme: One of: narrative, science, philosophy, history, personal

Return ONLY a JSON array (no markdown fences). Each element:
{"title": "...", "summary": "...", "theme": "...", "content": "..."}

The content field must contain the EXACT original text for that passage, preserving paragraph breaks as newlines.

CHAPTER TEXT:
"""


def extract_text(item):
    """Extract clean text from an EPUB HTML item."""
    soup = BeautifulSoup(item.get_content(), 'html.parser')
    # Remove footnote links but keep text
    for sup in soup.find_all('sup'):
        sup.decompose()

    paragraphs = []
    for p in soup.find_all(['p', 'h1', 'h2', 'h3']):
        text = p.get_text(strip=True)
        if text:
            paragraphs.append(text)

    return "\n\n".join(paragraphs)


def log(msg):
    print(msg, flush=True)


def save_progress(all_passages):
    """Write passages.json after each chapter so progress is visible."""
    output = {
        "meta": {
            "title": "How We Die",
            "author": "Sherwin B. Nuland",
            "slug": "how-we-die",
        },
        "passages": all_passages,
    }
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)


def chunk_chapter(client, chapter_label, text):
    """Send chapter to Claude Sonnet to chunk into passages."""
    log(f"  Sending to Claude API ({len(text.split())} words)...")

    for attempt in range(3):
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=20000,
            messages=[{"role": "user", "content": CHUNK_PROMPT + text}],
        )

        raw = response.content[0].text.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            if raw.endswith("```"):
                raw = raw[:raw.rfind("```")]

        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            log(f"  JSON parse error (attempt {attempt+1}/3): {e}")
            if attempt < 2:
                log("  Retrying...")
                time.sleep(2)
            else:
                raise


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: Set ANTHROPIC_API_KEY environment variable")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    book = epub.read_epub(EPUB_PATH)
    docs = list(book.get_items_of_type(ebooklib.ITEM_DOCUMENT))

    # Resume from existing progress
    all_passages = []
    done_chapters = set()
    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH) as f:
            existing = json.load(f)
        all_passages = existing.get("passages", [])
        done_chapters = {p["chapter"] for p in all_passages}
        log(f"Resuming: {len(all_passages)} passages from {len(done_chapters)} chapters already done")

    passage_id = len(all_passages) + 1

    # Find the next chapter to process
    total = len(CHAPTERS)
    next_chapter = None
    for i, (idx, chapter_label, body_system) in enumerate(CHAPTERS, 1):
        if chapter_label not in done_chapters:
            next_chapter = (i, idx, chapter_label, body_system)
            break

    if next_chapter is None:
        log(f"All done! {len(all_passages)} passages → {OUTPUT_PATH}")
        return

    i, idx, chapter_label, body_system = next_chapter
    log(f"[{i}/{total}] {chapter_label}")
    text = extract_text(docs[idx])

    if len(text.split()) < 50:
        log("  Skipping (too short)")
        # Save with empty so it counts as done, then tell user to run again
        save_progress(all_passages)
        log(f"  Run again for next chapter.")
        return

    chunks = chunk_chapter(client, chapter_label, text)
    log(f"  Got {len(chunks)} passages")

    for chunk in chunks:
        all_passages.append({
            "id": passage_id,
            "chapter": chapter_label,
            "title": chunk["title"],
            "summary": chunk["summary"],
            "body_system": body_system,
            "theme": chunk["theme"],
            "content": chunk["content"],
        })
        passage_id += 1

    save_progress(all_passages)
    remaining = total - i
    log(f"  Total: {len(all_passages)} passages. {remaining} chapters remaining.")
    if remaining > 0:
        log(f"  Run again for next chapter.")


if __name__ == "__main__":
    main()
