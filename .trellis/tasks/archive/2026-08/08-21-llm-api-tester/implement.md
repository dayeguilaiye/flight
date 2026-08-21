# Implementation Plan

## Ordered work

1. Scaffold the frontend and Go feature slice without creating unrelated shared abstractions.
2. Add runtime configuration for `FLIGHT_ADMIN_PASSWORD`, `FLIGHT_MASTER_KEY`, request limits and the data root. Validate required secrets at startup.
3. Implement authenticated secret storage using an authenticated encryption primitive and add the owner session cookie flow.
4. Add the shared SQLite instance/migration coordinator, feature repository interfaces and provider/model CRUD, including per-model nullable concurrency with default 4.
5. Define the shared test adapter interface, interface-specific adapters, adapter-owned unsupported results and source-controlled default test content for the first five capabilities.
6. Implement the model-scoped scheduler, cancellation, bounded request bodies, metric collection and sparse result upserts.
7. Implement the public/owner test-run endpoint and SSE progress events, including the guest URL safety policy and owner arbitrary-URL policy.
8. Build the React operate surface: public ephemeral workspace, owner workspace, configuration forms, test matrix, comparison results and diagnostic detail.
9. Add focused tests for encryption, auth scope, guest non-persistence, SSRF policy, support-matrix skipping, protocol adapters, concurrency isolation and partial-result updates.
10. Run full checks, manually verify guest and owner flows, then update the relevant Trellis specs with concrete examples.

## Validation commands

```bash
gofmt -w .
go test ./...
go vet ./...
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
```

The release check must also build the frontend before `go build` and verify the embedded asset directory is populated.

## High-risk areas

- Token encryption and `FLIGHT_MASTER_KEY` validation.
- Keeping public ephemeral requests separate from owner persisted-resource requests.
- SSRF protections for guest URLs while preserving arbitrary owner URLs.
- Streaming event parsing and first-token timing across three protocols.
- Sparse upserts that must not clear unselected capability results.
- Per-model semaphores that must not accidentally become a global pool.
- Keeping interface-specific request branching inside adapters rather than the main orchestration service.

## Review gates

- Do not start implementation until the user approves this design and the resolved PRD.
- Do not add a custom test editor, test-history table or multi-user auth without a new scope decision.
- Do not report token throughput when usage data is unavailable.
- Do not persist guest targets or their results.
