import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const DEFAULT_ROOT_DIR = join(homedir(), ".siso", "agent", "mailbox-feed");

function nowIso() {
    return new Date().toISOString();
}

function mailboxFeedRootDir(options = {}) {
    return options.rootDir ?? process.env.SISO_MAILBOX_FEED_ROOT_DIR ?? DEFAULT_ROOT_DIR;
}

function sanitizePathSegment(value, fallback = "unknown") {
    const text = String(value ?? "").trim();
    const safe = text.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    return safe || fallback;
}

function normalizeMailboxOwnerSessionId(value) {
    return sanitizePathSegment(value, "unknown");
}

function mailboxPathForMessage(record, options = {}) {
    const rootDir = mailboxFeedRootDir(options);
    const ownerSessionId = normalizeMailboxOwnerSessionId(record.ownerSessionId ?? options.ownerSessionId);
    const messageId = sanitizePathSegment(record.id ?? record.messageId, "message");
    return join(rootDir, "mailboxes", ownerSessionId, `${messageId}.json`);
}
function mailboxDirForOwner(ownerSessionId, options = {}) {
    return join(mailboxFeedRootDir(options), "mailboxes", normalizeMailboxOwnerSessionId(ownerSessionId));
}

function channelSegments(channelName) {
    const normalized = normalizeChannelName(channelName);
    return normalized.slice(1).split("/").map((segment) => sanitizePathSegment(segment, "channel"));
}

function feedPathForChannel(channelName, options = {}) {
    const rootDir = mailboxFeedRootDir(options);
    return join(rootDir, "feeds", ...channelSegments(channelName)) + ".jsonl";
}

function atomicWriteJson(path, value) {
    mkdirSync(dirname(path), { recursive: true });
    const tempPath = `${path}.${process.pid}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
    renameSync(tempPath, path);
}

function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    }
    catch {
        return undefined;
    }
}

function readJsonLines(path) {
    if (!existsSync(path))
        return [];
    let content = "";
    try {
        content = readFileSync(path, "utf8");
    }
    catch {
        return [];
    }
    return content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .flatMap((line) => {
            try {
                return [JSON.parse(line)];
            }
            catch {
                return [];
            }
        });
}

function ensureMailboxRecord(record, options = {}) {
    const mailboxPath = record.mailboxPath ?? mailboxPathForMessage(record, options);
    const ownerSessionId = normalizeMailboxOwnerSessionId(record.ownerSessionId ?? options.ownerSessionId);
    const now = options.now?.() ?? nowIso();
    return {
        ...record,
        id: sanitizePathSegment(record.id ?? record.messageId, "message"),
        ownerSessionId,
        state: record.state ?? "queued",
        createdAt: record.createdAt ?? now,
        updatedAt: record.updatedAt ?? now,
        queuedAt: record.queuedAt ?? record.createdAt ?? now,
        ...(record.deliveredAt !== undefined ? { deliveredAt: record.deliveredAt } : {}),
        ...(record.readAt !== undefined ? { readAt: record.readAt } : {}),
        ...(record.acknowledgedAt !== undefined ? { acknowledgedAt: record.acknowledgedAt } : {}),
        ...(record.redeliveredAt !== undefined ? { redeliveredAt: record.redeliveredAt } : {}),
        mailboxPath,
    };
}

function writeMailboxRecord(record, options = {}) {
    const next = ensureMailboxRecord(record, options);
    atomicWriteJson(next.mailboxPath, next);
    return next;
}

function loadMailboxRecord(record, options = {}) {
    const mailboxPath = record.mailboxPath ?? mailboxPathForMessage(record, options);
    const latest = readJson(mailboxPath);
    return latest ? { ...latest, mailboxPath } : ensureMailboxRecord(record, { ...options, rootDir: options.rootDir ?? mailboxFeedRootDir(options) });
}

function mailboxOwnerMatches(record, options = {}) {
    const expected = options.ownerSessionId;
    if (!expected)
        return true;
    return normalizeMailboxOwnerSessionId(expected) === normalizeMailboxOwnerSessionId(record.ownerSessionId);
}

function setMailboxState(record, state, atField, atValue, options = {}) {
    const latest = loadMailboxRecord(record, options);
    if (!mailboxOwnerMatches(latest, options))
        return latest;
    if (latest.state === "acknowledged" && state !== "acknowledged")
        return latest;
    const updatedAt = atValue ?? options.now?.() ?? nowIso();
    const next = {
        ...latest,
        state,
        updatedAt,
        [atField]: updatedAt,
    };
    if (state === "delivered" && latest.deliveredAt) {
        next.redeliveredAt = updatedAt;
    }
    if (state === "delivered" && latest.state === "read" && latest.readAt && !latest.acknowledgedAt) {
        next.redeliveredAt = updatedAt;
    }
    return writeMailboxRecord(next, options);
}

export function normalizeChannelName(value, fallback = "#session") {
    const text = String(value ?? "").trim();
    if (!text)
        return fallback;
    const raw = text.startsWith("#") ? text.slice(1) : text;
    const segments = raw
        .split("/")
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment) => sanitizePathSegment(segment, "channel"));
    if (!segments.length)
        return fallback;
    return `#${segments.join("/")}`;
}

export function createMailboxMessage(message = {}, options = {}) {
    const now = options.now?.() ?? nowIso();
    const base = ensureMailboxRecord({
        ...message,
        state: "queued",
        createdAt: message.createdAt ?? now,
        updatedAt: now,
        queuedAt: message.queuedAt ?? now,
        deliveredAt: undefined,
        readAt: undefined,
        acknowledgedAt: undefined,
        redeliveredAt: undefined,
    }, options);
    return writeMailboxRecord(base, options);
}

export function markMailboxDelivered(message = {}, deliveredAt = nowIso(), options = {}) {
    return setMailboxState(message, "delivered", "deliveredAt", deliveredAt, options);
}

export function markMailboxRead(message = {}, readAt = nowIso(), options = {}) {
    return setMailboxState(message, "read", "readAt", readAt, options);
}

export function markMailboxAcknowledged(message = {}, acknowledgedAt = nowIso(), options = {}) {
    return setMailboxState(message, "acknowledged", "acknowledgedAt", acknowledgedAt, options);
}
export function readMailboxMessage(message = {}, options = {}) {
    return loadMailboxRecord(message, options);
}
export function listMailboxMessages(options = {}) {
    const ownerSessionId = normalizeMailboxOwnerSessionId(options.ownerSessionId);
    const dir = mailboxDirForOwner(ownerSessionId, options);
    let records = [];
    try {
        records = readdirSync(dir)
            .filter((name) => name.endsWith(".json"))
            .map((name) => readJson(join(dir, name)))
            .filter(Boolean);
    }
    catch {
        return [];
    }
    const state = typeof options.state === "string" ? options.state : undefined;
    records = records.filter((record) => !state || record.state === state);
    records.sort((a, b) => String(b.updatedAt ?? b.createdAt ?? "").localeCompare(String(a.updatedAt ?? a.createdAt ?? "")));
    const limit = Number.isFinite(options.limit) && options.limit > 0 ? Math.min(Math.floor(options.limit), 100) : 20;
    return records.slice(0, limit);
}

export function shouldRedeliver(message = {}, options = {}) {
    const latest = loadMailboxRecord(message, options);
    if (!mailboxOwnerMatches(latest, options))
        return false;
    if (latest.state === "acknowledged" || latest.acknowledgedAt)
        return false;
    return latest.state === "delivered" || latest.state === "read";
}

export function appendFeedEvent(channelName, event = {}, options = {}) {
    const normalizedChannelName = normalizeChannelName(channelName);
    const feedPath = feedPathForChannel(normalizedChannelName, options);
    const at = event.at ?? options.at ?? options.now?.() ?? nowIso();
    const record = {
        ...event,
        channelName: normalizedChannelName,
        at,
    };
    mkdirSync(dirname(feedPath), { recursive: true });
    appendFileSync(feedPath, `${JSON.stringify(record)}\n`);
    return {
        ...record,
        feedPath,
    };
}

export function readFeedEvents(channelName, options = {}) {
    const normalizedChannelName = normalizeChannelName(channelName);
    const feedPath = feedPathForChannel(normalizedChannelName, options);
    return readJsonLines(feedPath).map((event) => ({
        ...event,
        channelName: normalizeChannelName(event.channelName ?? normalizedChannelName),
    }));
}
