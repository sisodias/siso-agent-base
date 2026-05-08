const PATH_KEYS = ["path", "file", "filePath", "filepath", "file_path", "targetPath", "target_path"];
export function formatToolDisplay(toolName, input, width = 96) {
    const params = normaliseInput(input);
    const full = stableJson(params);
    const name = friendlyToolName(toolName);
    const display = truncate(`${name}${formatToolSuffix(toolName, params)}`, width);
    return { display, full };
}
function normaliseInput(input) {
    if (typeof input === "string") {
        try {
            const parsed = JSON.parse(input);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : { value: input };
        }
        catch {
            return { value: input };
        }
    }
    return input && typeof input === "object" && !Array.isArray(input) ? input : {};
}
function friendlyToolName(toolName) {
    const lower = toolName.toLowerCase();
    if (lower === "bash")
        return "bash";
    if (lower === "read")
        return "read";
    if (lower === "write")
        return "write";
    if (lower === "edit")
        return "edit";
    if (lower === "ls")
        return "ls";
    if (lower === "find")
        return "find";
    if (lower.includes("spawn"))
        return "spawn";
    return lower.replace(/^siso_/, "siso ");
}
function formatToolSuffix(toolName, params) {
    const lower = toolName.toLowerCase();
    if (lower === "bash")
        return params.command ? ` ${singleLine(String(params.command))}` : "";
    if (lower === "read" || lower === "write")
        return pathSuffix(params);
    if (lower === "edit") {
        const path = pathValue(params);
        const oldText = typeof params.old_string === "string" ? params.old_string : typeof params.oldText === "string" ? params.oldText : "";
        const newText = typeof params.new_string === "string" ? params.new_string : typeof params.newText === "string" ? params.newText : "";
        const lineDelta = countLines(newText) - countLines(oldText);
        return `${path ? ` ${shortPath(path)}` : ""}${oldText || newText ? ` (${lineDelta >= 0 ? "+" : ""}${lineDelta} lines)` : ""}`;
    }
    if (lower === "ls" || lower === "find")
        return pathSuffix(params);
    if (lower.includes("spawn")) {
        const task = typeof params.task === "string" ? params.task : typeof params.prompt === "string" ? params.prompt : "";
        return task ? ` ${singleLine(task)}` : "";
    }
    const path = pathValue(params);
    if (path)
        return ` ${shortPath(path)}`;
    const first = Object.entries(params).find(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean");
    return first ? ` ${first[0]}=${singleLine(String(first[1]))}` : "";
}
function pathSuffix(params) {
    const path = pathValue(params);
    return path ? ` ${shortPath(path)}` : "";
}
function pathValue(params) {
    for (const key of PATH_KEYS) {
        const value = params[key];
        if (typeof value === "string" && value.trim())
            return value;
    }
    return undefined;
}
function shortPath(path) {
    const compact = path.replaceAll("\\", "/");
    const parts = compact.split("/").filter(Boolean);
    return parts.length <= 3 ? compact : `…/${parts.slice(-3).join("/")}`;
}
function countLines(value) {
    return value ? value.split(/\r?\n/).length : 0;
}
function singleLine(value) {
    return value.replace(/\s+/g, " ").trim();
}
function truncate(value, width) {
    return value.length > width ? `${value.slice(0, Math.max(1, width - 1))}…` : value;
}
function stableJson(value) {
    const sorted = Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    return JSON.stringify(sorted);
}
