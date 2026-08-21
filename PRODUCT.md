# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Frontend uses pnpm, React and Tailwind CSS. The compiled frontend is embedded into a Go binary. The backend uses Go and SQLite. TypeScript and Vite are the provisional frontend implementation defaults documented by the project; the first frontend scaffold is still pending.

## Users

- Confirmed: the owner/developer uses the project to build and test personal experiments and tools.
- Working assumption: visitors may use the published tools directly, without needing to understand the implementation or the other features.

## Product Purpose

Flight is a personal collection of unrelated experiments, small utilities and interactive pages. Success means a new tool can be added quickly, remain understandable in isolation, and be deployed as part of the same small site.

## Positioning

The product is a personal lab rather than a unified SaaS product. Its distinct mechanism is that unrelated tools share a lightweight host, deployment model and visual family without sharing domain logic.

## Operating Context

Development happens locally with a pnpm frontend and a Go backend. Production is a single Go process serving embedded frontend assets and optional feature APIs. Runtime writable data, including SQLite and future durable files, lives below the configurable `FLIGHT_DATA_DIR` so Docker and Kubernetes can mount one volume.

## Capabilities and Constraints

- Features are independent vertical slices and may be frontend-only.
- A feature that needs a backend owns its API, domain rules and persistence adapter.
- SQLite is the only supported database for the initial project.
- The frontend and backend communicate through explicit JSON contracts.
- The project should remain a modular monolith; microservices and public Go packages are not part of the initial scope.
- Exact user roles, public/private access rules and the first production feature remain open decisions.

## Brand Commitments

No logo, palette, font or existing visual identity has been supplied. The owner accepts a shared or closely related design language across independent features.

## Evidence on Hand

There is no existing product UI, content library, customer proof, or production asset to preserve. Future pages must not invent testimonials, metrics, logos or product claims.

## Product Principles

1. Keep unrelated domain logic separate.
2. Start with the smallest feature shape that earns a seam.
3. Prefer useful, legible interactions over ornamental complexity.
4. Share visual language and accessible primitives without forcing identical layouts.
5. Keep deployment and runtime persistence boring and observable.

## Accessibility & Inclusion

No product-specific accessibility requirement has been provided. The frontend baseline is semantic HTML, keyboard access, visible focus, WCAG AA contrast and explicit loading, empty and error states.
