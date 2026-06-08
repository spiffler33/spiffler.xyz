# House MD — Build Plan (thin)

Revive the old `house-md` app as **static, kid-friendly medical-learning pages** on spiffler.xyz.
One House episode → one page that teaches its medical mystery in simple layers.
**One episode per session, no hurry.**

## Decisions (locked)
- **Static only** — no backend, no live AI. Plain HTML/CSS + tiny JS. Lives at `/house-md/`, own card on `/tinker.html` (not under brain-learning).
- **Source:** HF dataset `morbidnacho/house-md` (all 22 S1 episodes as `house_dataset_<title>.jsonl`). Pull with local HF token (`~/.cache/huggingface/token`), reconstruct a linear transcript by walking records in order. ~90% script coverage → cross-check each diagnosis vs documented episode facts.
- **Audience:** as young as possible — for the non-medical friends who watch House. Analogy-first, every term explained, a little fun.
- **Build style:** advisor off, Opus max on, use a workflow for the medical fact-check pass.

## Structure
```
/house-md/
  index.html      # episode list — cards, like brain-learning/index.html
  s01e01.html     # one self-contained page per episode
  plan.md
```

## Webpage design
- Reuse the site shell: `styles.css`, JetBrains Mono, same header/nav/footer as tinker & brain-learning (consistency keeps it lean).
- Episode page = vertical, mobile-first, progressive **layer cards**; light progress cue; minimal JS (reveal / smooth-scroll). No framework.
- Warm and friendly, **not** clinical or scary. (Final palette/feel decided while building the Pilot.)
- Diagrams optional per episode — add a simple inline SVG only when it genuinely helps (the old vasculitis SVGs were broken; don't reuse).
- Index cards tease the case with a symptom hook; don't spoil the diagnosis.

## Explanations design (the layers)
Start at zero knowledge → build to diagnosis & treatment. Count is flexible; suggested spine:
1. The Mystery — the patient + symptoms (the hook)
2. Body Basics — the organ/system involved, assume nothing
3. How it normally works
4. First clues — what went wrong
5. The usual suspects — a simple differential
6. Detective work — the tests, explained plainly
7. Wrong turns — the red herrings (House's misdirections)
8. The "Aha" — the key discovery
9. The real culprit — the disease, fully but simply
10. The fix — treatment & recovery

Rules: analogy-first; define every term on first use; short paragraphs; concrete over abstract; keep House's wit as a hook; medically accurate (fact-check before publish).

## Per-episode workflow
script → reconstruct transcript → distill the medical case → write the layered page → medical-accuracy fact-check (workflow) → add card to index + tinker.

## Next step
Build **S01E01 — the Pilot** end-to-end as the template (case: neurocysticercosis — a tapeworm cyst in the brain; red-herring tumor; gadolinium-allergy beat; steroids). Get this one right; the rest is repetition.
