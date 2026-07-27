# Deployment - Cloud

## Purpose

Define cloud architecture and managed service expectations for StoragePK production.

## Scope

This document covers compute, data stores, networking, secrets, staging storage, providers, backups, and scale assumptions.

## Responsibilities

- Provide a cloud-agnostic production target.
- Keep provider integrations secure.
- Support future infrastructure-as-code implementation.

## Assumptions

- Any major cloud can host the backend.
- Managed PostgreSQL and Redis are preferred.
- External provider APIs remain public integrations.

## Dependencies

- [environments.md](environments.md)
- [monitoring.md](monitoring.md)
- [../architecture/infrastructure.md](../architecture/infrastructure.md)

## Detailed Explanation

Recommended production services:

| Capability | Recommended Service Type |
| --- | --- |
| API compute | Autoscaled containers behind load balancer. |
| Worker compute | Autoscaled background workers. |
| Database | Managed PostgreSQL with PITR backups. |
| Queue/cache | Managed Redis. |
| Search | Managed OpenSearch, Meilisearch, or equivalent. |
| Staged bytes | Private object bucket with lifecycle cleanup. |
| Secrets | Cloud secret manager or KMS-backed vault. |
| Logs/metrics | Central observability platform. |
| DNS/TLS | Managed certificates. |

Networking:

- Public ingress only to web/API load balancer.
- Database, Redis, search, and staging bucket private where possible.
- Egress to Google Drive, Telegram, AI providers, and package registries controlled by policy.

## Edge Cases

- Provider APIs may be blocked or rate-limited by region; monitor provider health by environment.
- Search service can require significant memory for large embeddings.
- Staged upload bucket lifecycle policies must not delete active uploads.
- Cloud provider outage should not corrupt provider metadata.

## Future Considerations

- Multi-region metadata read replicas.
- Dedicated worker pools for AI/OCR.
- Bring-your-own-storage deployment mode.

