import { randomUUID } from "node:crypto";
import type {
  ProviderAccountView,
  ProviderRouteRules,
  RouteCandidate,
  RouteDecision,
  RouteInput,
  StoragePool,
} from "@storagepk/contracts";

function includesAny(values: string[] | undefined, expected: string): boolean {
  return !values?.length || values.some((value) => value.toLowerCase() === expected.toLowerCase());
}

function matchesRules(input: RouteInput, rules: ProviderRouteRules): string[] {
  const reasons: string[] = [];
  if (rules.maxSizeBytes !== undefined && input.sizeBytes > rules.maxSizeBytes) reasons.push("file exceeds account rule maxSizeBytes");
  if (rules.minSizeBytes !== undefined && input.sizeBytes < rules.minSizeBytes) reasons.push("file is below account rule minSizeBytes");
  if (rules.mimeTypes?.length && !includesAny(rules.mimeTypes, input.mimeType)) reasons.push("mime type is not allowed by account rule");
  const extension = input.filename.includes(".") ? input.filename.split(".").pop() ?? "" : "";
  if (rules.extensions?.length && !includesAny(rules.extensions, extension)) reasons.push("file extension is not allowed by account rule");
  if (rules.tags?.length && !rules.tags.every((tag) => input.tags?.includes(tag))) reasons.push("required tags are missing");
  if (rules.folderPrefixes?.length && !rules.folderPrefixes.some((prefix) => input.folderPath?.startsWith(prefix))) reasons.push("folder path does not match account rule");
  if (rules.classificationLabels?.length && !rules.classificationLabels.some((label) => input.classificationLabels?.includes(label))) reasons.push("classification label is missing");
  return reasons;
}

function capacityScore(account: ProviderAccountView, input: RouteInput): number {
  const remaining = account.quota?.remainingBytes;
  if (!remaining || remaining <= 0) return account.provider === "telegram" ? 50 : 0;
  if (remaining < input.sizeBytes) return 0;
  return Math.min(50, Math.round((remaining / Math.max(input.sizeBytes, 1)) * 5));
}

export function simulateRoute(input: RouteInput, pool: StoragePool, accounts: ProviderAccountView[]): RouteDecision {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const candidates: RouteCandidate[] = [...pool.accounts]
    .sort((left, right) => left.priority - right.priority)
    .map((membership) => {
      const account = accountById.get(membership.providerAccountId);
      if (!account) return { providerAccountId: membership.providerAccountId, provider: "drive", accepted: false, score: null, reasons: ["provider account not found"] };
      const reasons = matchesRules(input, membership.rules);
      if (account.revokedAt) reasons.push("provider account is revoked");
      if (account.healthState === "disconnected" || account.healthState === "revoked") reasons.push(`provider health is ${account.healthState}`);
      if (account.capabilities.maxUploadBytes !== null && input.sizeBytes > account.capabilities.maxUploadBytes) reasons.push("file exceeds provider upload limit");
      if (membership.quotaThresholdPercent !== null && account.quota?.limitBytes && account.quota.usageBytes !== null) {
        const usagePercent = (account.quota.usageBytes / account.quota.limitBytes) * 100;
        if (usagePercent >= membership.quotaThresholdPercent) reasons.push("account is above configured quota threshold");
      }
      const remaining = account.quota?.remainingBytes;
      if (remaining !== null && remaining !== undefined && remaining < input.sizeBytes) reasons.push("account has insufficient remaining quota");
      const accepted = reasons.length === 0;
      const score = accepted ? 100 - membership.priority + capacityScore(account, input) : null;
      return { providerAccountId: account.id, provider: account.provider, accepted, score, reasons };
    });
  const accepted = candidates.filter((candidate) => candidate.accepted);
  const selected = pool.mode === "balanced"
    ? [...accepted].sort((left, right) => (right.score ?? 0) - (left.score ?? 0))[0]
    : accepted[0];
  const replicas = pool.mode === "replicated" ? accepted.slice(1).map((candidate) => candidate.providerAccountId) : [];
  return {
    id: randomUUID(),
    poolId: pool.id,
    mode: pool.mode,
    selectedProviderAccountId: selected?.providerAccountId ?? null,
    replicaProviderAccountIds: replicas,
    status: selected ? (selected.providerAccountId === accepted[0]?.providerAccountId ? "selected" : "fallback") : "rejected",
    reason: selected ? `Selected ${selected.provider} account after health, rules, size, and quota checks.` : "No healthy compatible provider account is available for this file.",
    candidates,
    createdAt: new Date().toISOString(),
  };
}
