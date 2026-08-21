# Directory Structure

> Frontend code is organized by feature, with a deliberately small shared layer.

---

## Overview

<!--
Document your project's frontend directory structure here.

Questions to answer:
- Where do components live?
- How are features/modules organized?
- Where are shared utilities?
- How are assets organized?
-->

`frontend/src/app` owns the application shell and routing. `frontend/src/features/<slug>` owns one independent tool. `frontend/src/shared` contains stable primitives used by at least two features; it is not a place to hide feature-specific code.

---

## Directory Layout

```text
frontend/
├── package.json
├── vite.config.ts
├── public/
└── src/
    ├── app/                  # main.tsx, router, shell, providers
    ├── features/<feature>/   # pages, components, domain, api, hooks, tests
    ├── shared/ui/            # accessible primitives and layout
    ├── shared/lib/           # framework-neutral utilities
    ├── shared/styles/        # Tailwind entry and tokens
    └── shared/types/         # only genuinely cross-feature types
```

---

## Module Organization

<!-- How should new features be organized? -->

New screens start in a feature directory. Keep page composition in `pages/`, reusable feature UI in `components/`, pure rules in `domain/`, server calls in `api/`, and stateful reuse in `hooks/`. Do not import from another feature's internals.

---

## Naming Conventions

<!-- File and folder naming rules -->

React components use `PascalCase.tsx`; hooks use `useThing.ts`; framework-neutral modules use `camelCase.ts`; tests use `*.test.ts(x)` or live in `__tests__/`. URL slugs are kebab-case. Prefer named exports for modules and one primary component per file.

---

## Examples

<!-- Link to well-organized modules as examples -->

See `docs/architecture.md` for the salary feature example. A frontend-only feature must not create an empty backend package merely to mirror directories.
