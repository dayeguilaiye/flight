# Initial Architecture Design

## Decision

Use a modular-monolith layout with independent vertical feature slices. The frontend and backend share deployment, not implementation details: a feature can be frontend-only, while a feature with server needs owns its Go handler, use case, domain rules and adapters.

## Core seams

- `cmd/flight`: composition root and dependency wiring.
- `internal/httpapi`: HTTP transport, middleware and response envelope.
- `internal/features/<feature>`: feature-owned backend interface and implementation.
- `frontend/src/app`: router/shell/registry.
- `frontend/src/features/<feature>`: feature-owned UI, domain and API client.
- `frontend/src/shared` and `internal/platform`: only stable cross-feature or technical concerns.

## Build contract

Vite writes generated assets to the Go embed package's `dist` directory. A release build runs the frontend build before `go build`; Go serves `/api/` separately and falls back to the embedded SPA entry point for frontend routes.

## Runtime data contract

All application-owned writable state lives under `FLIGHT_DATA_DIR`. The local default is `./data`; container deployments should set it to a mounted path such as `/var/lib/flight`. SQLite is always `<FLIGHT_DATA_DIR>/flight.sqlite3`, and future durable files use subdirectories below the same root. This gives Docker/Kubernetes one volume boundary for backup, migration and replacement.

## Trade-offs

This avoids premature monorepo packages, global stores and generic backend layers. The cost is some deliberate duplication of frontend DTO and Go transport types until contract generation is justified. That trade-off keeps each experiment locally understandable and allows the contract to evolve with the feature.
