# Hook Guidelines

> Hooks package stateful React behavior; pure logic remains in ordinary functions.

## Custom Hook Patterns

Create a custom hook only when stateful behavior or subscription logic is reused. A hook should have one responsibility, stable inputs and a documented return shape. Keep feature hooks in the feature directory; promote to shared only after real cross-feature reuse.

## Data Fetching

Use `fetch` through a feature-owned API client. Keep loading, success and error states explicit. Use TanStack Query only once server state needs caching, invalidation or refetch coordination; do not add a global data layer for one request.

## Naming Conventions

All custom hooks start with `use` and use camelCase (`useSalaryForm`). Never call hooks conditionally, inside loops or from ordinary utility functions. Prefer `useMemo`/`useCallback` only when a measured identity or computation problem exists.

## Common Mistakes

Do not put pure salary/data-analysis math in a hook, suppress exhaustive-deps without an explanation, or return a mutable object whose identity changes unnecessarily.
