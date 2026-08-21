# Quality Guidelines

> Prefer boring, explicit Go code with a small interface and a deep implementation.

## Forbidden Patterns

- Global mutable state, `panic` in request paths, hidden goroutines and unchecked input.
- Stringly typed domain states and packages named `utils`, `helpers` or `common`.
- Abstractions without a real seam, a second adapter or meaningful reuse.

## Required Patterns

- Keep handlers thin, make dependencies explicit, propagate `context.Context` and validate at boundaries.
- Document exported identifiers and test through module interfaces rather than implementation details.
- Keep `/api/` routing separate from the frontend fallback.

## Testing Requirements

Every endpoint needs a handler-level test for status and JSON shape. Domain rules and pure calculations need table-driven service/domain tests. Use `gofmt`, `go vet ./...` and race-enabled tests for concurrent code. Add `golangci-lint` when CI is introduced.

## Code Review Checklist

Reviewers verify error mapping, logging/redaction, cancellation, feature isolation and focused tests for changed behavior. Before review, run `gofmt`, `go vet ./...`, `go test ./...` and the changed feature's focused tests.
