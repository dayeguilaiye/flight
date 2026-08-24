# Technical Design

## Scope and Surface Contract

```yaml
mode: operate
job: "Configure models and inspect LLM capability checks in one coherent language"
primary_action: "Switch language or run selected capability checks"
density: comfortable
motion: subtle
variance: low
theme: light
accent: feature-owned
required_states:
  - guest
  - authenticated
  - loading
  - success
  - error
  - results
responsive_fallback: "Header controls wrap without changing semantic order below 768px"
```

This is a cross-cutting i18n foundation plus migration of the only current surface and normalization of the existing public error contract. It does not change the existing visual world.

## Architecture

### Shared i18n boundary

Add `frontend/src/shared/i18n/` containing:

- Supported-locale schema and constants for `zh-CN` and `en`.
- Flat, namespaced translation dictionaries. The Chinese dictionary defines the key union; the English dictionary must satisfy the same complete record.
- A React provider that owns locale state, reads/writes the preference, synchronizes `<html lang>` and `document.title`, and exposes `{ locale, setLocale, t }` through a guarded hook.
- Pure locale persistence helpers so the local-storage boundary is validated and testable without rendering React.
- A stable localized-error descriptor/mapping so UI state stores error meaning rather than already-rendered prose.

The provider belongs above `App`, making locale an intentionally bounded global app concern. Features consume the shared hook and never define their own locale state.

### Translation resources

Use flat keys such as `llm.form.providerName` and `common.language.label`. Flat keys keep lookup statically typed without adding a runtime i18n dependency for two non-pluralized dictionaries. Add a library only when future requirements need plural rules, interpolation catalogs, or remote resource loading.

Technical proper nouns remain literal in both dictionaries where appropriate: Flight, LLM, API, URL, Token, JSON Schema, TTFT, OpenAI, Anthropic, provider/model values, and units such as `ms` and `tok/s`. General concepts around those nouns are translated naturally.

### Error flow

The backend owns language-neutral error semantics. Its public error object uses a stable code and may include safe `field`, scalar `params`, and `requestId` metadata. It retains an English `message` for compatibility and diagnostics, but browser UI must not rely on or normally render that prose. Secret values, stack traces, and arbitrary upstream payloads are excluded.

Ordinary HTTP errors retain the current outer `{ error: ... }` envelope. SSE `kind: "error"` events carry the same error object rather than a standalone string. Existing broad `invalid_input` cases are split only where the UI needs a distinct localized message or field recovery path; codes remain lower snake case.

The API client preserves the structured object in a typed client error instead of throwing only `message`. Feature hooks and forms store an error descriptor rather than translated prose. Rendering maps known backend and frontend error codes through the active `t` function, so changing locale also changes an already-visible error.

Unknown network, parsing, upstream, and SSE errors use localized categorized or generic fallbacks. Raw server/upstream messages are not shown as primary UI copy because their language and safety are not controlled by the frontend. Diagnostics preserve code/request ID for logs and future owner-only technical details.

### Language switch

Add a shared `LanguageSwitcher` control rendered as a compact two-option group in the upper-right header controls. Each option is a native button with pressed state, visible focus, and localized group and option labels (`中文` / `英文` in Chinese; `Chinese` / `English` in English). The group can wrap with the existing workspace/auth controls on narrow screens.

## Data Flow

1. Provider initializes from a validated saved preference; missing/invalid/unavailable storage resolves to `zh-CN`.
2. A user activates `中文` or `EN`.
3. Provider updates locale, persists it when storage is available, updates document metadata, and rerenders consumers.
4. Pages resolve all static and error copy from the active dictionary; dynamic user/server identifiers remain unchanged.

## Compatibility and Failure Handling

- Access to `localStorage` is guarded so privacy/security restrictions do not prevent rendering or switching for the current session.
- Invalid saved values fall back to `zh-CN`.
- No route, database, or persisted feature data changes. The error envelope is compatibly extended and SSE error payloads are normalized.
- Existing user input and tester state remain mounted when language changes.
- The layout uses content-driven padding and wrapping rather than fixed text widths.

## Test Strategy

- Unit-test first-visit default, valid restoration, invalid-value fallback, and safe storage failure.
- Unit-test dictionary parity/type coverage and representative Chinese/English strings plus error-code localization.
- Contract-test representative JSON and SSE error responses, including stable codes and absence of unsafe detail.
- Run frontend typecheck, Vitest suite, and production build.
- Run the Go test suite.
- Manually inspect both locales at desktop and narrow width, including guest, login, form, error, and result states where locally reproducible.

## Rollback

Frontend i18n can be rolled back by removing the provider/shared resources and restoring literal page copy; the stored locale key is harmless if left behind. Backend error-envelope additions are backward compatible. SSE consumers must be rolled back with the server if its structured error event shape is reverted.
