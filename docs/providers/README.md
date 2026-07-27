# Providers - Implementation Index

## Purpose

Provide the build order and decision map for StoragePK provider integration.

## Scope

This index covers Google Drive, Telegram public Bot API, Telegram local Bot API server, storage pools, route algorithms, desktop connector, configuration, errors, tests, and operations.

## Responsibilities

- Give implementation agents one starting point.
- Prevent provider docs from being read out of order.
- Define which documents are authoritative for each provider subsystem.

## Assumptions

- Implementation begins after this documentation phase.
- StoragePK supports web and desktop clients.
- Desktop-first local Telegram large-file mode is a core advanced capability.
- Google Drive and Telegram are external providers; StoragePK metadata remains canonical.

## Dependencies

- [implementation-handoff.md](implementation-handoff.md)
- [provider-contract.md](provider-contract.md)
- [storage-pools.md](storage-pools.md)
- [desktop-connector-protocol.md](desktop-connector-protocol.md)
- [provider-configuration.md](provider-configuration.md)

## Detailed Explanation

Read order:

| Order | Document | Why It Matters |
| --- | --- | --- |
| 1 | [policy-and-feasibility.md](policy-and-feasibility.md) | Defines what is allowed, risky, or excluded. |
| 2 | [compliance-readiness.md](compliance-readiness.md) | Defines launch evidence and disclosures. |
| 3 | [configuration.md](configuration.md) | Defines typed config schemas. |
| 4 | [provider-contract.md](provider-contract.md) | Defines the adapter interface. |
| 5 | [linking-flows.md](linking-flows.md) | Defines Drive OAuth and Telegram linking. |
| 6 | [google-drive-desktop-setup.md](google-drive-desktop-setup.md) | Configures the implemented standalone Drive connector. |
| 7 | [drive-adapter-spec.md](drive-adapter-spec.md) | Defines Drive implementation contract. |
| 8 | [telegram-adapter-spec.md](telegram-adapter-spec.md) | Defines Telegram implementation contract. |
| 9 | [storage-pools.md](storage-pools.md) | Defines multi-account storage destinations. |
| 10 | [pool-rule-schema.md](pool-rule-schema.md) | Defines route rule JSON. |
| 11 | [routing-algorithm.md](routing-algorithm.md) | Defines exact route selection logic. |
| 12 | [idempotency-and-reconciliation.md](idempotency-and-reconciliation.md) | Defines retry and repair safety. |
| 13 | [telegram-local-bot-api-server.md](telegram-local-bot-api-server.md) | Defines local Telegram server mode. |
| 14 | [telegram-local-hardening.md](telegram-local-hardening.md) | Defines local server hardening. |
| 15 | [desktop-connector-protocol.md](desktop-connector-protocol.md) | Defines desktop-pulled provider jobs. |
| 16 | [provider-state-machines.md](provider-state-machines.md) | Defines state transitions. |
| 17 | [provider-error-catalog.md](provider-error-catalog.md) | Defines error codes and recovery. |
| 18 | [provider-threat-controls.md](provider-threat-controls.md) | Maps threats to controls and tests. |
| 19 | [provider-testing-matrix.md](provider-testing-matrix.md) | Defines tests and acceptance gates. |
| 20 | [provider-runbook.md](provider-runbook.md) | Defines operations and incident handling. |
| 21 | [provider-release-checklist.md](provider-release-checklist.md) | Defines provider release blockers. |

Provider implementation modules:

| Module | Owns |
| --- | --- |
| `ProviderAccountService` | Link, reconnect, revoke, health, capabilities. |
| `StoragePoolService` | Pool CRUD, pool health, capacity summary. |
| `ProviderRouterService` | Route simulation and final route decisions. |
| `DriveProviderAdapter` | Google Drive upload/download/verify/delete. |
| `TelegramProviderAdapter` | Public and local Bot API behavior. |
| `DesktopConnectorService` | Desktop worker registration and job handoff. |
| `ProviderRepairService` | Retry, reroute, drift repair, reconciliation. |

## Edge Cases

- If docs conflict, more specific provider docs override general architecture docs.
- If provider terms or limits change, update policy, capacity, error catalog, tests, and runbook together.
- If desktop local Telegram is unavailable, route decision must hold, reroute, or fail according to pool policy.

## Future Considerations

- Add generated provider OpenAPI reference after implementation.
- Add sample configuration files.
- Add provider SDK abstraction tests.
