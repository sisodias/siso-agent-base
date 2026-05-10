import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
const DEFAULT_METRICS_PATH = join(homedir(), ".config", "bifrost", "tool-schema-metrics.jsonl");
export function parseMetricsJsonl(text) {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    })
        .filter((entry) => Boolean(entry));
}
export function formatMetricsTable(entries, limit = 3) {
    const latest = entries.slice(-limit).reverse();
    if (latest.length === 0)
        return "No Bifrost metric rows found.";
    const lines = ["Bifrost input breakdown", ""];
    for (const entry of latest) {
        lines.push(`time=${entry.timestamp ?? "unknown"} model=${entry.model ?? "unknown"}`);
        lines.push(`body=${entry.body_chars ?? 0} body_without_tools=${entry.body_without_tools_chars ?? 0} tools=${entry.tool_chars ?? 0}/${entry.tool_count ?? 0} text=${entry.text_block_chars ?? 0}`);
        lines.push(`siso=${formatSisoTelemetry(entry)}`);
        lines.push(`sections=${formatCategories(entry.text_categories ?? {})}`);
        lines.push(`top_text=${formatTopText(entry.top_text_blocks ?? [])}`);
        lines.push(`top_tools=${formatTopTools(entry.top_tools ?? [])}`);
        lines.push("");
    }
    return lines.join("\n").trimEnd();
}
export function formatMetricsDashboard(entries, limit = 20) {
    const latest = entries.slice(-limit);
    if (latest.length === 0)
        return "No Bifrost metric rows found.";
    const totalRequests = latest.length;
    const avgBody = average(latest.map((entry) => entry.body_chars ?? 0));
    const avgTools = average(latest.map((entry) => entry.tool_chars ?? 0));
    const avgText = average(latest.map((entry) => entry.text_block_chars ?? 0));
    const models = countBy(latest.map((entry) => entry.model ?? "unknown"));
    const sections = {};
    const sisoRows = latest.filter((entry) => entry.siso && Object.keys(entry.siso).length > 0);
    for (const entry of latest) {
        for (const [name, chars] of Object.entries(entry.text_categories ?? {})) {
            sections[name] = (sections[name] ?? 0) + chars;
        }
    }
    const warningLines = formatDashboardWarnings(latest, sections);
    return [
        "SISO Bifrost dashboard",
        `requests=${totalRequests} siso_rows=${sisoRows.length}`,
        `avg_body_chars=${Math.round(avgBody)} avg_tool_chars=${Math.round(avgTools)} avg_text_chars=${Math.round(avgText)}`,
        `models=${formatCounts(models)}`,
        `sections=${formatCategories(sections)}`,
        `largest_section=${largestSection(sections)}`,
        "Warnings",
        ...warningLines,
        `latest_siso=${formatLatestSiso(sisoRows)}`,
    ].join("\n");
}
function formatSisoTelemetry(entry) {
    const siso = entry.siso;
    if (!siso || Object.keys(siso).length === 0)
        return "none";
    const summary = typeof siso.child_result === "string" ? siso.child_result : siso.child_result?.summary;
    const promptTokenEstimate = Math.ceil((entry.body_without_tools_chars ?? 0) / 4);
    const childTokens = siso.child_tokens_total ?? 0;
    return [
        `profile:${siso.profile ?? "none"}`,
        `lane:${siso.lane ?? "none"}`,
        `route_model:${siso.route_model ?? "none"}`,
        `child:${siso.child_status ?? "none"}`,
        `child_model:${siso.child_model ?? "none"}`,
        `child_tokens:${childTokens}`,
        `delta:${childTokens - promptTokenEstimate}`,
        `result:${(summary ?? "none").replace(/\|/g, "/").slice(0, 80)}`,
    ].join(" ");
}
export async function readLatestMetricsTable(path = DEFAULT_METRICS_PATH, limit = 3) {
    const text = await readFile(path, "utf8");
    return formatMetricsTable(parseMetricsJsonl(text), limit);
}
export async function readLatestMetricsDashboard(path = DEFAULT_METRICS_PATH, limit = 20) {
    const text = await readFile(path, "utf8");
    return formatMetricsDashboard(parseMetricsJsonl(text), limit);
}
export function formatDuplicateRequestReport(entries, limit = 50) {
    const latest = entries.slice(-limit);
    if (latest.length === 0)
        return "No Bifrost metric rows found.";
    const groups = duplicatePromptGroups(latest).slice(0, 5);
    const lines = [
        "SISO Bifrost duplicate request report",
        `rows=${latest.length} duplicate_groups=${groups.length}`,
    ];
    if (groups.length === 0) {
        lines.push("No near-duplicate prompt shapes found in the selected window.");
        return lines.join("\n");
    }
    groups.forEach((group, index) => {
        const firstTime = Date.parse(group.rows[0]?.timestamp ?? "");
        const lastTime = Date.parse(group.rows.at(-1)?.timestamp ?? "");
        const windowSeconds = Number.isFinite(firstTime) && Number.isFinite(lastTime) ? Math.max(0, Math.round((lastTime - firstTime) / 1000)) : 0;
        const body = average(group.rows.map((entry) => entry.body_without_tools_chars ?? entry.body_chars ?? 0));
        const toolChars = average(group.rows.map((entry) => entry.tool_chars ?? 0));
        const model = group.rows[0]?.model ?? "unknown";
        const sections = aggregateSections(group.rows);
        const largest = largestSectionPair(sections);
        const profiles = countBy(group.rows.map((entry) => entry.siso?.profile ?? "none"));
        lines.push(``);
        lines.push(`group ${index + 1} · ${group.rows.length} requests · shape=${shortHash(group.shape)} · window=${windowSeconds}s`);
        lines.push(`model=${model} body≈${formatChars(Math.round(body))} tools≈${formatChars(Math.round(toolChars))} largest=${largest?.[0] ?? "none"}:${largest?.[1] ?? 0}`);
        lines.push(`profiles=${formatCounts(profiles)}`);
        lines.push(`top_text=${formatDuplicateTopText(group.rows, largest?.[0])}`);
        lines.push(`top_tools=${formatDuplicateTopTools(group.rows)}`);
        lines.push(`hint=${duplicateHint(largest?.[0], group.rows)}`);
        lines.push(`times=${group.rows.map((entry) => entry.timestamp ?? "unknown").join(", ")}`);
    });
    return lines.join("\n");
}
export async function readDuplicateRequestReport(path = DEFAULT_METRICS_PATH, limit = 50) {
    const text = await readFile(path, "utf8");
    return formatDuplicateRequestReport(parseMetricsJsonl(text), limit);
}
function average(values) {
    return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}
function countBy(values) {
    const counts = {};
    for (const value of values)
        counts[value] = (counts[value] ?? 0) + 1;
    return counts;
}
function formatCounts(counts) {
    return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => `${name}:${count}`)
        .join(",") || "none";
}
function formatChars(chars) {
    if (chars >= 1_000_000)
        return `${(chars / 1_000_000).toFixed(1)}m`;
    if (chars >= 1000)
        return `${Math.round(chars / 100) / 10}k`;
    return String(chars);
}
function formatDuplicateTopText(rows, preferredCategory) {
    const blocks = rows.flatMap((entry) => entry.top_text_blocks ?? []);
    const preferred = preferredCategory ? blocks.filter((block) => block.category === preferredCategory) : [];
    const pool = preferred.length ? preferred : blocks;
    const block = pool
        .sort((a, b) => (b.chars ?? 0) - (a.chars ?? 0))[0];
    if (!block)
        return "none";
    return `${block.category ?? "unknown"}:${formatChars(block.chars ?? 0)}:${sanitizePreview(block.preview ?? "")}`;
}
function formatDuplicateTopTools(rows) {
    const totals = {};
    for (const entry of rows) {
        for (const tool of entry.top_tools ?? []) {
            const name = tool.name ?? "unknown";
            totals[name] = Math.max(totals[name] ?? 0, tool.chars ?? 0);
        }
    }
    return Object.entries(totals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([name, chars]) => `${name}:${formatChars(chars)}`)
        .join(",") || "none";
}
function duplicateHint(largestSectionName, rows) {
    const tools = new Set(rows.flatMap((entry) => (entry.top_tools ?? []).map((tool) => tool.name)));
    if (largestSectionName === "large_other_text")
        return "Repeated large_other_text; inspect top_text for pasted transcripts, raw file dumps, or repeated child results.";
    if (largestSectionName === "tool_output_history")
        return "Repeated tool output; prefer summaries or siso_context retrieval pointers.";
    if (tools.has("subagent"))
        return "Subagent tool schema/output appears in repeated request shape; inspect child notification and retry flow.";
    return "Inspect timestamps and profile counts for retries, duplicate dispatch, or queued follow-ups.";
}
function sanitizePreview(value) {
    return String(value).replace(/\s+/g, " ").replace(/\|/g, "/").slice(0, 100);
}
function formatLatestSiso(entries) {
    const latest = entries.at(-1);
    return latest ? formatSisoTelemetry(latest) : "none";
}
function formatDashboardWarnings(entries, sections) {
    const warnings = [];
    const burst = requestBurst(entries);
    if (burst) {
        warnings.push(`- request burst: ${burst.count} requests in ${burst.seconds}s; check whether a single user action is producing repeated provider calls.`);
    }
    const duplicate = nearDuplicatePromptShape(entries);
    if (duplicate) {
        warnings.push(`- near-duplicate prompt shape: ${duplicate.count} recent requests share model/body/tool/category shape; inspect for retries or duplicate dispatch.`);
    }
    const largest = largestSectionPair(sections);
    if (largest && largest[0] === "tool_output_history") {
        warnings.push(`- tool output dominates dashboard sections (${largest[1]} chars); context filtering or summaries should be checked.`);
    }
    return warnings.length ? warnings.slice(0, 4) : ["- none"];
}
function requestBurst(entries) {
    const times = entries
        .map((entry) => Date.parse(entry.timestamp ?? ""))
        .filter((time) => Number.isFinite(time))
        .sort((a, b) => a - b);
    if (times.length < 3)
        return undefined;
    const first = times[0];
    const last = times[times.length - 1];
    const seconds = Math.max(0, Math.round((last - first) / 1000));
    return seconds <= 15 ? { count: times.length, seconds } : undefined;
}
function nearDuplicatePromptShape(entries) {
    const duplicate = duplicatePromptGroups(entries)[0]?.rows.length ?? 0;
    return duplicate >= 3 ? { count: duplicate } : undefined;
}
function duplicatePromptGroups(entries) {
    const groups = new Map();
    for (const entry of entries) {
        const shape = promptShape(entry);
        if (!shape)
            continue;
        groups.set(shape, [...(groups.get(shape) ?? []), entry]);
    }
    return [...groups.entries()]
        .map(([shape, rows]) => ({ shape, rows: rows.sort((a, b) => Date.parse(a.timestamp ?? "0") - Date.parse(b.timestamp ?? "0")) }))
        .filter((group) => group.rows.length >= 3)
        .sort((a, b) => b.rows.length - a.rows.length);
}
function promptShape(entry) {
    const categories = Object.entries(entry.text_categories ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, chars]) => `${name}:${bucket(chars, 5000)}`)
        .join(",");
    const tools = (entry.top_tools ?? [])
        .slice(0, 4)
        .map((tool) => `${tool.name ?? "unknown"}:${bucket(tool.chars ?? 0, 1000)}`)
        .join(",");
    return [
        entry.model ?? "unknown",
        bucket(entry.body_without_tools_chars ?? entry.body_chars ?? 0, 5000),
        bucket(entry.tool_chars ?? 0, 1000),
        entry.tool_count ?? 0,
        categories,
        tools,
    ].join("|");
}
function bucket(value, size) {
    return Math.round(Number(value ?? 0) / size) * size;
}
function shortHash(value) {
    let hash = 5381;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
    }
    return (hash >>> 0).toString(36).padStart(8, "0").slice(0, 8);
}
function largestSection(sections) {
    const pair = largestSectionPair(sections);
    return pair ? `${pair[0]}:${pair[1]}` : "none";
}
function largestSectionPair(sections) {
    return Object.entries(sections).sort(([, a], [, b]) => b - a)[0];
}
function aggregateSections(entries) {
    const sections = {};
    for (const entry of entries) {
        for (const [name, chars] of Object.entries(entry.text_categories ?? {})) {
            sections[name] = (sections[name] ?? 0) + chars;
        }
    }
    return sections;
}
function formatCategories(categories) {
    return Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, chars]) => `${name}:${chars}`)
        .join(",") || "none";
}
function formatTopText(blocks) {
    return blocks
        .slice(0, 5)
        .map((block) => `${block.category ?? "unknown"}:${block.chars ?? 0}:${(block.preview ?? "").replace(/\|/g, "/").slice(0, 80)}`)
        .join(" | ") || "none";
}
function formatTopTools(tools) {
    return tools
        .slice(0, 8)
        .map((tool) => `${tool.name ?? "unknown"}:${tool.chars ?? 0}`)
        .join(",") || "none";
}
