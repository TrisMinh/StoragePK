# Backend - Middleware

## Purpose

Define cross-cutting request middleware, guards, interceptors, and filters.

## Scope

This document covers authentication, authorization, request IDs, validation, rate limits, CSRF, logging, error mapping, and security headers.

## Responsibilities

- Apply consistent behavior across endpoints.
- Keep controllers focused on endpoint intent.
- Enforce security controls before service execution.

## Assumptions

- API framework supports middleware, guards, interceptors, and exception filters.
- Every request receives an ID.
- Mutating browser requests use CSRF protection when cookie-authenticated.

## Dependencies

- [../api/error-handling.md](../api/error-handling.md)
- [../api/rate-limit.md](../api/rate-limit.md)
- [../auth/authorization.md](../auth/authorization.md)

## Detailed Explanation

Middleware stack order:

1. Request ID and tracing context.
2. Security headers.
3. Body size limit by endpoint class.
4. Authentication parsing.
5. CSRF validation for cookie-authenticated writes.
6. Rate limit guard.
7. Authorization guard.
8. Request validation.
9. Controller and service execution.
10. Response logging and error mapping.

Required middleware:

| Middleware | Purpose |
| --- | --- |
| Request ID | Correlate logs, jobs, provider calls. |
| Auth Guard | Validate tokens and sessions. |
| Workspace Guard | Ensure actor has workspace access. |
| Permission Guard | Enforce action permission. |
| Rate Limit Guard | Apply endpoint limits. |
| Validation Pipe | Enforce DTO schemas. |
| Error Filter | Map exceptions to standard errors. |
| Audit Interceptor | Attach audit context for writes. |

## Edge Cases

- File upload endpoints need streaming validation without loading full body into memory.
- Health endpoints may bypass auth but must not expose sensitive internals.
- WebSocket authentication must reuse token/session validation.
- Admin routes require stricter permission checks and audit.

## Future Considerations

- Add WAF integration.
- Add request signing for internal service calls.
- Add tenant isolation middleware for enterprise deployments.

