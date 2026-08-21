# Flight Architecture

## 1. Design goals

Flight is a collection of unrelated experiments and tools. The architecture optimizes for:

1. Adding a feature without touching unrelated features.
2. Keeping a feature usable without a backend when it does not need one.
3. Keeping the HTTP and persistence seams small enough to replace in tests.
4. Shipping one Go binary containing the compiled frontend.
5. Keeping every application-owned writable file under one mountable data root.

The repository is intentionally a modular monolith, not a microservice system. A feature is a vertical slice; `shared` and `platform` are supporting modules, not dumping grounds.

## 2. Repository layout

```text
.
├── cmd/flight/                 # composition root; wires config, routes and server
├── internal/
│   ├── app/                    # application lifecycle and dependency wiring
│   ├── config/                 # environment/config decoding
│   ├── httpapi/                # transport concerns: middleware, response, routing
│   ├── platform/               # replaceable technical adapters (clock, logging, storage)
│   ├── features/               # independent backend vertical slices
│   │   └── <feature>/          # handler, service, domain, repository as needed
│   └── web/                    # Go embed adapter and generated static assets
├── web/                        # optional public/static metadata, not feature logic
├── frontend/
│   ├── src/app/                # router, shell, feature registry, app providers
│   ├── src/features/<feature>/ # page, UI, state, API and domain for one feature
│   ├── src/shared/             # stable cross-feature UI and utilities
│   └── public/                 # files copied as-is by Vite
├── scripts/                    # repeatable dev/build/check entry points
├── data/                        # runtime writable root; ignored by Git and mountable as one volume
├── docs/                       # human-facing architecture and decisions
├── go.mod
└── pnpm-workspace.yaml         # only if more frontend packages are added later
```

`internal/` is the default for Go code. Do not create `pkg/` until another repository must import that code. Generated frontend output is not hand-edited and should be ignored by Git except for a small placeholder required by `go:embed`.

`data/` is not source code. It is the default local runtime data root and must contain every application-owned writable artifact:

```text
data/
├── flight.sqlite3              # SQLite database when any feature needs persistence
├── uploads/                    # optional user/imported files
├── exports/                    # optional generated files
└── <feature>/                  # optional feature-specific durable state
```

The root is configurable with `FLIGHT_DATA_DIR` (default `./data` locally; production can use `/var/lib/flight`). The application creates required subdirectories at startup and fails fast if the root is not writable. Docker and Kubernetes should mount one volume at the configured root rather than mounting individual files. Application code must not write durable state beside the binary, in the repository, or in unrelated absolute paths.

## 3. Feature vertical slices

Use a stable kebab-case feature slug in URLs and a lower-case Go/TypeScript identifier in code. A feature owns its UI, domain rules, API client and tests:

```text
frontend/src/features/salary/
├── pages/SalaryPage.tsx
├── components/SalaryForm.tsx
├── domain/calculateSalary.ts
├── api/client.ts              # only when a backend is needed
├── hooks/useSalary.ts         # only when stateful reuse exists
├── types.ts
└── __tests__/

internal/features/salary/
├── handler.go                 # HTTP adapter; absent for frontend-only features
├── service.go                 # use-case orchestration
├── domain.go                  # pure rules and domain types
├── repository.go              # interface, only when persistence/external I/O exists
├── sqlite_repository.go       # concrete adapter, only when needed
└── *_test.go
```

Start with the smallest shape. Do not add a repository, global store, service layer or generic helper merely because the directory template contains one. A module earns a seam when a second adapter, a test double, or a real variation exists.

## 4. Dependency direction

```text
HTTP handler → feature service/use case → feature domain
                               └──────→ feature adapter (repository/gateway)
frontend page → feature UI/domain → feature API client
```

Feature code may depend on `httpapi`, `platform` or `shared` interfaces, but one feature must not import another feature's implementation. Cross-feature communication goes through a deliberately small app-level interface or a URL/API contract. Keep transport DTOs at the transport seam; do not expose database rows to React.

## 5. Frontend/backend boundary

- Browser API paths are `/api/v1/<feature>/<resource>`.
- JSON uses camelCase; dates and times use RFC 3339 strings; money is represented as integer minor units plus an explicit currency when precision matters.
- Successful mutations return the resource or a documented result, never an unstructured message.
- Errors use `{ "error": { "code": "stable_code", "message": "safe message", "details": {} } }`.
- Validate external input once at the boundary, then pass typed values inward. Frontend validation improves UX; Go validation remains authoritative.

For a small feature, define the request/response types next to the feature API client and Go handler. Introduce OpenAPI or generated clients only when multiple consumers or contract drift justify the cost.

## 6. Persistence and SQLite

SQLite is the default and only supported database for the initial project. Use Go's `database/sql` behind a feature-owned repository interface; do not expose the database handle or rows outside the adapter. Runtime database location is always `<FLIGHT_DATA_DIR>/flight.sqlite3`, while migration SQL remains versioned source code under the owning feature's `migrations/` directory.

Each feature may add a subdirectory under the data root for files that belong to it. The feature must document its path, creation policy and cleanup/backup semantics. A feature must not create a second data root. Schema migrations are applied explicitly during startup or an administrative command, and the process must report a clear error when the volume is unavailable.

## 7. Build and embed flow

The canonical release flow is:

```text
pnpm --dir frontend build
        ↓
frontend/dist (generated)
        ↓ copied/targeted into internal/web/dist
go build ./cmd/flight
        ↓
single binary serving embedded assets + /api/v1/*
```

The Go server serves the embedded `index.html` for known frontend routes and static assets directly; `/api/` is reserved for backend endpoints. A missing frontend build must fail the release build rather than silently shipping an empty shell.

## 8. What is deliberately deferred

- No global state library until two features need shared client state.
- No database tables until a feature has a persistence requirement; the SQLite file location is fixed by the data-root contract above.
- No ORM; use `database/sql` behind a feature-owned repository interface.
- No cross-feature design system beyond small, accessible primitives in `frontend/src/shared/ui`.
- No public Go packages or microservices.
