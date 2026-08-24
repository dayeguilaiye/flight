# Quality Guidelines

> Keep feature changes local, type-safe, accessible and easy to exercise in isolation.

## Forbidden Patterns

- `any`, index-based DOM manipulation, hidden network calls in shared UI and duplicated domain math.
- Giant page components, imports across feature internals and global lint suppression for a local problem.

## Required Patterns

Use formatter, linter, typecheck and test scripts from `frontend/package.json`. Keep Tailwind class composition readable and represent loading, empty and error states explicitly.

## Internationalization

All user-facing copy belongs in the shared typed translation resources and must be supplied for both `zh-CN` and `en`. Simplified Chinese is the first-visit default; an explicit user choice is stored locally by the app-level i18n provider. New features consume that provider instead of creating feature-owned locale state.

One rendered surface uses one language at a time. Chinese copy may retain established technical names and abbreviations such as LLM, API, URL, Token, JSON Schema and TTFT, but should translate general product language. English copy must not contain Chinese UI prose. User-entered values, identifiers and arbitrary upstream content are displayed as data and are not translated.

Keep `document.documentElement.lang`, document titles, accessibility labels, placeholders, loading/empty/error states and responsive layouts in the same translation contract. Translation controls must be semantic, keyboard-operable and visibly focused.

Frontend state stores structured error meaning, not rendered error prose. API clients preserve stable backend error codes and safe metadata; renderers map known codes through the active locale and use a localized generic fallback for unknown, network, parsing or upstream errors. Never use a backend English `message` as primary browser UI copy.

```tsx
// Wrong: copy is frozen in the language/error prose available at catch time.
setError(cause instanceof Error ? cause.message : 'Request failed')

// Correct: meaning is stored; copy is resolved from the current locale at render time.
setError(toDisplayError(cause, 'request_failed'))
return error ? translateDisplayError(error, t) : null
```

## Testing Requirements

Pure feature-domain functions get unit tests; interactive components get behavior tests; API clients get contract/error tests. Add an end-to-end test when a feature has a critical multi-step flow.

Locale-related changes test first-visit defaulting, saved-preference restoration, invalid-storage fallback, dictionary parity and representative error-code presentation. Review both supported languages at desktop and narrow widths.

## Code Review Checklist

Run formatting, linting, typechecking and tests for every changed feature. Verify keyboard navigation, focus, responsive overflow, API boundary validation and error recovery. New shared code should have at least two real consumers.
