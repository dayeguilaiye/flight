# Interactive Music Theory Learning

## Goal

Create a frontend-only music theory learning surface for beginners who do not own a piano and do not yet know the shape of the subject. The page must turn every core abstraction into an immediate connection between explanation, visible piano keys, structural labels, and sound, while supporting both a coherent learning path and unrestricted exploration.

## Background

- A beginner reading or watching conventional tutorials cannot easily map notes, intervals, scales, chords, arpeggios, and progressions to piano keys or hear the described result without an instrument.
- The representative interaction is a C-major diatonic-chord lesson where selecting a chord highlights its keys, identifies its chord tones, and plays it.
- Flight is a collection of isolated experiments and tools. This feature is an independent frontend vertical slice and must not introduce backend coupling.

## Requirements

### Product boundary

- Add a standalone tool-directory homepage at `/` that links to every real tool currently available in Flight.
- Move the existing LLM API tester to `/llm-api-tester` and add the music-theory feature under `/music-theory`.
- Give the project a real client-side router with directly addressable tool and lesson routes.
- Keep the router visually neutral: it chooses a page but does not render a shared header, shared page frame, or mandatory cross-feature chrome.
- Let each tool page own its title area, home link, language switch placement, layout, and visual expression while following the common design and accessibility specifications.
- Keep the complete feature usable without login, backend business APIs, database tables, or feature-owned browser persistence.
- Do not restore learning progress, settings, exercise results, or exploration state after a reload.
- Provide complete `zh-CN` and English UI copy through the existing application i18n provider; Simplified Chinese remains the first-visit default.

### Homepage

- Make `/` a focused Flight tool index rather than a marketing landing page or a tool implementation.
- Introduce Flight with one concise statement, then list only tools that actually exist.
- In the first release, show exactly two real destinations: the LLM API tester and interactive music-theory learning, each with a short purpose description and a semantic link.
- Do not add empty “coming soon” cards, invented usage metrics, long personal-lab editorial sections, testimonials, or generic product claims.
- Let the homepage own its language control and complete visual composition; it must not establish a header contract for other pages.

### Open navigation model

- The homepage must provide direct semantic links to the LLM API tester and music-theory page; future tools join the same real-tool index.
- Expose every chapter and every lesson from the first visit. Do not use unlock rules, prerequisites, completion gates, or a forced onboarding path.
- Let users enter any lesson directly from the complete chapter tree, move to adjacent lessons when desired, and open the free laboratory at any time.
- Represent the selected chapter and lesson in the URL so refresh, browser history, bookmarks, and copied links return to that lesson without storing user data.
- Do not display a resume prompt, saved completion percentage, points, streaks, badges, or other progress pressure.

### Teaching model

- Start from audible and playable observations before introducing abstract notation. Do not assume the learner can read staff notation.
- Pair every core concept with a short explanation, visible keys or a structural diagram, and sound.
- Let users click the virtual piano directly and see the active note name.
- Selecting a note, interval, scale, chord, or progression example must update the same shared piano visualization and playback target.
- Explain why the highlighted notes belong to the concept by identifying roles such as tonic, root, third, fifth, scale degree, or interval distance.
- Allow root-note or key changes so structures can be transposed rather than being hard-coded to C major.
- Use optional observation prompts or unscored micro-experiments only when they clarify a concept. Their result must never block navigation or be saved.

### First-release curriculum

The first release deliberately implements six chapters deeply instead of shipping shallow placeholders as lessons.

1. **Sound and the keyboard**
   - Keyboard geography and the repeating black-key pattern
   - Note names and pitch direction
   - Octaves and pitch classes
   - Semitones, whole tones, sharps, flats, and enharmonic names
   - A guided two-octave keyboard observation
2. **Hear intervals**
   - An interval as distance between two notes
   - Counting semitones and naming interval numbers
   - Perfect, major, minor, augmented, and diminished qualities at an introductory level
   - Melodic versus harmonic playback
   - Transposing the same interval from any of 12 roots
3. **Scales and keys**
   - Scale degrees, tonic, and the meaning of a key
   - The major-scale whole/half-step formula
   - The natural-minor formula
   - Moving a scale to 12 tonics with musically correct spellings
   - Comparing parallel and relative major/minor relationships
4. **Build triads**
   - Stacking thirds from a root
   - Major, minor, diminished, and augmented triad formulas
   - Root, third, and fifth roles
   - Root position, first inversion, and second inversion
   - A build-a-triad experiment that adds notes one at a time
5. **Diatonic chords**
   - Building a triad on every scale degree
   - Major-key diatonic triad qualities
   - Natural-minor diatonic triad qualities
   - Roman numerals and case/degree symbols
   - Introductory tonic, predominant, and dominant functions
6. **Make chords move**
   - A progression as movement between harmonic functions
   - Authentic, plagal, and deceptive-cadence observations
   - Common progressions including I–V–vi–IV, ii–V–I, and I–vi–IV–V
   - Block-chord and ascending/descending arpeggio playback
   - Comparing root-position motion with a simple close-position voice-leading strategy

The always-available free laboratory reuses the same theory and playback model to select notes, roots, scale types, triad types, inversions, and playback modes. It does not need to recognize arbitrary complex chords in the first release.

The page may show an honest future-learning map for rhythm and meter, seventh chords, additional accompaniment patterns, modes, borrowed chords, and modulation. These topics must be visibly marked as future material and must not masquerade as completed interactive lessons.

### Interaction, sound, and accessibility

- Use a quiet, adult interactive-workbench tone without gamified feedback or childish presentation.
- Initialize Web Audio only after an explicit user gesture and provide an understandable visual-only fallback when audio cannot start.
- Provide stop controls. Starting a new example, navigating to a different lesson, hiding the page, or unmounting the feature must not leave uncontrolled scheduled notes playing.
- Support block chords, melodic intervals, harmonic intervals, arpeggios, individual progression chords, and complete progression playback where relevant.
- Support polyphonic real-time piano input: multiple computer keys or pointers may sustain a chord, and releasing one input must not stop the other held notes.
- Make the virtual piano and all primary lesson controls keyboard-operable with semantic labels and visible focus.
- Distinguish root/tonic, other active notes, and playback state with labels or symbols in addition to color.
- Support desktop and narrow mobile layouts. The core course must remain usable without horizontal page overflow; the piano may adapt its visible range or key proportions at narrow widths.
- Respect WCAG AA contrast and `prefers-reduced-motion` while inheriting Flight's semantic tokens and restrained visual family.

### Selected surface direction

- Use the approved **vertical chapter deep-dive** composition from `.impeccable/mocks/decision/music-theory-chapter-dive.png` as the comp-led layout contract.
- On desktop, show the complete lesson tree on the left, an editorial interactive lesson in the center, contextual explanation/playback controls on the right, and a docked piano across the bottom.
- On mobile, turn the complete lesson tree into a directly accessible drawer or sheet, keep lesson content in one readable column, and keep the piano available through a compact dock without hiding any lesson behind completion state.

## Technical Notes

- Use the existing React, TypeScript, Vite, and Tailwind CSS stack.
- Keep application routing in `frontend/src/app/`, the homepage in its own frontend feature directory, and tool-specific visual structure inside each tool feature.
- Keep theory calculations, typed course content, audio scheduling, feature state, and feature UI under `frontend/src/features/music-theory/`.
- Add no Go backend feature, API route, SQLite table, remote sound dependency, or licensed piano sample library.
- Prefer local Web Audio synthesis with a short, warm, low-fatigue envelope. The exact timbre is subordinate to stable pitch, clear attacks, and audible harmonic relationships.
- Generate notes, intervals, scales, triads, diatonic chords, and progression voicings from one typed theory model rather than repeating note arrays in lesson components.
- Treat URL chapter/lesson identifiers as an input boundary and fall back safely when they are unknown.

## Acceptance Criteria

- [ ] `/` renders a standalone Flight tool-directory homepage rather than the LLM API tester.
- [ ] The homepage contains one concise Flight introduction and exactly two real tool entries with localized purpose descriptions and links to `/llm-api-tester` and `/music-theory`; each destination is directly loadable and browser navigation works.
- [ ] The homepage contains no future-tool placeholders, fake metrics, testimonials, or long editorial filler.
- [ ] The router renders no shared visual header or mandatory page frame; the homepage, LLM API tester, and music-theory page retain independent page-owned composition.
- [ ] The music-theory page remains fully usable with the backend stopped, no login, and no feature-owned local/session storage.
- [ ] The complete six-chapter lesson tree is visible or one action away, and every listed lesson is directly selectable from the first visit.
- [ ] A valid lesson URL opens that lesson after direct navigation or refresh; browser back/forward follows lesson selections; an invalid identifier falls back without a blank or crashed page.
- [ ] No chapter is locked and the page contains no score, streak, completion percentage, badge, or history-dependent gate.
- [ ] At least two octaves of virtual piano notes can be triggered by pointer and keyboard, with the played note identified visually; multiple held inputs form a chord and release independently.
- [ ] Selecting a lesson example highlights its notes immediately; root/tonic and other roles have non-color markers; the page displays note names and the relevant interval/degree/chord explanation.
- [ ] Major and natural-minor scales calculate correctly for 12 tonics with diatonically appropriate note spellings.
- [ ] Major, minor, diminished, and augmented triads plus root position, first inversion, and second inversion calculate and play correctly.
- [ ] All seven C-major diatonic triads are independently selectable and correctly show I, ii, iii, IV, V, vi, vii°, chord quality, chord tones, and introductory harmonic function.
- [ ] Major-key and natural-minor diatonic triads transpose correctly when the user changes tonic.
- [ ] Users can hear block chords, ascending/descending arpeggios, at least three complete progressions, and a close-position voice-leading comparison, and can stop playback midway.
- [ ] The free laboratory can add/remove selected notes and audition the result without writing exploration state to a backend or browser storage.
- [ ] If Web Audio initialization fails or is unavailable, all visual explanations and piano highlights remain usable and localized feedback is shown.
- [ ] All primary controls work by keyboard with visible focus, semantic accessible names, and no color-only state.
- [ ] Desktop and common mobile widths preserve direct lesson access, readable content, usable playback controls, and a usable piano without horizontal page overflow.
- [ ] All new visible copy and accessibility labels exist in both translation dictionaries and dictionary parity tests pass.
- [ ] Theory-domain calculations, playback-plan scheduling, URL parsing, and representative interactive behavior have automated tests.
- [ ] Frontend typecheck, test, production build, and bounded desktop/mobile visual review pass.

## Out of Scope

- Accounts, cloud sync, saved progress, bookmarks, scores, achievements, or any other feature-owned persistence.
- MIDI hardware, microphone input, pitch detection, recording, waveform editing, or audio-file import/export.
- A full composition/arrangement workstation, staff-notation editor, or DAW.
- Automatic recognition of arbitrary complex user chords or harmonic analysis of uploaded/composed music.
- Full rhythm training, seventh-chord curriculum, advanced modes, borrowed harmony, or modulation lessons in the first release.
- Remote music-content services, backend audio generation, or a licensed downloadable piano sample set.
- A visually uniform global application shell that forces all tools into the same header or layout.
