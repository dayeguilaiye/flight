# Directory Structure

> Backend code is organized as independent vertical feature slices inside a modular monolith.

---

## Overview

<!--
Document your project's backend directory structure here.

Questions to answer:
- How are modules/packages organized?
- Where does business logic live?
- Where are API endpoints defined?
- How are utilities and helpers organized?
-->

The Go module uses `internal/` by default. `cmd/flight` is the only composition root; feature packages do not construct servers, read process-wide environment variables, or reach into another feature.

---

## Directory Layout

```text
cmd/flight/main.go
internal/
├── app/                  # lifecycle and dependency wiring
├── config/               # config decoding and validation
├── httpapi/              # router, middleware, response helpers
├── platform/             # logging, clock, storage adapters
│   ├── database/          # shared SQLite instance and migration coordinator
│   ├── auth/              # instance owner session primitives
│   ├── egress/            # outbound URL safety policies
│   └── secrets/           # authenticated encryption primitives
├── features/<feature>/   # handler/service/domain/repository as needed
└── web/                  # frontend embed adapter + generated dist
data/                     # runtime writable root, never Go source
```

---

## Module Organization

<!-- How should new features/modules be organized? -->

Create only the files a feature needs. Keep pure domain calculations free of HTTP, SQL and global state. Put an interface at the feature seam when an adapter varies or a test double is useful; keep the concrete adapter beside that feature. Feature repositories receive the shared database instance from the composition root and never open/close SQLite themselves. Runtime persistence does not live under `internal/` or beside the binary: all application-owned writable files go under the configured `FLIGHT_DATA_DIR` root.

---

## Naming Conventions

<!-- File and folder naming rules -->

Go package names are short, lower-case and singular where practical. Feature slugs and endpoint paths are kebab-case. `*_test.go` stays beside the implementation. Avoid `utils`, `helpers` and catch-all `common` packages; use a domain name or `platform` when ownership is clear.

---

## Examples

<!-- Link to well-organized modules as examples -->

The reference layout is shown in `docs/architecture.md`. A frontend-only feature has no Go package. A backend feature normally starts with `handler.go`, `service.go` and `domain.go`; add `repository.go` only when I/O exists. SQLite is stored at `<FLIGHT_DATA_DIR>/flight.sqlite3`; feature-owned files use `<FLIGHT_DATA_DIR>/<feature>/...`.
