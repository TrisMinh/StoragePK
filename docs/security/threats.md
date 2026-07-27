# Security - Threat Model

## Purpose

Identify major threats to StoragePK and define required controls.

## Scope

This document covers authentication, provider tokens, file upload, metadata, search, AI, queues, desktop clients, sharing, and operations.

## Responsibilities

- Make security risks explicit before implementation.
- Define mitigations for high-impact failures.
- Guide test and monitoring plans.

## Assumptions

- StoragePK handles sensitive personal and work files.
- External providers can be compromised, disconnected, throttled, or misconfigured.
- Uploaded files and document contents are untrusted input.

## Dependencies

- [credential-lifecycle.md](credential-lifecycle.md)
- [encryption.md](encryption.md)
- [secrets.md](secrets.md)
- [owasp.md](owasp.md)
- [../auth/authorization.md](../auth/authorization.md)
- [../providers/provider-threat-controls.md](../providers/provider-threat-controls.md)

## Detailed Explanation

| Threat | Impact | Controls |
| --- | --- | --- |
| Provider token theft | Attacker can access Drive or Telegram storage. | Encrypt credentials, least scopes, rotation, redaction, anomaly alerts. |
| Overbroad Drive OAuth scopes | App may fail verification or expose too much user data. | Prefer `drive.file`, disclose data use, restricted-scope review before broad access. |
| Malicious uploads | Malware or payloads attack preview/extraction. | MIME validation, antivirus scanning, sandbox extraction, safe previews. |
| Prompt injection | Document text manipulates AI assistant. | Treat document text as data, use RAG guardrails, cite sources, deny tool misuse. |
| Permission bypass | User sees unauthorized files through search or AI. | Server-side permission filtering before result/model context. |
| Queue poisoning | Bad job payload causes unsafe worker behavior. | Signed/internal job creation, schema validation, idempotency, DLQ. |
| Path traversal | Filename or folder path escapes intended structure. | Normalize names, reject control/path separators, never trust client path. |
| Ransomware-like bulk edits | Mass delete/move/rename harms library. | Rate limits, anomaly detection, confirmation, audit, restore. |
| Provider drift | External delete/rename breaks references. | Reconciliation jobs and repair center. |
| Metadata leakage | Filenames/tags reveal sensitive info. | Access control, audit export permission, optional privacy mode. |
| Desktop token theft | Local compromise steals refresh token. | OS credential storage, device revocation, short access tokens. |

## Edge Cases

- A file can be safe by extension but malicious by content; server-side sniffing and scanning are required.
- AI summaries can leak sensitive extracted text if permissions are not enforced before retrieval.
- Telegram bot/channel access can expose files to channel members outside StoragePK control.
- Provider OAuth scope changes can silently reduce capabilities; health checks must detect this.

## Future Considerations

- Add formal STRIDE threat model per feature.
- Add security review checklist for every release.
- Add workspace-level data loss prevention policies.
