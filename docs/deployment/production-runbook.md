# Production Runbook

## Purpose

Define the minimum sequence for deploying StoragePK with a real database, queue backend, provider credentials, and a first owner account.

## Scope

This runbook covers staging or production container deployment. It does not replace the provider-specific operational runbooks.

## Responsibilities

- DevOps owns secrets, database, Redis, TLS, images, and rollback.
- Security approves secret scanning, provider scopes, dependency advisories, and desktop signing.
- Product or the workspace owner supplies provider credentials and privacy copy.

## Assumptions

- PostgreSQL 16 and Redis 7 are available through managed services or hardened containers.
- The deployment runner has access to the committed lockfile and image registry.
- Provider OAuth redirect URIs are registered before the first Drive link.

## Dependencies

- [release-gates.md](release-gates.md)
- [../security/secrets.md](../security/secrets.md)
- [../providers/provider-runbook.md](../providers/provider-runbook.md)

## Detailed Explanation

1. Provision PostgreSQL, Redis, TLS, object staging storage, log collection, and backups.
2. Inject `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` from the secret manager.
3. Run `npm ci`, `npm run db:generate`, and `npm run db:validate` in the release environment.
4. Apply reviewed migrations with `npm run db:deploy` after a backup or restore point exists.
5. Bootstrap the first owner with `npm run auth:bootstrap` and one-time `STORAGEPK_BOOTSTRAP_*` variables, then remove those variables from the deployment environment.
6. Start API and worker images. Verify `/v1/health` reports configured database and Redis.
7. Start web and desktop release channels. Run Drive, Telegram public, and Telegram local smoke tests with non-production provider destinations.
8. Capture release evidence, SBOM, image digests, desktop hashes, and rollback references.

## Edge Cases

- Never run the bootstrap command with a password in shell history; inject it through a secret manager or protected CI variable.
- If migration deploy fails, stop before API traffic shifts.
- If Redis is unavailable, provider jobs must remain queued and visible rather than being acknowledged as completed.
- If provider policy or dependency audit is unresolved, the release gate remains blocked.

## Future Considerations

- Add automated migration backup and restore rehearsal.
- Add canary deployment and automatic rollback on health regression.
- Add signed SBOM and SLSA provenance artifacts.
