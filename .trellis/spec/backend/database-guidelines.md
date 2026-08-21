# Database Guidelines

> Persistence is opt-in and owned by the feature that needs it.

---

## Overview

<!--
Document your project's database conventions here.

Questions to answer:
- What ORM/query library do you use?
- How are migrations managed?
- What are the naming conventions for tables/columns?
- How do you handle transactions?
-->

SQLite is the project's database. The application opens one shared `*sql.DB` instance in the platform/application composition layer and injects it into feature repositories. A feature may add tables only when it has a persistence requirement. Use the standard `database/sql` package behind a feature-owned repository interface; an ORM is not allowed as the default. Keep SQL and row mapping inside the concrete repository adapter; services consume domain values, not `sql.Row` or database structs.

The runtime database path is always `<FLIGHT_DATA_DIR>/flight.sqlite3`. `FLIGHT_DATA_DIR` defaults to `./data` for local development and is configurable for containers (for example `/var/lib/flight`). The same root owns all other durable application files, such as uploads or exports, in feature-specific subdirectories so one Docker/Kubernetes volume is sufficient.

---

## Query Patterns

<!-- How should queries be written? Batch operations? -->

Use parameterized queries, explicit column lists and `context.Context` on every query. Transactions belong in the service/repository operation that needs atomicity. Keep reads and writes small and observable; do not hide multiple unrelated queries in a generic data helper. The shared database adapter owns SQLite connection pragmas, busy handling, pool limits and shutdown; feature code must not call `Open`, `Close`, `SetMaxOpenConns` or mutate global pragmas.

---

## Migrations

<!-- How to create and run migrations -->

Migrations are forward-only, checked into `internal/features/<feature>/migrations/` and applied by one application-level migration coordinator against the shared database instance. A migration must be safe to run once, have a monotonically ordered name such as `0001_create_runs.sql`, and be tested against a clean database. Schema changes and repository changes land together. Migration source files are bundled with the binary or image; the database file remains on the mounted data volume.

---

## Naming Conventions

<!-- Table names, column names, index names -->

Tables and columns use `snake_case`; Go fields use `PascalCase`; JSON uses `camelCase`. Use integer minor units for monetary values and UTC timestamps. Names must be feature-scoped to avoid accidental coupling.

---

## Common Mistakes

<!-- Database-related mistakes your team has made -->

Never pass a database handle through React, open one SQLite connection per feature, return database rows from handlers, concatenate user input into SQL, write the database into the image/repository, or add a shared repository before two features actually share a persistence concept.
