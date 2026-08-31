# Interactive Music Theory Learning — Technical Design

## 1. Scope and boundaries

The music-theory feature is a frontend-only vertical slice. It owns its theory domain, course catalog, interaction state, playback planning, Web Audio adapter, page, and feature components. It has no API client and no backend package.

The application layer gains real client routing because Flight now has more than one independently addressable frontend feature. The router is non-visual: it owns top-level route matching but renders no shared header, feature switcher, or page frame. The homepage, LLM API tester, and music-theory feature each own their complete surface composition. The music-theory feature also owns chapter/lesson route-parameter validation.

## 2. Surface contracts

### 2.1 Homepage

```yaml
mode: persuade
density: airy
motion: subtle
variance: medium
theme: light
accent: shared
```

The homepage is a focused tool index, not a global shell. A page-owned language control sits independently from a concise Flight title and purpose statement. Beneath it, two wide editorial index rows link to the real tools. Each row uses a stable number, tool name, one-sentence purpose, and a clear directional affordance. Prefer grouping, rules, and whitespace over generic elevated cards.

The first desktop viewport contains the complete introduction and both tools without filler. Mobile becomes one readable column with full-width links and 44 px minimum interactive targets. No element of this composition is rendered around destination pages.

### 2.2 Music theory

```yaml
mode: operate
density: comfortable
motion: subtle
variance: medium
theme: light
accent: shared signal
```

The selected composition is the approved vertical chapter deep-dive comp at `.impeccable/mocks/decision/music-theory-chapter-dive.png`.

Desktop composition:

1. A page-owned title/navigation area lives within the feature composition and may contain a home link and the existing language control without establishing global chrome.
2. A persistent left rail exposes all chapters and lessons.
3. A central editorial column owns the selected lesson and its primary interactive demonstration.
4. A right inspector owns contextual notes, root/key selectors, playback modes, and audio status when those controls are relevant.
5. A bottom piano dock visualizes and plays the current lesson target.

The central lesson is the only scrolling content region on wide screens; the navigation, inspector, and piano remain stable. On narrow screens the layout becomes a normal document flow: header, lesson selector button, lesson, context controls, and compact piano dock. The full tree opens as an accessible modal sheet/drawer and never filters or locks lessons.

## 3. Proposed file layout

```text
frontend/src/app/
├── App.tsx
└── routes.ts
frontend/src/features/home/
└── pages/HomePage.tsx
frontend/src/features/music-theory/
├── pages/MusicTheoryPage.tsx
├── components/
│   ├── CourseNavigator.tsx
│   ├── LessonArticle.tsx
│   ├── LessonInspector.tsx
│   ├── PianoDock.tsx
│   ├── PianoKeyboard.tsx
│   ├── PlaybackControls.tsx
│   ├── NoteStructure.tsx
│   └── FreeLab.tsx
├── course/
│   ├── catalog.ts
│   ├── lessonContent.ts
│   └── types.ts
├── domain/
│   ├── notes.ts
│   ├── intervals.ts
│   ├── scales.ts
│   ├── chords.ts
│   ├── harmony.ts
│   └── playback.ts
├── audio/
│   └── AudioEngine.ts
├── hooks/
│   └── useMusicTheoryWorkbench.ts
└── *.test.ts(x)
```

Files should be introduced only when their responsibility is real. The page composes the surface; theory math remains pure; the audio adapter contains browser objects; course copy and navigation metadata remain typed data.

## 4. Application routing and lesson URLs

Add `react-router-dom` and define stable routes in the non-visual application router:

- `/` — standalone Flight tool-directory homepage
- `/llm-api-tester` — existing LLM API tester
- `/music-theory` — canonical music-theory entry; renders the first lesson without requiring a redirect
- `/music-theory/:chapterSlug/:lessonSlug` — directly addressable lesson
- `/music-theory/lab` — free laboratory

The application router is a pure composition boundary and introduces no shared visual wrapper. The homepage links to the two real tool routes. Each tool may render its own page-local route back to `/` and place `LanguageSwitcher` where its composition requires.

The chapter/lesson catalog is the authority for slug validation. Unknown pairs render a localized not-found-within-feature state containing links to the first lesson and complete course tree; they must not crash or silently select an unrelated valid lesson.

Lesson links use real anchors so open-in-new-tab and copy-link work. Client routing preserves browser history. Navigation changes the selected lesson and stops scheduled playback but does not mutate storage.

## 5. Theory domain model

### Core types

```ts
type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
type MidiNote = number
type LetterName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
type Accidental = 'bb' | 'b' | '' | '#' | '##'
type SpelledNote = { letter: LetterName; accidental: Accidental; pitchClass: PitchClass }
type ScaleKind = 'major' | 'naturalMinor'
type TriadQuality = 'major' | 'minor' | 'diminished' | 'augmented'
type Inversion = 0 | 1 | 2
```

`MidiNote` is validated at creation boundaries instead of using a broad assertion throughout the UI. Frequency is derived with `440 * 2 ** ((midi - 69) / 12)`.

### Spelling rules

Scales are constructed by rotating diatonic letter names from the tonic, then selecting the accidental that matches each target pitch class. This preserves spellings such as F-sharp in G major and B-flat in F major. A 12-tonic selector may present one conventional enharmonic spelling per tonic in the first release; the domain still separates pitch class from display spelling.

### Derived structures

- Intervals derive a target MIDI note, semitone count, number, and introductory quality.
- Scales derive seven spelled degrees plus MIDI notes in a requested display octave.
- Triads derive scale-independent formulas and inversion order.
- Diatonic harmony stacks degrees 1/3/5 inside the selected scale, calculates quality, roman numeral, and introductory function.
- Progression definitions store roman-numeral degrees, not note arrays. They resolve through the current key.
- A pure close-position voicing function chooses inversions/octaves that minimize total adjacent voice movement within a bounded range. It is educational, not a general voice-leading solver.

Every lesson and free-lab interaction consumes these functions. No component owns a parallel table of chord notes.

## 6. Typed course catalog and lesson rendering

The course catalog contains stable IDs/slugs, chapter ordering, lesson ordering, translation keys, and a discriminated `lessonKind`. Translation resources own visible prose; the catalog owns structure.

```ts
type LessonKind =
  | 'keyboardMap'
  | 'noteDistance'
  | 'intervalExplorer'
  | 'scaleBuilder'
  | 'scaleComparison'
  | 'triadBuilder'
  | 'triadInversions'
  | 'diatonicHarmony'
  | 'harmonicFunction'
  | 'cadenceComparison'
  | 'progressionPlayer'
  | 'voiceLeadingComparison'
```

`LessonArticle` switches exhaustively on `lessonKind` and composes focused feature components. This keeps navigation data declarative without inventing a generic rich-content renderer or embedding theory logic in prose data.

The future-learning map is separate metadata with a `future` status and no lesson route. It is visually honest and cannot be mistaken for a disabled current lesson.

## 7. Workbench state and data flow

The page owns one `useReducer` workbench state:

```text
URL lesson selection ──→ lesson defaults ──→ active theory target
user control changes ──────────────────────→ active theory target
active theory target ──→ structure labels + piano highlights + playback plan
play action ───────────→ AudioEngine
navigation/stop/unmount/visibility change ─→ AudioEngine.stopAll()
```

Source state includes the active lesson, tonic, scale kind, interval/triad/progression selection, inversion, playback mode, free-lab note selection, and audio status. Highlighted notes, chord labels, frequencies, and playback plans are derived and are not stored separately.

Feature state is memory-only. The existing app-level locale preference remains the only relevant local-storage behavior and is not music-theory learning data.

## 8. Playback plan and Web Audio adapter

`domain/playback.ts` creates a pure, testable plan:

```ts
type PlannedNote = {
  midi: MidiNote
  startsAtSeconds: number
  durationSeconds: number
  velocity: number
  role?: 'root' | 'tonic' | 'member'
}
```

Plans cover single notes, simultaneous/harmonic notes, melodic intervals, block chords, ascending/descending arpeggios, and chord progressions. The audio adapter receives a plan for complete lesson examples and exposes a separate `noteOn(midi, velocity?)` / `noteOff(midi)` seam for real-time piano input. Starting a new top-level plan replaces earlier plan and live playback; live note-on calls do not cancel other live voices.

`AudioEngine` lazily creates an `AudioContext` on a user gesture. Each voice uses multi-harmonic synthesis, a short procedural hammer transient, pitch-aware filtering, a piano-like decay/release, restrained room convolution, and output compression. Live voices are tracked independently by MIDI note with bounded polyphony and oldest-voice stealing. The engine tracks active nodes, cancels prior work before a new top-level playback request, ramps gain down to avoid clicks, and exposes `idle | ready | playing | unavailable` status. No remote samples are fetched.

The engine is stopped on explicit stop, lesson navigation, `visibilitychange` to hidden, and component cleanup. Failure to create/resume the context becomes a localized non-blocking state; visual targets remain fully functional.

## 9. Piano interaction

The default desktop piano spans C3–C5 inclusive. Pointer-down/key-down starts an independently sustained note and pointer-up/key-up releases only that note, so mouse/touch and computer-key input can form chords. Computer-key mappings cover a practical chromatic range and are shown through an optional label toggle; keyboard event handling ignores editable controls and repeated keydown events where appropriate. Blur, hidden-document, octave changes, and unmount release all held sources so missed key-up events cannot leave stuck notes.

White and black keys are real buttons with accessible note names. Active keys expose role markers such as `R`/root, `T`/tonic, degree numbers, or note names. Playback animation is secondary to the stable selected target and respects reduced motion.

On narrow screens the piano shows a smaller usable octave window with explicit octave-shift controls instead of causing horizontal page overflow. The semantic note range remains available through those controls.

## 10. Accessibility and responsive behavior

- Course navigation uses semantic navigation and lists; the mobile tree is a focus-managed dialog/sheet with Escape close and focus return.
- Audio status and playback errors use polite live regions without announcing every animated key.
- All controls have visible labels or accessible names; icon-only controls are avoided unless an icon has a clear label.
- Selected lesson, selected chord, and active notes use shape/text plus color.
- Desktop target: approximately 1440 px and above for the full four-region composition.
- Tablet: collapse the right inspector below/alongside the lesson while keeping the chapter rail.
- Mobile: one reading column, chapter-tree sheet, compact piano dock, minimum 44 px primary touch targets.
- Motion is limited to drawer/piano-dock transitions and note-state feedback and is removed or shortened under `prefers-reduced-motion`.

## 11. Internationalization

All course labels, prose, playback labels, error states, accessible names, and future-map descriptions live in the typed shared dictionaries. Music symbols and data values remain data. English and Chinese may use different prose length but must render the same lesson structure and interactions.

Document title changes with the route through the i18n provider or a small route-aware app-title effect. Translation parity tests remain authoritative.

## 12. Testing strategy

- Pure domain tests: pitch/frequency, spelling, intervals, scales, triad qualities/inversions, diatonic harmony, progression resolution, close voicing, playback plans.
- Route tests: valid direct route, lab route, invalid route, browser-history selection.
- Homepage and application-route tests: `/`, `/llm-api-tester`, `/music-theory`, exact real-tool entries, semantic links, localized copy, and absence of router-owned visual chrome.
- Component behavior tests: chapter-tree direct access, chord selection to piano markers, key controls, stop behavior, audio-unavailable fallback, mobile navigation semantics.
- Audio adapter tests use a small fake `AudioContext` boundary; they do not assert browser sound quality.
- Existing and new i18n parity tests cover every added key.
- Production build plus bounded visual QA at one desktop and one mobile viewport validates the approved comp, overflow, focus visibility, and piano usability.

## 13. Trade-offs and rollback

- `react-router-dom` adds one dependency but avoids a fragile custom History API layer now that the app has multiple addressable features. It can be rolled back independently if the application shell later adopts a different router.
- Synthesized audio is less realistic than a sample piano but is smaller, offline, deterministic, and avoids licensing/network risk. A future sampled-instrument adapter can implement the same playback-plan boundary.
- The lesson-kind union favors explicit, crafted interactions over a generic course CMS. This is appropriate because content is bundled and not remotely authored.
- The approved desktop comp is dense. Responsive collapse is a deliberate structural adaptation, not a pixel-for-pixel shrink.
- The homepage and music-theory feature are isolated under their own routes and directories. Rollback removes those routes, the router dependency, translations, and feature directories without database or migration work; restoring the tester at `/` remains a small route-only fallback.
