# State Management

> State stays as close as possible to the feature and the UI that owns it.

## State Categories

Use React local state (`useState`/`useReducer`) by default. Keep derived values as functions of source state. URL state belongs in router/search params when it should be shareable or restorable. Server state is kept behind the feature API boundary.

## When to Use Global State

Introduce context only for a bounded app concern such as theme or a feature-wide form. Add a global store only when multiple distant features truly share mutable client state; document ownership and reset behavior first.

## Server State

Start with an explicit request lifecycle in the feature. Adopt TanStack Query for cache/invalidation needs, not as a replacement for local form state. Never duplicate server state in a global store without a synchronization rule.

## Common Mistakes

Avoid prop drilling by prematurely globalizing state, storing derived values that can go stale, and coupling unrelated features through a singleton store.
