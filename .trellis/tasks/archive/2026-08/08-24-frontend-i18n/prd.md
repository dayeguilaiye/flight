# Frontend bilingual internationalization

## Goal

Establish project-wide Chinese and English internationalization so every frontend surface presents one coherent language at a time, with an accessible language switch in the upper-right application header.

## Background

- The current frontend has one LLM API tester surface and many visible strings mix Chinese and English within the same view (`frontend/src/features/llm-api-tester/pages/LlmApiTesterPage.tsx`).
- User intent is project-wide: the mechanism and conventions must apply to the whole frontend and future features, not only the current LLM API tester.
- The current document metadata is fixed to Chinese (`frontend/index.html`), while API and client-side errors are mostly English and can surface directly in the UI.
- The backend already has a public `{ error: { code, message } }` JSON envelope, but several domain cases share broad codes and SSE errors currently carry only prose.
- The frontend currently has no i18n dependency, shared provider, or component tests.

## Requirements

### R1. Shared language foundation

- Support exactly Simplified Chinese (`zh-CN`) and English (`en`) for now.
- Keep locale state and translation lookup in the app/shared layer rather than inside a feature.
- Expose a typed, reusable translation interface suitable for all current and future frontend features.
- Do not require backend persistence for the user's language choice.

### R2. Language switch and persistence

- Place a clearly discoverable language switch in the upper-right header area.
- The control must be semantic, keyboard-operable, visibly focused, and understandable in either active language.
- Use Simplified Chinese on a user's first visit, regardless of browser language.
- Persist an explicit language choice locally and restore it on later visits.

### R3. Language purity

- Translate every user-facing string on the current frontend, including headings, labels, placeholders, buttons, state badges, capability names and notes, status values, metrics, footer copy, accessibility labels, success messages, empty states, and client/API error fallbacks.
- English mode must not contain Chinese UI copy.
- Chinese mode should use Chinese except established technical/product terms that are normally retained in Chinese technical contexts, such as Flight, LLM, API, URL, Token, JSON Schema, TTFT, OpenAI, Anthropic, and model/provider identifiers supplied by users or servers.
- Dynamic user data and upstream model/API content are not translated.
- Do not display raw backend error prose when doing so would break language consistency; translate stable error codes and provide a localized fallback.

### R4. Document metadata and locale semantics

- Keep the root document `lang` attribute synchronized with the active locale.
- Localize the browser document title.

### R5. Maintainable project convention

- Organize translations so missing keys are caught by TypeScript.
- Add focused automated coverage for locale selection/persistence and representative translation behavior.
- Record the project-wide internationalization and error-presentation conventions in the frontend and backend specifications so future features follow them.

### R6. Language-neutral backend error contract

- Backend APIs express error meaning through stable machine-readable codes; frontend UI copy must not depend on backend prose.
- Public errors may include a safe field identifier, interpolation parameters, and request identifier when useful; they must not expose secrets, stack traces, or unsafe upstream payloads.
- Ordinary JSON and SSE error paths use the same structured error object shape.
- Split overly broad codes where the frontend needs a distinct recovery message or field association.
- Retain an English developer-facing `message` for compatibility and non-browser clients, but treat it as diagnostic fallback rather than localized UI copy.
- Unknown, network, parsing, and upstream-provider failures receive localized generic frontend fallbacks; arbitrary upstream prose is not primary UI copy.

## Acceptance Criteria

- [x] The upper-right header contains a Chinese/English switch that works with pointer and keyboard input and has an accessible localized name.
- [x] A first visit defaults to Simplified Chinese; selecting a language updates the entire current interface immediately without reload and survives a reload/new visit.
- [x] English mode contains no hard-coded Chinese interface copy in rendered states, including errors and authenticated/guest variants.
- [x] Chinese mode uses natural Chinese for general UI copy and retains only justified technical proper nouns/abbreviations.
- [x] `<html lang>` and the browser title reflect the active locale.
- [x] Shared locale code is app-level or shared-level and can be reused by future features without importing LLM tester internals.
- [x] Translation resources are statically type-checked, and locale-related tests pass.
- [x] JSON and SSE errors preserve a stable code through the frontend API boundary, and switching locale rerenders an already-visible error in the new language.
- [x] Known validation/authentication errors have localized messages; unknown and upstream errors use a localized safe fallback without exposing raw backend prose.
- [x] Backend contract tests cover the structured error envelope for representative JSON and SSE failures.
- [x] Frontend typecheck, test, and production build pass.
- [x] Go tests pass.
- [x] Project specs document the global rule for bilingual frontend copy and language-neutral backend errors.

## Out of Scope

- Translating user-entered provider/model names or arbitrary upstream API/model responses.
- Adding languages other than Simplified Chinese and English.
- Backend locale negotiation, translated backend messages, or storing locale in SQLite.
- Redesigning the existing visual identity beyond the header adjustment needed for the switch and translation-length resilience.
