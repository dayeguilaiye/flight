# Interactive Music Theory Learning — Implementation Plan

## Preconditions

- [ ] User has reviewed and approved `prd.md`, `design.md`, and this plan.
- [ ] Trellis task is started and Phase 2 context is loaded through `trellis-before-dev`.
- [ ] Impeccable comp-led execution requirements and craft floor are loaded before UI edits.

## Ordered implementation

### 1. Application routing and feature entry

- Add `react-router-dom` and test dependencies needed for routed component behavior.
- Introduce a non-visual app router for `/`, `/llm-api-tester`, `/music-theory`, lesson deep links, and the free lab.
- Create a standalone homepage in `features/home/` with a concise localized Flight introduction and exactly two wide editorial index links for the real tool pages.
- Keep the homepage free of future-tool placeholders, invented proof, generic marketing sections, and card-grid boilerplate.
- Move the existing tester surface to `/llm-api-tester` without wrapping it in shared application chrome.
- Keep title areas, home links, language-switch placement, and layouts page-owned; do not add a global header or page frame.
- Add route parsing/fallback tests before building lesson UI.

Rollback point: routing and the homepage can be reverted independently of theory-domain code, with the tester restored at `/` if needed.

### 2. Pure theory domain

- Implement pitch classes, spelled notes, MIDI/frequency conversion, and note-range helpers.
- Implement intervals, major/natural-minor scales, 12-tonic spelling, triads, inversions, diatonic harmony, roman numerals, and harmonic functions.
- Implement progression resolution and bounded close-position voicing.
- Implement pure playback plans for single, harmonic, melodic, arpeggio, and progression modes.
- Add exhaustive representative unit tests, including sharp/flat keys and octave boundaries.

Rollback point: domain modules are pure and have no UI or browser dependencies.

### 3. Audio adapter and feature controller

- Implement lazy Web Audio initialization, synthesized voices, plan scheduling, polyphonic live note-on/note-off, status, stop/cancel, and cleanup.
- Implement a reducer/controller that derives highlights, labels, and playback plans from lesson and control state.
- Stop playback on new top-level play, route change, hidden document, and unmount.
- Add fake-context adapter tests and unavailable-audio behavior tests.

Rollback point: the visual domain remains usable with a no-op/unavailable audio adapter.

### 4. Typed course catalog and translations

- Add all six chapters, concrete lessons, future-map entries, route slugs, and lesson-kind metadata.
- Add Chinese and English navigation copy, lesson prose, control labels, errors, accessible names, and document titles.
- Extend translation-key parity tests before using the new keys in UI.
- Keep future topics separate from active lesson routes.

### 5. Approved music-theory surface and piano dock

- Implement the approved vertical deep-dive composition as a self-contained page: page-owned title/navigation area, complete chapter tree, central lesson, right inspector, and bottom piano dock.
- Implement semantic piano buttons, role markers, sustained multi-pointer/multi-key triggering, independent note release, label toggle, stop control, and narrow-screen octave shifting.
- Add surface-local semantic tokens only where the shared tokens cannot express the approved comp.
- Preserve the visual direction contract in emitted markup and verify the seed key survives the production build as required by Impeccable.

Visual rollback point: shell styling is isolated from theory calculations and course data.

### 6. Interactive lesson families

- Implement sound/keyboard lessons and guided observation.
- Implement interval explorer with melodic/harmonic playback.
- Implement major/natural-minor scale builders and comparisons.
- Implement triad construction, qualities, and inversions.
- Implement major/minor diatonic harmony, roman numerals, and functions.
- Implement cadence, common-progression, arpeggio, and voice-leading comparisons.
- For every lesson family, connect selection to the shared structure view, piano highlights, and playback target.

### 7. Free laboratory and future map

- Implement free note selection and audition.
- Add root, scale, triad, inversion, and playback-mode explorers by reusing domain functions and feature components.
- Add the clearly labeled non-interactive future-learning map.
- Verify no feature state crosses into local storage or network calls.

### 8. Responsive, accessibility, and hardening pass

- Implement tablet reflow and mobile chapter-tree sheet/compact piano dock.
- Add focus management, Escape behavior, visible focus, live audio status, reduced-motion behavior, and non-color state markers.
- Verify interaction while audio is unavailable and while rapidly changing lessons/examples.
- Check Chinese and English at desktop and narrow widths.

### 9. Automated and visual verification

- Run domain, route, component, audio-adapter, and i18n tests.
- Run typecheck/lint and production build.
- Start the local app and inspect one desktop and one mobile viewport in a single bounded screenshot pass.
- Compare the desktop result against the approved comp; batch-fix layout, overflow, accessibility, and material fidelity issues; run at most one confirmation pass.
- Run the Impeccable detector, finish reviewer, and documenter workflow. Record any remaining review disposition accurately.
- Run Trellis `trellis-check`, update project specs only if a reusable convention was learned, and present the finished change for commit approval.

## Validation commands

```bash
pnpm --dir frontend test
pnpm --dir frontend typecheck
pnpm --dir frontend build
go test ./...
node .agents/skills/impeccable/scripts/detect.mjs --json frontend/src/app frontend/src/features/music-theory frontend/src/shared
```

`go test ./...` protects the existing embedded-server behavior even though the feature has no backend code.

## Risk review

- **Theory correctness:** protect with pure functions, correct diatonic spelling, and table-driven tests before lesson composition.
- **Runaway audio:** centralize scheduling/cancellation and test every route/change cleanup path.
- **Oversized content scope:** reuse a small set of explicit lesson families; do not create a generic CMS or add advanced future lessons.
- **Dense selected comp:** treat desktop fidelity and mobile adaptation as separate acceptance targets.
- **Existing-feature regression:** keep `/` behavior, language switching, build embedding, and backend tests in the final gate.
