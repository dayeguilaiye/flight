# Implementation Plan

1. Keep the architecture and executable conventions in `docs/architecture.md` and `.trellis/spec/`.
2. When the first feature is implemented, create the minimal `frontend/`, `cmd/flight/` and `internal/` skeleton; do not create empty layers.
3. Add a single repeatable build script that runs the frontend build before `go build` and fails when embedded assets are missing.
4. Add a configurable `FLIGHT_DATA_DIR` resolver, create the runtime data root at startup, and open SQLite at `<FLIGHT_DATA_DIR>/flight.sqlite3`.
5. Add formatter, lint, typecheck and test commands to the frontend package; use `gofmt`, `go vet ./...` and `go test ./...` for Go.
6. Capture confirmed product facts in root `PRODUCT.md` without mixing in visual implementation decisions.
7. Define the shared frontend visual language and surface modes in `.trellis/spec/frontend/visual-design.md` and `.trellis/spec/frontend/surface-modes.md`.
8. Revisit these specs after the first feature and replace provisional examples with real file references.

Validation for this bootstrap task is documentation-focused: check that every spec index points to a non-placeholder guide, architecture terminology is consistent, and the repository remains free of generated build output.
