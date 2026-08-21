# LLM API Capability Tester Design

## 1. Scope and surface mode

This feature is an `operate` surface. Its primary job is to configure model endpoints and run repeatable capability checks. The page is public, but the data scope is split into an owner workspace and an ephemeral visitor workspace.

The feature remains a vertical slice. Provider/model persistence, protocol adapters, capability runners, scheduling and test-result storage belong to `internal/features/llm_api_tester`; generic HTTP response helpers, logging, encryption primitives, runtime configuration and the shared SQLite instance remain in their existing platform seams.

## 2. Module layout

```text
internal/features/llm_api_tester/
├── domain.go                 # provider, model, capability and result types
├── service.go                # owner CRUD and test orchestration use cases
├── handler.go                # JSON/SSE transport adapter
├── repository.go             # persistence interface
├── sqlite_repository.go      # SQLite implementation using injected *sql.DB
├── migrations/
│   └── 0001_llm_api_tester.sql
├── protocol/
│   ├── adapter.go             # interface-type adapter contract
│   ├── openai_chat.go
│   ├── openai_responses.go
│   └── anthropic_messages.go
├── capability/
│   ├── definition.go          # code-owned capability request/result types
│   ├── tool_use.go
│   ├── reasoning.go
│   ├── stream.go
│   ├── tool_choice.go
│   └── structured_output.go
└── *_test.go

frontend/src/features/llm-api-tester/
├── pages/LlmApiTesterPage.tsx
├── components/providers/
├── components/models/
├── components/test-matrix/
├── components/results/
├── api/client.ts
├── domain/
├── hooks/
├── state/
├── types.ts
└── __tests__/
```

The feature must not import another feature's implementation. The shared UI layer provides controls and layout primitives, not provider-specific behavior.

## 3. Persistence model

The platform/application composition layer opens one shared `*sql.DB` at `<FLIGHT_DATA_DIR>/flight.sqlite3`. It configures SQLite connection behavior, lifecycle and pool settings once, then injects the handle into this feature's repository. The feature owns these tables:

```text
providers
  id, name, description, base_url
  token_ciphertext, token_nonce
  created_at, updated_at

models
  id, provider_id, name, interface_type
  max_concurrency nullable
  created_at, updated_at

model_capability_results
  model_id, capability_type
  status, request_json, response_json, error_json
  started_at, completed_at, duration_ms, ttft_ms nullable
  input_tokens nullable, output_tokens nullable, output_tokens_per_second nullable
  updated_at
  PRIMARY KEY (model_id, capability_type)
```

There is no run-history table. A result row is the latest result for one model and one capability. An upsert may only touch rows for capabilities selected by the current run; it must not delete or reset rows for capabilities that were not selected.

Provider tokens are encrypted at rest with an authenticated encryption primitive. The implementation must require a valid `FLIGHT_MASTER_KEY` before decrypting or writing tokens. The key is deployment configuration and never enters SQLite. Stored request/response JSON is complete enough for diagnosis but must redact authorization headers, tokens and equivalent secrets before persistence.

`max_concurrency` is per model. `NULL` means 4. The default is applied in the domain/service layer so existing rows and new rows have the same behavior.

Visitor providers/models and visitor results never reach these tables. They exist only in the browser state and the lifetime of the test request.

## 4. Access and session model

The page, capability matrix and test UI are public. Persistence is not hidden behind route visibility:

- `POST /api/v1/auth/login` checks `FLIGHT_ADMIN_PASSWORD` and issues an HttpOnly, SameSite owner session cookie.
- The session is signed or encrypted with `FLIGHT_MASTER_KEY`; there is no user table.
- Owner CRUD endpoints require the owner session.
- A persisted-model test request requires the owner session because the server must load and decrypt its provider token.
- An ephemeral test request is public and carries a provider/model configuration for that request only.
- A guest request cannot name a persisted provider/model ID or mutate any durable resource.

Guest and owner state are separate frontend workspaces. Logging in reveals the owner workspace; it must not silently persist or merge visitor drafts. Logging out returns to the public workspace without deleting the visitor's in-memory draft until the page is refreshed or the user discards it.

## 5. HTTP contracts

The exact JSON DTOs should be implemented in the feature handler and frontend API client, with camelCase fields. The initial contract is:

```text
POST   /api/v1/auth/login                          public login
POST   /api/v1/auth/logout                         owner session clear
GET    /api/v1/auth/session                        public session status

GET    /api/v1/llm-api-tester/providers             owner only
POST   /api/v1/llm-api-tester/providers             owner only
PATCH  /api/v1/llm-api-tester/providers/{id}        owner only
DELETE /api/v1/llm-api-tester/providers/{id}        owner only
POST   /api/v1/llm-api-tester/providers/{id}/models owner only
PATCH  /api/v1/llm-api-tester/models/{id}           owner only
DELETE /api/v1/llm-api-tester/models/{id}           owner only

POST   /api/v1/llm-api-tester/test-runs             public SSE or JSON
```

The test-run request contains either persisted model references or ephemeral targets. An ephemeral target includes base URL, token, model name and interface type; the response never echoes the token. The handler must reject a request that mixes an unauthorized persisted ID with otherwise valid ephemeral targets.

The frontend always presents the source-controlled capability list. There is no authoritative public preflight/support-matrix endpoint: adapter execution is the source of truth for whether a capability is supported, and an unsupported capability is returned as a structured result without an outbound request.

For streaming progress, the endpoint emits typed events such as:

```text
test_started   { modelRef, capability }
test_progress  { modelRef, capability, delta? }
test_skipped   { modelRef, capability, status: "unsupported", reason }
test_result    { modelRef, capability, normalizedResult }
test_complete  { summary }
```

The final `test_result` is the same normalized shape written to `model_capability_results` for persisted models. A non-streaming client may request a single JSON response; the backend still uses the same orchestration path.

## 6. Capability and protocol seams

Every protocol adapter implements one shared test interface. The adapter owns translation to OpenAI Chat Completions, OpenAI Responses or Anthropic Messages, request helpers, streaming parsing and capability support behavior. The main orchestration flow never branches on interface type.

```go
type TestAdapter interface {
    InterfaceType() InterfaceType
    RunCapability(context.Context, CapabilityRequest, EventSink) CapabilityResult
}
```

The concrete signatures may be refined during implementation, but the seam must preserve these responsibilities:

- The main orchestration service selects an adapter by the model's interface type and invokes the same `RunCapability` method for every capability.
- The adapter decides endpoint paths, headers, request envelopes, default fixture selection, streaming event parsing and provider usage extraction.
- If the adapter cannot perform a capability, it returns a structured `CapabilityResult` with `status: unsupported` and a typed reason without making an outbound request.
- Runtime rejection or malformed output after a request is sent is `failed`, not `unsupported`.
- Adding a new capability extends adapter internals and default fixture definitions without adding interface-type branches to the orchestration service.

Default test content is source-controlled and selected by `(capability kind, interface type)`. There is no configuration editor or custom test payload in the first release.

## 7. Test execution and concurrency

The service expands a request into model/capability jobs and schedules them through a semaphore keyed by model identity. Each persisted model has its own semaphore and limit; an ephemeral model carries the same optional limit in memory and defaults to 4. The adapter returns `unsupported` for a capability without making a request. Ephemeral identities are request-scoped and are never persisted.

Different model semaphores are independent. A slow or rate-limited provider must not consume another model's slots. Every job has context cancellation, connection timeout, total deadline and bounded response size. A job emits progress, computes metrics and then atomically upserts only its own `(model_id, capability_type)` result row.

## 8. Metrics

- `duration_ms`: request start to final completion.
- `ttft_ms`: request start to first valid streamed content event; unavailable for non-streaming responses.
- `input_tokens` and `output_tokens`: only when reliable provider usage metadata exists.
- `output_tokens_per_second`: only when output tokens and a valid post-first-token duration exist.
- Other measurable fields may include response bytes, event count and finish reason.

The backend must never infer token counts from characters, bytes or event count. The UI renders missing values as unavailable and distinguishes them from zero.

## 9. URL and secret safety

Guest targets are restricted to public HTTPS endpoints after DNS resolution. Block loopback, link-local, private, reserved and metadata ranges; validate every redirect; cap request/response size; and enforce connection and total timeouts. Owner targets may use arbitrary HTTP/HTTPS, localhost and private addresses, as explicitly requested, but retain timeout, cancellation and response-size protections.

Never log tokens, authorization headers, raw guest request bodies or decrypted provider records. Redact secrets before storing diagnostic request/response JSON. Browser storage must not contain owner tokens; guest tokens may exist only in live memory long enough to send the current test.

## 10. Frontend behavior

The page uses the `operate` surface mode. It presents:

1. Public test workspace with temporary provider/model setup.
2. Owner login action that reveals persisted providers/models without changing page visibility.
3. Provider/model configuration forms with masked token handling and per-model concurrency.
4. Capability matrix with unsupported, never-run, running, passed and failed states.
5. Single-model and multi-model test selection.
6. Comparative result table plus an expandable diagnostic detail view.

The UI must not imply that an unsupported protocol capability is a model failure. For persisted models, a partial test run updates only selected result cells. For visitors, the same matrix is in-memory and resets on refresh.

## 11. Migration and rollout

The first migration creates the three feature tables and indexes `models.provider_id` and `model_capability_results.model_id`. Existing Flight installations have no feature data, so rollback is a migration/application rollback. Do not introduce a destructive migration or a global database abstraction for this feature.
