# Implementation Plan

## Ordered Checklist

1. Add typed locale constants, complete translation dictionaries, validated persistence helpers, localized error descriptors, and unit tests under `frontend/src/shared/i18n/`.
2. Add the app-level `I18nProvider`/`useI18n` boundary and mount it above `App`; synchronize document language and title.
3. Add an accessible shared `LanguageSwitcher` and integrate it into the current header's upper-right control group with responsive wrapping.
4. Define the shared public backend error object, introduce granular stable codes where UI recovery differs, and make JSON/SSE failures use the same structured shape with contract tests.
5. Refactor the feature API error boundary to preserve backend codes/metadata and replace raw error prose with localized descriptors.
6. Migrate all visible LLM API tester copy, accessibility labels, placeholders, dynamic statuses, metrics, messages, and empty/error states to the shared dictionaries.
7. Search the entire frontend for remaining user-visible hard-coded Chinese/English literals and classify every retained technical literal.
8. Update frontend and backend specifications with the project-wide bilingual-copy and language-neutral error-contract conventions.
9. Run quality checks and bounded visual inspection in Chinese and English at desktop and mobile widths; fix findings in one batch and confirm once.

## Validation Commands

```bash
cd frontend && pnpm typecheck
cd frontend && pnpm test
cd frontend && pnpm build
go test ./...
```

Also run targeted literal searches across `frontend/src` and inspect `document.documentElement.lang` plus the title after both switch actions.

## Risk and Rollback Points

- `LlmApiTesterPage.tsx` currently contains nearly all UI copy in one dense component; migrate without changing form behavior or tester state transitions.
- `useLlmApiTester.ts` and `api/client.ts` currently store/display raw `Error.message`; preserve diagnosability through code/request ID while ensuring controlled localized presentation.
- `frontend/index.html` has static Chinese metadata; provider synchronization must not cause a visible stale-language state after mount.
- Preserve compatibility for ordinary JSON error consumers while extending the shared object; update the frontend SSE consumer atomically with the server event shape.

## Review Gates

- Before activation: user reviews PRD/design/implementation scope.
- Before completion: run `trellis-check`, verify both languages visually, and confirm no unrelated worktree changes were overwritten.
