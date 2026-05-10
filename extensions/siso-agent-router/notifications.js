import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { appendFeedEvent, createMailboxMessage, markMailboxDelivered } from "./mailbox-feed.js";
import { recordChildRunScorecard } from "./agent-scorecards.js";
import { collectLatestChildRunRecords, isTerminalChildStatus } from "./spawn-layer.js";
import { currentParentSessionId, isRecordVisibleToScope, writeScopedTaskRecord } from "./task-registry.js";

const deliveredIds = new Set();
const claimedIds = new Set();
const dispatcherStops = new Map();

function nowIso() {
    return new Date().toISOString();
}
function compactWhitespace(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}
function truncate(value, limit = 6000) {
    const text = String(value ?? "");
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}
function notificationResultMaxChars() {
    const parsed = Number.parseInt(process.env.SISO_CHILD_NOTIFICATION_RESULT_MAX_CHARS ?? "900", 10);
    return Number.isFinite(parsed) && parsed >= 200 ? parsed : 900;
}
function escapeXml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
function agentLabel(record) {
    const profile = String(record.profile ?? "child");
    if (profile.includes("scout"))
        return "MiniMax scout";
    if (profile.includes("verifier"))
        return "MiniMax verifier";
    if (profile.includes("oracle"))
        return "Oracle";
    if (profile.includes("codex"))
        return "Codex worker";
    if (profile.includes("worker"))
        return "MiniMax worker";
    return compactWhitespace(profile.replace(/[._-]+/g, " ")) || "SISO child";
}
function statusWord(status) {
    if (status === "aborted")
        return "stopped";
    if (status === "timeout")
        return "failed";
    return status;
}
function summaryFor(record) {
    const summary = compactWhitespace(record.compactResult?.summary ?? record.error ?? "Child finished.");
    const label = agentLabel(record);
    const status = statusWord(record.status);
    return `${label} ${status}: ${summary}`;
}
function durationMs(record, now = Date.now()) {
    const start = Date.parse(record.startedAt ?? "");
    const end = Date.parse(record.completedAt ?? record.updatedAt ?? "") || now;
    return Number.isFinite(start) ? Math.max(0, end - start) : 0;
}
function timestampMs(value) {
    const parsed = Date.parse(value ?? "");
    return Number.isFinite(parsed) ? parsed : undefined;
}
function resultFor(record) {
    const text = String(record.compactResult?.summary || record.error || "Child finished without a final result.");
    const maxChars = notificationResultMaxChars();
    if (text.length <= maxChars)
        return text;
    const pointer = record.stdoutPath ?? record.handoffPath ?? record.runRecordPath ?? "child artifact";
    return [
        truncate(text, maxChars),
        `[SISO_CHILD_RESULT_TRUNCATED original_chars=${text.length} shown_chars=${maxChars} full_output=${pointer}]`,
    ].join("\n");
}
export function formatTaskNotification(record, options = {}) {
    const tokens = record.tokens ?? { totalTokens: 0 };
    const toolCalls = typeof record.toolCalls === "number" ? record.toolCalls : 0;
    const outputPath = record.stdoutPath ?? record.runRecordPath ?? "";
    return [
        "<task-notification>",
        `<task-id>${escapeXml(record.id)}</task-id>`,
        outputPath ? `<output-file>${escapeXml(outputPath)}</output-file>` : undefined,
        `<status>${escapeXml(statusWord(record.status))}</status>`,
        `<summary>${escapeXml(summaryFor(record))}</summary>`,
        `<result>${escapeXml(resultFor(record))}</result>`,
        "<usage>",
        `<total_tokens>${Number(tokens.totalTokens ?? 0)}</total_tokens>`,
        `<tool_uses>${Number(toolCalls)}</tool_uses>`,
        `<duration_ms>${durationMs(record, options.nowMs)}</duration_ms>`,
        "</usage>",
        "</task-notification>",
    ].filter(Boolean).join("\n");
}
export function formatTaskNotificationBatch(records, options = {}) {
    const items = records.map((record) => {
        const tokens = record.tokens ?? { totalTokens: 0 };
        const toolCalls = typeof record.toolCalls === "number" ? record.toolCalls : 0;
        return [
            '<task>',
            `<task-id>${escapeXml(record.id)}</task-id>`,
            record.fleetId ? `<fleet-id>${escapeXml(record.fleetId)}</fleet-id>` : undefined,
            `<status>${escapeXml(statusWord(record.status))}</status>`,
            `<summary>${escapeXml(summaryFor(record))}</summary>`,
            record.handoffPath ? `<handoff-file>${escapeXml(record.handoffPath)}</handoff-file>` : undefined,
            "<usage>",
            `<total_tokens>${Number(tokens.totalTokens ?? 0)}</total_tokens>`,
            `<tool_uses>${Number(toolCalls)}</tool_uses>`,
            `<duration_ms>${durationMs(record, options.nowMs)}</duration_ms>`,
            "</usage>",
            "</task>",
        ].filter(Boolean).join("\n");
    });
    return [
        "<task-notification-batch>",
        `<count>${records.length}</count>`,
        ...items,
        "</task-notification-batch>",
    ].join("\n");
}
function readRecord(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    }
    catch {
        return undefined;
    }
}
function writeRecord(path, record) {
    writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
    writeScopedTaskRecord(record);
}
function notificationKey(parentSessionId, childId) {
    return `${parentSessionId}:${childId}`;
}
function safeLockSegment(value) {
    return String(value ?? "unknown").replace(/[^A-Za-z0-9._-]+/g, "-") || "unknown";
}
function notificationLockPath(record, parentSessionId) {
    return `${record.runRecordPath}.notify-${safeLockSegment(parentSessionId)}.lock`;
}
function persistParentNotificationMailbox(record, deliveredAt) {
    const parentSessionId = record?.parentNotification?.parentSessionId ?? record?.parentSessionId;
    if (!record?.id || !parentSessionId || parentSessionId === "unknown")
        return undefined;
    try {
        const message = createMailboxMessage({
            id: record.id,
            kind: "child_notification",
            childId: record.id,
            ownerSessionId: parentSessionId,
            rootSessionId: record.rootSessionId,
            parentSessionId,
            status: statusWord(record.status),
            profile: record.profile,
            model: record.model,
            task: record.task,
            summary: summaryFor(record),
            result: resultFor(record),
            runRecordPath: record.runRecordPath,
            outputFile: record.stdoutPath,
            deliveryId: record.parentNotification?.deliveryId,
        }, { ownerSessionId: parentSessionId });
        const delivered = markMailboxDelivered(message, deliveredAt, {
            ownerSessionId: parentSessionId,
        });
        const feedEvent = {
            type: "child_notification_delivered",
            childId: record.id,
            ownerSessionId: parentSessionId,
            rootSessionId: record.rootSessionId,
            deliveryId: record.parentNotification?.deliveryId,
            status: statusWord(record.status),
            mailboxPath: delivered.mailboxPath,
            runRecordPath: record.runRecordPath,
        };
        appendFeedEvent(`#task/${record.id}`, feedEvent, { ownerSessionId: parentSessionId, at: deliveredAt });
        appendFeedEvent(`#session/${parentSessionId}`, feedEvent, { ownerSessionId: parentSessionId, at: deliveredAt });
        return delivered;
    }
    catch {
        return undefined;
    }
}
function persistChildRunScorecard(record, deliveredAt) {
    if (!record?.id)
        return undefined;
    try {
        return recordChildRunScorecard(record, {
            recordedAt: deliveredAt,
            reason: "child-notification-delivered",
        });
    }
    catch {
        return undefined;
    }
}
function acquireNotificationLock(record, parentSessionId) {
    if (!record?.runRecordPath)
        return undefined;
    const path = notificationLockPath(record, parentSessionId);
    try {
        mkdirSync(dirname(path), { recursive: true });
        const fd = openSync(path, "wx");
        closeSync(fd);
        return path;
    }
    catch {
        return undefined;
    }
}
function releaseNotificationLock(path) {
    if (!path)
        return;
    try {
        unlinkSync(path);
    }
    catch {
        // Best-effort cleanup; a stale lock is safer than duplicate follow-up delivery.
    }
}
function recordBelongsToParent(record, parentSessionId) {
    return Boolean(parentSessionId && parentSessionId !== "unknown" && record?.parentSessionId === parentSessionId);
}
export function markParentNotificationDelivered(record, deliveredAt = nowIso(), options = {}) {
    if (!record?.runRecordPath)
        return record;
    const latest = readRecord(record.runRecordPath) ?? record;
    const parentSessionId = options.parentSessionId ?? record.parentSessionId;
    if (!recordBelongsToParent(latest, parentSessionId))
        return latest;
    if (latest.parentNotifiedAt || latest.parentNotification?.deliveredAt)
        return latest;
    const deliveryId = `siso-notify-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const next = {
        ...latest,
        parentNotifiedAt: deliveredAt,
        parentNotification: {
            ...(latest.parentNotification ?? {}),
            parentSessionId,
            deliveryId,
            deliveredAt,
            claimedAt: undefined,
            claimId: undefined,
        },
    };
    writeRecord(record.runRecordPath, next);
    persistParentNotificationMailbox(next, deliveredAt);
    const scorecard = persistChildRunScorecard(next, deliveredAt);
    if (scorecard) {
        const withScorecard = {
            ...next,
            scorecard: {
                id: scorecard.id,
                path: scorecard.path,
                score: scorecard.score,
                recordedAt: scorecard.recordedAt,
            },
        };
        writeRecord(record.runRecordPath, withScorecard);
        return withScorecard;
    }
    return next;
}
function claimParentNotification(record, options = {}) {
    const parentSessionId = options.parentSessionId;
    if (!recordBelongsToParent(record, parentSessionId))
        return undefined;
    const key = notificationKey(parentSessionId, record.id);
    if (claimedIds.has(key))
        return undefined;
    const lockPath = acquireNotificationLock(record, parentSessionId);
    if (!lockPath)
        return undefined;
    claimedIds.add(key);
    const claimedAt = options.now?.() ?? nowIso();
    const claimId = `siso-claim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    try {
        const latest = readRecord(record.runRecordPath) ?? record;
        if (!shouldDeliver(latest, { ...options, ignoreInMemoryClaim: true })) {
            claimedIds.delete(key);
            releaseNotificationLock(lockPath);
            return undefined;
        }
        const next = {
            ...latest,
            parentNotification: {
                ...(latest.parentNotification ?? {}),
                parentSessionId,
                claimedAt,
                claimId,
            },
        };
        writeRecord(record.runRecordPath, next);
        return { record: next, key, lockPath, claimId };
    }
    catch (error) {
        claimedIds.delete(key);
        releaseNotificationLock(lockPath);
        throw error;
    }
}
function clearParentNotificationClaim(claim) {
    if (!claim)
        return;
    try {
        const latest = readRecord(claim.record.runRecordPath) ?? claim.record;
        if (latest.parentNotification?.claimId === claim.claimId && !latest.parentNotification?.deliveredAt) {
            const nextNotification = { ...(latest.parentNotification ?? {}) };
            delete nextNotification.claimedAt;
            delete nextNotification.claimId;
            const next = {
                ...latest,
                parentNotification: nextNotification,
            };
            writeRecord(latest.runRecordPath, next);
        }
    }
    finally {
        claimedIds.delete(claim.key);
        releaseNotificationLock(claim.lockPath);
    }
}
function finishParentNotificationClaim(claim, deliveredAt) {
    const marked = markParentNotificationDelivered(claim.record, deliveredAt, {
        parentSessionId: claim.record.parentSessionId,
    });
    deliveredIds.add(notificationKey(claim.record.parentSessionId, claim.record.id));
    claimedIds.delete(claim.key);
    releaseNotificationLock(claim.lockPath);
    return marked;
}
function recordIsFreshForSession(record, sessionStartedAt) {
    if (!sessionStartedAt)
        return true;
    const sessionStartedMs = timestampMs(sessionStartedAt);
    if (sessionStartedMs === undefined)
        return true;
    const recordStartedMs = timestampMs(record?.startedAt);
    return recordStartedMs !== undefined && recordStartedMs >= sessionStartedMs;
}
function shouldDeliver(record, options = {}) {
    const parentSessionId = options.parentSessionId;
    if (!parentSessionId || parentSessionId === "unknown")
        return false;
    return Boolean(record?.id &&
        isTerminalChildStatus(record.status) &&
        recordBelongsToParent(record, parentSessionId) &&
        !record.parentNotifiedAt &&
        !record.parentNotification?.deliveredAt &&
        !record.parentNotification?.claimedAt &&
        !deliveredIds.has(notificationKey(parentSessionId, record.id)) &&
        (options.ignoreInMemoryClaim || !claimedIds.has(notificationKey(parentSessionId, record.id))) &&
        isRecordVisibleToScope(record, { parentSessionId }) &&
        recordIsFreshForSession(record, options.sessionStartedAt));
}
export async function deliverPendingChildNotifications(pi, options = {}) {
    if (typeof pi?.sendMessage !== "function")
        return { scanned: 0, delivered: 0, skipped: 0 };
    const scope = {
        parentSessionId: options.parentSessionId,
        rootSessionId: options.rootSessionId ?? options.parentSessionId,
        ownerAgentId: options.ownerAgentId ?? options.parentSessionId,
    };
    const records = collectLatestChildRunRecords(options.limit ?? 12, scope);
    let skipped = 0;
    const pending = [];
    for (const record of records) {
        if (!shouldDeliver(record, options)) {
            skipped++;
            continue;
        }
        const claim = claimParentNotification(record, options);
        if (!claim) {
            skipped++;
            continue;
        }
        pending.push(claim);
    }
    if (pending.length === 0)
        return { scanned: records.length, delivered: 0, skipped };
    if (pending.length > 1 || options.batch === true) {
        try {
            const claimedRecords = pending.map((claim) => claim.record);
            const content = formatTaskNotificationBatch(claimedRecords, { nowMs: Date.now() });
            await pi.sendMessage({
                customType: "siso-task-notification-batch",
                content,
                display: false,
                details: {
                    childIds: claimedRecords.map((record) => record.id),
                    count: claimedRecords.length,
                    statuses: Object.fromEntries(claimedRecords.map((record) => [record.id, statusWord(record.status)])),
                },
            }, { triggerTurn: true, deliverAs: "followUp" });
            const deliveredAt = options.now?.() ?? nowIso();
            for (const claim of pending) {
                finishParentNotificationClaim(claim, deliveredAt);
            }
            return { scanned: records.length, delivered: pending.length, skipped, batches: 1 };
        }
        catch (error) {
            for (const claim of pending) {
                clearParentNotificationClaim(claim);
            }
            throw error;
        }
    }
    const claim = pending[0];
    const record = claim.record;
    const content = formatTaskNotification(record, { nowMs: Date.now() });
    try {
        await pi.sendMessage({
            customType: "siso-task-notification",
            content,
            display: false,
            details: {
                childId: record.id,
                status: statusWord(record.status),
                runRecordPath: record.runRecordPath,
                outputFile: record.stdoutPath,
            },
        }, { triggerTurn: true, deliverAs: "followUp" });
        finishParentNotificationClaim(claim, options.now?.() ?? nowIso());
        return { scanned: records.length, delivered: 1, skipped, batches: 0 };
    }
    catch (error) {
        clearParentNotificationClaim(claim);
        throw error;
    }
}
export function startChildNotificationDispatcher(pi, options = {}) {
    const parentSessionId = options.parentSessionId ?? currentParentSessionId(options.ctx);
    if (!parentSessionId || parentSessionId === "unknown")
        return () => { };
    if (dispatcherStops.has(parentSessionId))
        return dispatcherStops.get(parentSessionId);
    const pollMs = options.pollMs ?? Number.parseInt(process.env.SISO_CHILD_NOTIFICATION_POLL_MS ?? "2500", 10);
    const dispatcherOptions = {
        ...options,
        sessionStartedAt: options.sessionStartedAt ?? nowIso(),
        parentSessionId,
    };
    const tick = () => {
        deliverPendingChildNotifications(pi, dispatcherOptions).catch((error) => {
            pi?.sendMessage?.({
                customType: "siso-child-notification-error",
                content: error instanceof Error ? error.message : String(error),
                display: false,
            });
        });
    };
    if (!Number.isFinite(pollMs) || pollMs <= 0) {
        const stop = () => {
            dispatcherStops.delete(parentSessionId);
        };
        dispatcherStops.set(parentSessionId, stop);
        return stop;
    }
    const timer = setInterval(tick, pollMs);
    timer.unref?.();
    const stop = () => {
        clearInterval(timer);
        dispatcherStops.delete(parentSessionId);
    };
    dispatcherStops.set(parentSessionId, stop);
    return stop;
}
