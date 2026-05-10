export type HeartbeatState = "healthy" | "warn" | "stale" | "dead";
export type PackageUseClass = "reference" | "candidate" | "watch" | "ignore";
export type PackageUseAction = "copy-pattern" | "audit" | "install-check" | "watch" | "ignore";
export type PackageUseTier = "high" | "medium" | "low";
export interface HeartbeatStateResult {
    state: HeartbeatState;
    ageMs: number | null;
    heartbeatAt: string | null;
    heartbeatAtMs: number | null;
    heartbeatSource: string | null;
    warnAtMs: number;
    staleAtMs: number;
    deadAtMs: number;
    terminal: boolean;
    reason: string;
}
export interface ProcessFingerprintRecord {
    pid?: number | string;
    ppid?: number | string;
    childPid?: number | string;
    childId?: string;
    sessionId?: string;
    parentSessionId?: string;
    taskId?: string;
    runId?: string;
    fleetId?: string;
    cwd?: string;
    cwdPath?: string;
    command?: string;
    cmd?: string;
    commandLine?: string;
    argv?: unknown;
    args?: unknown;
    model?: string;
    profile?: string;
    role?: string;
    startedAt?: string | number | Date;
    spawnAt?: string | number | Date;
    heartbeatAt?: string | number | Date;
    worktreePath?: string;
    host?: string;
    platform?: string;
    process?: Record<string, unknown>;
    spawn?: Record<string, unknown>;
    identity?: Record<string, unknown>;
    status?: string;
    state?: string;
    deadletterAt?: string | number | Date;
    deadletteredAt?: string | number | Date;
    deadAt?: string | number | Date;
    exitCode?: number | string;
    heartbeatPolicy?: {
        warnMs?: number | string;
        staleMs?: number | string;
        deadMs?: number | string;
    };
    heartbeatWarnMs?: number | string;
    heartbeatStaleMs?: number | string;
    heartbeatDeadMs?: number | string;
    [key: string]: unknown;
}
export interface SupervisorHealthEntry {
    id: string;
    fingerprint: string;
    state: HeartbeatState;
    ageMs: number | null;
    reason: string;
}
export interface SupervisorHealthSummary {
    total: number;
    byState: Record<HeartbeatState, number>;
    deadletters: number;
    missingHeartbeat: number;
    uniqueFingerprints: number;
    duplicateFingerprints: number;
    oldestAgeMs: number | null;
    newestHeartbeatAtMs: number | null;
    newestHeartbeatAt: string | null;
    nowMs: number;
    records: SupervisorHealthEntry[];
    summary: string;
}
export interface DeadletterRecord {
    id: string;
    sourceId?: string;
    status: "deadletter";
    reason: string;
    deadletterAt: string;
    attempt: number;
    fingerprint: string;
    record: Record<string, unknown>;
}
export interface RetryState {
    attempt: number;
    maxAttempts: number;
    retryable: boolean;
    delayMs: number;
    retryAt: string | null;
    deadletter: boolean;
}
export interface OrphanCleanupDecision {
    safe: boolean;
    expectedFingerprint: string;
    observedFingerprint: string;
    pidMatches: boolean;
    fingerprintMatches: boolean;
    commandMatches: boolean;
    reason: string;
}
export interface PackageCandidateLike {
    name?: string;
    description?: string;
    category?: string;
    categories?: string[];
    recommendation?: string;
    rationale?: string;
    readme?: string;
    repoUrl?: string;
    packageUrl?: string;
    [key: string]: unknown;
}
export interface PackageUseClassification {
    use: PackageUseClass;
    action: PackageUseAction;
    tier: PackageUseTier;
    signals: string[];
    reasons: string[];
}
export type SupervisorRecordKind = "active" | "retries" | "deadletters" | "orphans";
export interface SupervisorStoreOptions {
    cwd?: string;
    rootDir?: string;
    kind?: SupervisorRecordKind | string;
    limit?: number;
    at?: string;
    now?: () => string;
}
export interface PersistedSupervisorRecord {
    kind: SupervisorRecordKind;
    at: string;
    record: Record<string, unknown>;
    path: string;
}
export declare function deriveHeartbeatState(record: ProcessFingerprintRecord, now?: number | string | Date): HeartbeatStateResult;
export declare function buildProcessFingerprint(record?: ProcessFingerprintRecord): string;
export declare function summarizeSupervisorHealth(records?: ProcessFingerprintRecord[], now?: number | string | Date): SupervisorHealthSummary;
export declare function createDeadletterRecord(record?: ProcessFingerprintRecord, reason?: string, now?: number | string | Date): DeadletterRecord;
export declare function nextRetryState(record?: ProcessFingerprintRecord, policy?: Record<string, unknown>, now?: number | string | Date): RetryState;
export declare function shouldCleanupOrphanProcess(record?: ProcessFingerprintRecord, observed?: ProcessFingerprintRecord & {
    fingerprint?: string;
}): OrphanCleanupDecision;
export declare function supervisorStorePath(kind?: SupervisorRecordKind | string, options?: SupervisorStoreOptions): string;
export declare function persistSupervisorRecord(kind?: SupervisorRecordKind | string, record?: Record<string, unknown>, options?: SupervisorStoreOptions): PersistedSupervisorRecord;
export declare function listSupervisorRecords(options?: SupervisorStoreOptions): PersistedSupervisorRecord[];
export declare function classifyPackageForSubagentUse(pkg?: PackageCandidateLike): PackageUseClassification;
