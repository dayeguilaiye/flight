# Type Safety

> TypeScript is strict at compile time and validates unknown data at runtime boundaries.

## Type Organization

Use strict TypeScript. Feature-local types live beside the feature; `shared/types` is reserved for stable cross-feature contracts. Prefer discriminated unions, named domain types and inferred return types for small pure functions.

## Validation

Use Zod (or a similarly explicit schema library) at API, query-string and local-storage boundaries when data is unknown. Parse once, then pass the inferred type inward. Frontend validation is for feedback; the backend remains authoritative.

## Common Patterns

Use `unknown` for untrusted values, type guards for narrowing, and branded/opaque types when mixing units such as minor currency values and percentages. Keep JSON DTO types separate from domain display types when transformation is non-trivial.

## Forbidden Patterns

Do not use `any`, broad `as` assertions, non-null assertions to silence uncertainty, or duplicate inline casts of the same response field. Fix the boundary decoder or type definition instead.
