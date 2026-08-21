# LLM API capability tester

## Goal

Build the first Flight application: a web UI for configuring LLM providers and models, then running single-model or comparative capability tests from the Go backend.

The tool should make protocol support and runtime behavior visible without requiring the user to hand-write HTTP requests for each provider.

## Confirmed scope

- A provider has a name, description, base URL and token.
- A provider can have multiple models.
- A model has a model name, an API interface type and an optional per-model test concurrency limit.
- The first supported interface types are OpenAI Chat Completions, OpenAI Responses and Anthropic Messages.
- Tests can target one model or multiple models together.
- Tests cover tool use, reasoning, streaming, tool choice and structured output, with room for more capability checks.
- The backend originates outbound model requests.
- The UI displays first-token latency, token throughput and related request metrics.
- The feature uses the application's shared SQLite database instance; it does not open a separate database connection pool.
- Provider/model configuration and any required test history are persistent application data; the existing Flight SQLite/data-root rules apply.

## Requirements

### Provider and model configuration

- Create, edit, delete and list providers.
- Create, edit, delete and list models under a provider.
- Allow an owner to configure each model's maximum concurrent test requests; omit means default 4.
- Validate required fields and URL shape before persistence.
- Public pages and test flows remain viewable without login.
- An owner session may load and mutate persisted providers and models.
- The first release is single-user. Owner login uses an instance-level `FLIGHT_ADMIN_PASSWORD`; successful login establishes an HttpOnly, SameSite session Cookie signed or encrypted with `FLIGHT_MASTER_KEY`. There is no user table or multi-user permission model.
- A visitor may create temporary providers and models in frontend memory and use them for tests, but those records disappear on refresh and are never persisted by the backend.
- The backend must distinguish persisted-resource operations from ephemeral test requests. A guest test request may carry provider/model configuration to the backend for one request, but it must not create or update SQLite records.
- Do not use route hiding as the privacy model. The page remains public; persistence reads and writes are scoped to the owner session at the data/API seam so a guest cannot accidentally access or mutate owner data.
- Never return the full token to the browser after initial save; display a masked representation and provide an explicit replace action.
- Encrypt provider tokens at rest using a key supplied through the `FLIGHT_MASTER_KEY` environment variable. The key is deployment configuration, not SQLite data.

### Capability testing

- Select one or more configured models and one or more capability checks.
- Each capability has two layers: a code-owned test type and a source-controlled default test-content configuration. Default content is selected by capability type and interface type.
- The test type is hardcoded implementation code that constructs the request, observes the protocol behavior and normalizes the result. Examples include tool use, reasoning, stream, tool choice and structured output.
- The test-content configuration contains the prompt, tool schema, JSON schema and other fixture values used by that test type. The first release uses source-controlled defaults, does not expose an editor and does not accept user-defined test content.
- Each interface adapter owns the support behavior for capability/interface combinations. Unsupported combinations are returned by the adapter as `unsupported` without sending a model request; the main orchestration flow does not branch on interface type.
- Execute outbound requests through the Go backend using the selected interface adapter.
- Report per-test status, normalized response/error, request duration and token metrics where the provider reports enough usage data.
- Measure first-token latency from request start to the first valid streamed content event when streaming is available. For non-streaming responses, record total duration and mark first-token latency unavailable.
- Display token throughput only when reliable output token usage and a valid duration are available; otherwise show the metric as unavailable rather than estimating it.
- Support streaming tests without buffering the entire response before showing progress.
- Keep provider-specific request/response details available for debugging while presenting normalized capability results.
- For each persisted model and each capability, persist the latest complete result, including request/response details, status, timestamps, errors and measurable metrics.
- A test run updates only the capabilities selected for that run. Untested capabilities retain their previous result and are never reset to an empty or failed state.
- Persisted models show `never_run`, `passed`, `failed` or `unsupported` per capability, with the last-run timestamp. Temporary visitor models keep equivalent results only in the current browser session.

### Safety and operation

- Do not expose provider tokens in API responses, logs, browser storage or error messages.
- Apply request timeouts and cancellation for every test run.
- Each model has an optional maximum test concurrency setting. If absent, the default is 4. Concurrent requests for different models do not consume one another's limits.
- Clearly distinguish “unsupported”, “failed”, “passed” and “not run”.
- Guest test input is treated as ephemeral request data and is not written to SQLite, test history or durable files.
- Guest outbound tests allow only public HTTPS endpoints and enforce SSRF protections after DNS resolution, redirect validation, timeouts and response-size limits.
- Owner outbound tests are allowed to target arbitrary URLs, including HTTP, localhost and private network addresses. Owner requests still enforce cancellation, timeouts and response-size limits.

## Acceptance Criteria

- [ ] A user can persist a provider and attach multiple models with one of the three supported interface types.
- [ ] A visitor can open the page and run a test with in-memory provider/model configuration without logging in.
- [ ] A visitor's temporary configuration disappears after refresh and never appears in persisted-resource responses.
- [ ] An owner can log in with the configured instance password without changing public page visibility; the resulting session grants persisted-resource reads and writes.
- [ ] An owner session can load, edit and remove persisted providers/models while the same page remains publicly viewable.
- [ ] A user can edit or remove configuration without seeing raw stored tokens.
- [ ] A user can run a capability test against one model and see normalized status, output/error and timing.
- [ ] A user can run the same capability test against multiple models and compare results side by side.
- [ ] Each persisted model retains the latest complete result independently for every capability.
- [ ] Running a subset of capabilities updates only that subset and leaves all other capability results unchanged.
- [ ] A capability result exposes enough stored request/response and metric detail to diagnose the test without exposing the provider Token.
- [ ] Streaming tests show incremental progress and finish with a final normalized result.
- [ ] Tool use, reasoning, stream, tool choice and structured output each have an explicit test definition and result state.
- [ ] An adapter returns `unsupported` without an outbound request for capabilities it cannot perform, distinct from a request that failed at runtime.
- [ ] Each test type uses a source-controlled default content configuration; the UI exposes no custom prompt/schema/tool editor in the first release.
- [ ] First-token latency and token throughput are shown when measurable, with unavailable metrics labeled rather than fabricated.
- [ ] Backend requests honor timeout/cancellation and never log or return provider tokens.
- [ ] A missing or invalid `FLIGHT_MASTER_KEY` prevents unsafe token reads/writes with a clear startup or configuration error.
- [ ] A model's test concurrency limit is persisted with that model, defaults to 4 when absent, and is enforced independently for each model.
- [ ] Provider-specific protocol code is isolated behind interface adapters and does not leak into the main orchestration flow or shared UI components.
- [ ] Configuration and durable test records live under the existing SQLite data root.
- [ ] Persistent reads/writes and ephemeral guest tests are represented as separate backend operations with separate tests.
- [ ] Guest outbound requests enforce public HTTPS and SSRF protections, including redirects, DNS resolution, timeouts and response-size limits.
- [ ] Owner outbound requests can target arbitrary URLs while still honoring cancellation, timeouts and response-size limits.

## Out of scope for the first release

- Automatic discovery of provider capabilities without sending a real test request.
- Every vendor-specific API, image/audio/multimodal test, batch evaluation suite or long-running benchmark scheduler.
- Multi-user accounts, team sharing, billing and secret-management integrations unless the security decision requires them.
- Claims that a failed request proves a capability is categorically unsupported; results are tied to the selected request preset and model configuration.

## Notes

The capability matrix should be extensible: adding a new check or provider adapter must not require rewriting the comparison UI. Keep `prd.md` focused on requirements, constraints and acceptance criteria; technical boundaries belong in `design.md`.
