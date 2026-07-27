# Container Images

## Purpose

These Dockerfiles package the API, worker, and web runtime from the monorepo for staging or production deployment.

## Scope

They cover reproducible Node builds and keep PostgreSQL and Redis external to the application images.

## Responsibilities

- `api.Dockerfile` builds and starts the NestJS API.
- `worker.Dockerfile` builds and starts the BullMQ worker.
- `web.Dockerfile` builds and starts the Next.js web app.

## Assumptions

- The deploy environment provides PostgreSQL, Redis, secrets, TLS, and log collection.
- `npm ci` uses the committed lockfile.
- Desktop installers are built separately by a Rust-enabled release runner.

## Dependencies

- Node.js 22 base image.
- `package-lock.json`.
- `docker-compose.yml` for local dependencies.

## Detailed Explanation

Each image builds from the repository root so workspace symlinks and shared contracts resolve exactly as they do in CI. The runtime stage intentionally copies the built monorepo for the first release; image minimisation can happen after SBOM and runtime smoke tests are stable.

## Edge Cases

- A missing lockfile must fail `npm ci` instead of silently changing dependency versions.
- API production startup fails if `DATABASE_URL` is missing.
- Worker remains idle without `REDIS_URL`, but production deployment should treat that as a configuration failure.

## Future Considerations

- Use a hardened distroless runtime after native module compatibility is tested.
- Publish provenance and SBOM alongside each image.
- Add database migration as a separate release job before API traffic shifts.
