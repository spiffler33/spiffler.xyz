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

## Status
- **2026-06-08 — S01E01 (Pilot) DONE & committed** (`e3cee04`): `/house-md/s01e01.html` (the template episode) + `/house-md/index.html` (episode list) + a `house-md` card on `/tinker.html`. Distilled from the verbatim HF transcript; passed an adversarial medical fact-check workflow (3 lenses + verifier), 7 fixes applied. The page structure above is now the **locked template** — copy it per episode.
- **2026-06-08 — S01E02 (Paternity) DONE & committed**: `/house-md/s01e02.html` (copied the locked Pilot template) + an S01E02 card on `/house-md/index.html`. Case = SSPE (measles caught in infancy, hid ~16 yrs); theme = the hidden adoption + pro-vaccine. Passed the adversarial fact-check workflow (3 lenses + verifier); 7 fixes applied — chiefly the biological-mother-vs-Dan vaccination correction, real MMR timing (~12 mo, not the show's 6), penicillin via spinal tap (shunt = safety, not conduit), and SSPE reframed as a smoldering infection. Transcript kept in `~/dev/scratch/house-md-paternity/` only.
- **2026-06-08 — S01E03 (Occam's Razor) DONE & committed**: `/house-md/s01e03.html` (copied the locked template) + an S01E03 card on `/house-md/index.html`. Case = colchicine poisoning (a gout drug that jams cell division → fast-renewing tissues fail in a telltale order); source = a pharmacy pill mix-up (cough-medicine Rx filled with colchicine, the stamped-letter giveaway, mom's re-dosing relapse, Ecstasy red herring); theme = Occam's Razor. The HF transcript cut off before the finale, so the resolution was cross-checked vs documented episode facts (House Wiki). Passed the adversarial fact-check workflow; 7 fixes applied — chiefly the kidneys-before-bone-marrow toxicity order, softening the "fastest-renewing to slowest" overclaim (renal failure is hemodynamic, neurons post-mitotic), and reframing the pharmacy theory as incomplete-not-wrong. Transcript kept in `~/dev/scratch/house-md-occams-razor/` only.
- Known limitation: ~90% dataset coverage means runs of non-House lines can thin out, so keep cross-checking each diagnosis against documented episode facts (the fact-check workflow is how).

## Next step
Build **S01E04 — "Maternity"** end-to-end, copying the locked template. Same per-episode workflow: confirm the HF file name first (likely `house_dataset_maternity.jsonl`; if it 404s, list the dataset tree at the HF API — and watch for filename quirks like the space in `house_dataset occams_razor.jsonl`) → reconstruct the transcript in `~/dev/scratch` (never the repo) → distill, cross-checking the diagnosis **and** the finale against documented episode facts (the transcript can cut off before the reveal, as it did for S01E03) → write `/house-md/s01e04.html` → run the fact-check workflow → add its card to `/house-md/index.html` → commit only the episode files. One episode per session, no hurry.
