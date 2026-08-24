# Error Handling

> Errors are classified at feature seams and translated to safe HTTP responses once.

---

## Overview

<!--
Document your project's error handling conventions here.

Questions to answer:
- What error types do you define?
- How are errors propagated?
- How are errors logged?
- How are errors returned to clients?
-->

Use wrapped errors for context (`fmt.Errorf("calculate salary: %w", err)`) and sentinel/type checks with `errors.Is`/`errors.As`. Domain errors describe a stable condition; handlers decide status codes and public messages. Do not log and return the same error at every layer.

---

## Error Types

<!-- Custom error classes/types -->

Prefer standard errors plus small feature-owned sentinel or typed errors over a large global hierarchy. A public error needs a stable machine-readable code, a safe English diagnostic message and optional structured metadata. Never expose SQL, filesystem paths, stack traces, secrets or arbitrary upstream payloads.

---

## Error Handling Patterns

<!-- Try-catch patterns, error propagation -->

Handle errors immediately when adding context or translating them. Avoid `panic` for request errors; reserve it for impossible programmer invariants caught during startup. Return errors from services instead of mutating an error accumulator or silently falling back.

---

## API Error Responses

<!-- Standard error response format -->

All JSON API failures use the shared `httpapi.PublicError` envelope:

```json
{"error":{"code":"max_concurrency_invalid","message":"Max concurrency must be at least 1.","field":"maxConcurrency","params":{"min":1},"requestId":"req_abc123"}}
```

`code` is the stable product contract and uses lower snake case. Add a distinct code when the client needs a distinct recovery message or field association; do not collapse such cases into `invalid_input`. `field`, scalar `params` and `requestId` are optional and must be safe to expose. `message` remains an English fallback for diagnostics and non-browser clients, not localized browser copy.

Streaming transports use the same object. An SSE failure event has this shape:

```json
{"kind":"error","error":{"code":"test_run_failed","message":"The test run could not be completed.","requestId":"req_abc123"}}
```

Do not send a standalone prose string in an SSE `error` field. Browser clients preserve the object across their API boundary and translate `code` in the active locale. Unknown codes receive a localized generic fallback; backend messages are not rendered as primary UI copy.

Use `400` for invalid input, `404` for an absent resource, `409` for a domain conflict, `422` for a semantically invalid operation when useful, and `500` for unexpected failures. Unexpected failures get a request ID in logs and a generic response.

## Scenario: Language-neutral public errors

### 1. Scope / Trigger

Use this contract for every new or changed HTTP/SSE failure that can reach a browser or another API client. It prevents backend prose, frontend locale and transport-specific event shapes from becoming coupled.

### 2. Signatures

```go
type PublicError struct {
    Code      string         `json:"code"`
    Message   string         `json:"message"`
    Field     string         `json:"field,omitempty"`
    Params    map[string]any `json:"params,omitempty"`
    RequestID string         `json:"requestId,omitempty"`
}

func WriteError(w http.ResponseWriter, status int, code, message string)
func WritePublicError(w http.ResponseWriter, status int, publicError PublicError)
```

SSE event owners embed `*httpapi.PublicError` at `error`; they do not define a second error DTO.

### 3. Contracts

- `code`: required lower-snake-case stable identifier; frontend translation and recovery logic depend on it.
- `message`: required safe English diagnostic fallback; browser UI does not render it as primary copy.
- `field`: optional public request field name for inline recovery.
- `params`: optional safe scalar interpolation values such as `{ "min": 1 }`; never secrets or raw payloads.
- `requestId`: optional opaque correlation identifier whose server-side log entry contains internal context.
- JSON transport: `{ "error": PublicError }` with a non-2xx HTTP status.
- SSE transport: `{ "kind": "error", "error": PublicError }` inside the normal event stream.

Frontend decodes this object once at its API boundary, stores code/metadata, and translates it while rendering. Switching locale must therefore rerender an already-visible error.

### 4. Validation & Error Matrix

| Condition | HTTP | Code | Field / params |
|---|---:|---|---|
| Malformed JSON | 400 | `invalid_json` | none |
| Authentication failed | 401 | `invalid_credentials` | none |
| Owner-only operation | 401 | `owner_required` | none |
| Missing provider name | 400 | `provider_name_required` | `name` |
| Invalid provider URL | 400 | `provider_base_url_invalid` | `baseUrl` |
| Missing provider token | 400 | `provider_token_required` | `token` |
| Invalid concurrency | 400 | `max_concurrency_invalid` | `maxConcurrency`, `{ "min": 1 }` |
| Guest request exceeds limits | 400 | `guest_request_limit_exceeded` | `targets` |
| Execution fails after SSE starts | stream stays 200 | `test_run_failed` | structured SSE error event |
| Unexpected internal failure | 500 | `internal_error` | optional `requestId` only |

Add a row and matching frontend translations when a new condition needs distinct user recovery. Reuse a code only when status, recovery and safe presentation are genuinely the same.

### 5. Good / Base / Bad Cases

- Good: `max_concurrency_invalid` includes `field=maxConcurrency` and `params.min=1`; both locales explain the correction.
- Base: an unknown future code is preserved for diagnostics and shown as the active locale's generic safe fallback.
- Bad: an upstream provider returns arbitrary prose; the backend/UI expose it as the primary error. Categorize it as `request_failed` and keep raw detail out of the public contract.

### 6. Tests Required

- `httpapi` unit test: assert status, envelope, code and safe optional metadata survive JSON encoding.
- Handler contract test: assert representative domain validation maps to its specific code/field/params.
- SSE contract test: assert `kind=error` contains a `PublicError` object and does not leak the internal cause.
- Frontend API-client tests: assert JSON and SSE decode to the same typed client error and preserve code/metadata.
- Frontend localization tests: assert known codes translate in both locales, unknown codes use localized fallback, and the same stored descriptor changes copy after a locale switch.

### 7. Wrong vs Correct

#### Wrong

```go
writeSSE(w, runEvent{Kind: "error", Error: err.Error()})
```

```ts
throw new Error(payload.error.message)
```

This leaks uncontrolled language and loses stable semantics.

#### Correct

```go
publicError := httpapi.PublicError{Code: "test_run_failed", Message: "The test run could not be completed."}
writeSSE(w, runEvent{Kind: "error", Error: &publicError})
```

```ts
throw new ApiError(publicErrorSchema.parse(payload.error))
```

UI state keeps the structured error and calls the active locale translator during render.

---

## Common Mistakes

<!-- Error handling mistakes your team has made -->

Do not return `200` with an error payload, compare error strings, localize responses in handlers, leak internal/upstream error text, or write a response and then continue executing the handler.
