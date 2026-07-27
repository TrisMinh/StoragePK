# Deployment - Docker

## Purpose

Define containerization expectations for future StoragePK services.

## Scope

This document covers API, worker, web, desktop build artifacts, local compose, production images, health checks, and runtime configuration.

## Responsibilities

- Keep builds reproducible.
- Separate application image from environment configuration.
- Support local and production parity.

## Assumptions

- Backend services are containerized.
- Web can be built as a standalone deployment artifact.
- Desktop build is packaged separately and not deployed as a long-running container.

## Dependencies

- [environments.md](environments.md)
- [ci-cd.md](ci-cd.md)
- [../architecture/infrastructure.md](../architecture/infrastructure.md)

## Detailed Explanation

Future images:

| Image | Purpose |
| --- | --- |
| `storagepk-api` | HTTP and WebSocket API. |
| `storagepk-worker` | Background job processing. |
| `storagepk-web` | Next.js web app if deployed separately. |
| `storagepk-migrations` | Controlled migration runner. |

Container rules:

- Run as non-root.
- Use minimal base image.
- Include health endpoint checks.
- Do not bake secrets into images.
- Pin package manager and runtime versions.
- Emit logs to stdout/stderr as structured JSON in production.

Local compose services:

- API.
- Worker.
- PostgreSQL.
- Redis.
- Search engine.
- Optional local Telegram Bot API server for testing large file behavior; see `docs/providers/telegram-local-bot-api-server.md`.

## Edge Cases

- Upload endpoints may need larger body/streaming limits than normal API routes.
- Worker image needs provider SDK dependencies and extraction tools.
- Health checks should not require external providers for container liveness.
- Desktop builds need signed artifacts outside normal container runtime.

## Future Considerations

- Add multi-stage Dockerfiles.
- Add SBOM and provenance attestations.
- Add image signing.
