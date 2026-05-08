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
    return [
        "SISO Bifrost dashboard",
        `requests=${totalRequests} siso_rows=${sisoRows.length}`,
        `avg_body_chars=${Math.round(avgBody)} avg_tool_chars=${Math.round(avgTools)} avg_text_chars=${Math.round(avgText)}`,
        `models=${formatCounts(models)}`,
        `sections=${formatCategories(sections)}`,
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
function formatLatestSiso(entries) {
    const latest = entries.at(-1);
    return latest ? formatSisoTelemetry(latest) : "none";
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
