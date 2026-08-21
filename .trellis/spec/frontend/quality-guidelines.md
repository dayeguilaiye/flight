# Quality Guidelines

> Keep feature changes local, type-safe, accessible and easy to exercise in isolation.

## Forbidden Patterns

- `any`, index-based DOM manipulation, hidden network calls in shared UI and duplicated domain math.
- Giant page components, imports across feature internals and global lint suppression for a local problem.

## Required Patterns

Use formatter, linter, typecheck and test scripts from `frontend/package.json`. Keep Tailwind class composition readable and represent loading, empty and error states explicitly.

## Testing Requirements

Pure feature-domain functions get unit tests; interactive components get behavior tests; API clients get contract/error tests. Add an end-to-end test when a feature has a critical multi-step flow.

## Code Review Checklist

Run formatting, linting, typechecking and tests for every changed feature. Verify keyboard navigation, focus, responsive overflow, API boundary validation and error recovery. New shared code should have at least two real consumers.
