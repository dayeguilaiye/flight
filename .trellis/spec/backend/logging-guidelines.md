# Logging Guidelines

> Use structured, request-correlated logs with the Go standard `log/slog` package.

---

## Overview

<!--
Document your project's logging conventions here.

Questions to answer:
- What logging library do you use?
- What are the log levels and when to use each?
- What should be logged?
- What should NOT be logged (PII, secrets)?
-->

Create one process logger in the composition root and inject it where a module needs logging. Libraries and features must not configure global log output.

---

## Log Levels

<!-- When to use each level: debug, info, warn, error -->

`DEBUG` is for local diagnostics, `INFO` for lifecycle and meaningful user operations, `WARN` for recoverable degradation, and `ERROR` for failed operations requiring attention. Do not log expected validation failures at error level.

---

## Structured Logging

<!-- Log format, required fields -->

Emit JSON in production and human-readable text locally. Include `request_id`, feature, operation and duration where relevant. Prefer typed attributes over interpolated strings; use `context.Context` to carry request correlation.

---

## What to Log

<!-- Important events to log -->

Log server start/stop, migration results, unexpected errors, slow operations and important external adapter failures. Add enough identifiers to investigate without logging payloads wholesale.

---

## What NOT to Log

<!-- Sensitive data, PII, secrets -->

Never log passwords, tokens, cookies, authorization headers, full personal data or raw request bodies by default. Redact identifiers and financial values when they are not needed to diagnose the operation.
