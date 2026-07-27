# Providers - Operations Runbook

## Purpose

Define operational procedures for diagnosing and repairing StoragePK provider issues.

## Scope

This runbook covers Drive, Telegram, storage pools, desktop local server, queues, credentials, incidents, and user support checks.

## Responsibilities

- Help operators resolve provider failures quickly.
- Provide safe manual repair steps.
- Prevent destructive provider actions without confirmation.

## Assumptions

- Operators have admin access to StoragePK diagnostics, not raw provider secrets.
- Production logs are structured and redacted.
- Provider repair tools are audited.

## Dependencies

- [provider-error-catalog.md](provider-error-catalog.md)
- [risk-register.md](risk-register.md)
- [provider-state-machines.md](provider-state-machines.md)
- [../deployment/monitoring.md](../deployment/monitoring.md)

## Detailed Explanation

### Triage Checklist

| Question | Where To Check |
| --- | --- |
| Which provider account failed? | Provider account diagnostics. |
| Is the provider healthy? | Capability snapshot and health check. |
| Is quota available? | Quota status. |
| Is the job retryable? | Error catalog and job state. |
| Did upload maybe succeed externally? | Provider verify operation. |
| Is desktop required? | Route decision execution location. |
| Is desktop online? | Desktop connector heartbeat. |
| Is Telegram destination membership expected? | Provider settings and user warning acknowledgement. |

### Common Incidents

| Incident | First Response | Repair |
| --- | --- | --- |
| Drive token expired | Ask user to reconnect or run refresh diagnostic. | Reconnect provider, resume queued jobs. |
| Drive reconnects every seven days | Check whether the publisher OAuth consent project is still in **Testing**. | Move the publisher project to **In production** and complete applicable basic verification before broad distribution. |
| Drive quota full | Confirm quota and pool fallback. | Add account, free space, reroute failed jobs. |
| Telegram bot removed | Verify destination permission. | Re-add bot, reconnect, retry jobs. |
| Local server offline | Check desktop heartbeat. | Open desktop, restart local server, or reroute. |
| Port conflict | Check local status. | Auto-select new port or ask user to free port. |
| Upload timeout | Verify provider object before retry. | Mark synced if object exists, otherwise retry. |
| Orphan provider object | Compare audit and provider metadata. | Attach to resource or delete with confirmation. |

### Manual Repair Rules

- Never delete provider objects by default.
- Never expose raw credentials to support operators.
- Always verify provider object before retry after timeout.
- Always preserve audit trail of repair action.
- Always show user if route changed from original provider account.

### Monitoring Alerts

- Provider upload failure rate spike.
- Dead-letter queue for `provider-upload` or `desktop-provider-upload`.
- Drive quota failures across many accounts.
- Telegram local server crash loop.
- Desktop connector lease expiry spike.
- Credential decrypt failures.

## Edge Cases

- User cannot reconnect Drive because the OAuth app is unavailable; operator should confirm the packaged Client ID, `drive.file` scope, consent-project publishing state, test-user status, and recorded verification evidence without claiming approval that is not present.
- Desktop connector shows online but local server is unreachable; ask desktop to restart local server.
- Telegram file is visible in channel but StoragePK says failed; run verification and complete storage object record.
- User reports another person downloaded file from Telegram; explain Telegram membership access and audit destination members.

## Future Considerations

- Add automated repair playbooks.
- Add admin dashboard buttons mapped to this runbook.
- Add user-facing self-service diagnostics.
