# Deployment - CI/CD

## Purpose

Define continuous integration, production build, release, rollback, and Git publishing expectations.

## Scope

This document covers the active monorepo CI workflow, production builds, provider release gates, and Git publishing.

## Responsibilities

- Keep the repository ready for Git.
- Define production build gates.
- Provide a one-command push path for the current docs repository.

## Assumptions

- The monorepo contains web, API, worker, desktop, and shared packages.
- `package-lock.json` is committed and CI uses `npm ci`.
- `push-all.cmd` is the local one-click command requested for Git publishing.

## Dependencies

- [environments.md](environments.md)
- [docker.md](docker.md)
- [release-gates.md](release-gates.md)
- [monitoring.md](monitoring.md)
- [../testing/strategy.md](../testing/strategy.md)

## Detailed Explanation

Local and CI validation workflow:

1. Edit code and docs together when behavior changes.
2. Run `npm run release`.
3. Run `push-all.cmd` only after reviewing the staged diff.
4. Enter remote URL if repository has no `origin`.
5. Script commits and pushes the validated release.

CI gates:

| Stage | Checks |
| --- | --- |
| Install | Lockfile install. |
| Static | Typecheck, lint, formatting. |
| Test | Unit, integration, e2e smoke. |
| Security | Dependency scan, secret scan, container scan. |
| Build | Web, API, worker, desktop package. |
| Migration | Migration dry-run. |
| Provider Policy | Check Drive scopes, Telegram mode limits, and provider risk docs before release. |
| Deploy Staging | Apply staging config and smoke tests. |
| Deploy Production | Manual approval or protected branch release. |

Release evidence and owners are defined in [release-gates.md](release-gates.md).

Rollback:

- API/worker rollback uses previous container image.
- Database rollback uses compatible migrations or restore plan.
- Desktop rollback uses updater channel policy.
- Provider changes require separate manual verification.

## Edge Cases

- No Git remote: `push-all.cmd` prompts for remote URL.
- Desktop native build requires Rust and platform signing tools on the release runner.
- Build succeeds but migrations fail: deployment must stop before traffic shift.
- Worker deployment must not process jobs with incompatible payload versions.

## Future Considerations

- Add GitHub Actions workflow after remote repository exists.
- Add signed desktop releases.
- Add release notes generator.
