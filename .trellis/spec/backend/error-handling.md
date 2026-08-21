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

Prefer standard errors plus small feature-owned sentinel or typed errors over a large global hierarchy. A public error needs a stable machine-readable code, a safe human message and optional structured details. Never expose SQL, filesystem paths, stack traces or secrets.

---

## Error Handling Patterns

<!-- Try-catch patterns, error propagation -->

Handle errors immediately when adding context or translating them. Avoid `panic` for request errors; reserve it for impossible programmer invariants caught during startup. Return errors from services instead of mutating an error accumulator or silently falling back.

---

## API Error Responses

<!-- Standard error response format -->

All JSON API failures use:

```json
{"error":{"code":"invalid_input","message":"The request is invalid.","details":{}}}
```

Use `400` for invalid input, `404` for an absent resource, `409` for a domain conflict, `422` for a semantically invalid operation when useful, and `500` for unexpected failures. Unexpected failures get a request ID in logs and a generic response.

---

## Common Mistakes

<!-- Error handling mistakes your team has made -->

Do not return `200` with an error payload, compare error strings, leak internal error text, or write a response and then continue executing the handler.
