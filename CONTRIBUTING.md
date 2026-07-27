# Contributing to StoragePK

Thank you for contributing. StoragePK accepts focused bug fixes, features,
tests, documentation, and community improvements under the MIT License. By
submitting a contribution, you agree that it may be distributed under that
license.

Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating.
Report vulnerabilities through the private process in [SECURITY.md](SECURITY.md),
not through a public issue.

## Prerequisites

- Git
- Node.js 20.11 or newer and npm
- Docker with Docker Compose for PostgreSQL and Redis
- For desktop work: Rust stable, Cargo, Visual Studio C++ Build Tools, the
  Windows SDK, and the WebView2 runtime

## Local Setup

1. Fork and clone the repository.
2. Create a branch from `main` with a focused name such as
   `fix/desktop-import-error`.
3. Install exact dependencies with `npm ci`.
4. Copy `.env.example` to `.env`. Use local-only values and never commit the
   resulting file.
5. Start PostgreSQL and Redis:

   ```console
   docker compose up -d postgres redis
   ```

6. Initialize the development database:

   ```console
   npm run db:push
   ```

7. Start the web app and API:

   ```console
   npm run dev
   ```

The API has a documented in-memory fallback for UI development when
`DATABASE_URL` is absent. Use the database-backed stack when changing
persistence, queues, migrations, or provider state.

For Windows desktop development, run:

```console
npm run tauri:dev --workspace=@storagepk/desktop
```

Developer OAuth credentials belong only in local environment variables. Do not
commit, paste into issues, or print them in test output.

## Standards

- Read the relevant document under `docs/` before changing behavior.
- Use strict TypeScript and explicit domain types.
- Keep provider implementations behind the shared adapter contract.
- Do not log credentials, authorization headers, private provider links, or
  user file metadata.
- Keep provider limits, retry behavior, and repair paths explicit.
- Keep desktop local services bound to loopback unless a reviewed security
  design requires otherwise.
- Update tests and documentation with behavior, configuration, schema, or
  release-process changes.

## Tests and Checks

Run the most focused tests while developing. Before requesting review, run the
complete release gate:

```console
npm run release
```

That command prepares shared workspaces, lints, type-checks, runs tests, creates
production builds, and checks required release files. Desktop changes must also
pass:

```console
npm run tauri:test --workspace=@storagepk/desktop
```

Tests must not call real provider accounts by default. Document any manual
provider verification separately and use non-production test data.

## Pull Requests

Keep each pull request reviewable and limited to one purpose. Complete the pull
request template with:

- the problem and user impact;
- linked issues;
- test evidence and manual scenarios;
- security, provider, migration, and compatibility impact;
- screenshots for visible changes; and
- rollback or repair behavior when the change can fail after deployment.

Maintainers may request a smaller change, additional tests, documentation, or a
security review. A provider feature is incomplete without explicit error,
quota, retry, and repair paths.

## Release Process

Releases are maintainer-only:

1. Update versions consistently, update `CHANGELOG.md`, and confirm the release
   gates in `docs/deployment/release-gates.md`.
2. Run `npm run release`.
3. On Windows, provide the production Desktop OAuth values through environment
   variables and run `npm run release:desktop`.
4. Create and push a tag matching the root package version, for example
   `v0.3.0`.

The `Windows Release` GitHub Actions workflow validates that the tag and package
version match, builds one NSIS installer and one MSI package, and attaches both
to the GitHub release. Repository administrators must configure these GitHub
Actions repository secrets:

- `STORAGEPK_GOOGLE_CLIENT_ID`
- `STORAGEPK_GOOGLE_CLIENT_SECRET`

Never hardcode either value in a workflow, source file, release note, or log.
The installed-app client secret is embedded in desktop binaries and cannot be
treated as an absolute secret, but its actual value must still be protected
during development and packaging. Complete required code-signing, provider
policy, consent-screen, and verification gates before broad distribution.
