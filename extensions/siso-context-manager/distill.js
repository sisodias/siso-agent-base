import { appendProjectMemory, newId } from "./store.js";
function eventText(event) {
    return [event.toolName, event.text].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
function unique(values) {
    return [...new Set(values)];
}
function item(runId, cwd, category, text, sourceIds, importance = 0.5, confidence = 0.75) {
    return {
        id: newId("mem"),
        runId,
        ts: new Date().toISOString(),
        cwd,
        scope: shouldPromote(category, text, importance) ? "project" : "agent",
        category,
        text: text.slice(0, 1200),
        importance,
        confidence,
        sourceIds,
        ...(shouldPromote(category, text, importance) ? { promoted: true } : {}),
    };
}
function shouldPromote(category, text, importance) {
    if (importance >= 0.85 && ["decision", "preference", "fact", "error"].includes(category))
        return true;
    return /\b(always|never|prefer|decision|decided|root cause|fix was|convention|gotcha)\b/i.test(text) && category !== "summary";
}
export function deterministicDistill(events, options = {}) {
    const maxItems = options.maxItems ?? 24;
    const sourceIds = events.map((event) => event.id);
    const runId = events[0]?.runId ?? "unknown";
    const cwd = events[0]?.cwd ?? process.cwd();
    const inputTokens = events.reduce((sum, event) => sum + event.estimatedTokens, 0);
    const texts = events.map(eventText).filter(Boolean);
    const toolEvents = events.filter((event) => event.kind === "tool_call" || event.kind === "tool_result");
    const files = unique(texts.flatMap((text) => [...text.matchAll(/(?:^|\s)([\w./-]+\.(?:ts|tsx|js|jsx|mjs|json|md|py|rs|go|sh|yml|yaml|sql))(?:\s|$|:)/g)].map((match) => match[1] ?? ""))).filter(Boolean);
    const commands = unique(toolEvents.map((event) => event.text ?? "").filter((text) => /\b(npm|pnpm|yarn|node|pytest|vitest|tsc|rg|git|bash|make)\b/.test(text)).slice(-8));
    const errors = texts.filter((text) => /\b(error|failed|fail|exception|traceback|timeout|denied|not found|exit \d+)\b/i.test(text)).slice(-8);
    const decisions = texts.filter((text) => /\b(decid(?:e|ed)|use |chosen|root cause|fix(?:ed)? by|implemented|changed|prefer|never|always)\b/i.test(text)).slice(-8);
    const openQuestions = texts.filter((text) => /\?|\b(blocked|todo|next|remaining|need to|follow up)\b/i.test(text)).slice(-8);
    const summaries = texts.slice(-8).join(" ").slice(0, 1500);
    const items = [];
    if (summaries)
        items.push(item(runId, cwd, "summary", `Run chunk summary: ${summaries}`, sourceIds, 0.55, 0.65));
    for (const file of files.slice(0, 12))
        items.push(item(runId, cwd, "file", `Touched/referenced file: ${file}`, sourceIds, 0.6, 0.8));
    for (const command of commands)
        items.push(item(runId, cwd, "command", `Command/tool signal: ${command.slice(0, 500)}`, sourceIds, 0.55, 0.7));
    for (const error of errors)
        items.push(item(runId, cwd, "error", `Error/failure signal: ${error.slice(0, 700)}`, sourceIds, 0.82, 0.72));
    for (const decision of decisions)
        items.push(item(runId, cwd, "decision", `Decision/fact candidate: ${decision.slice(0, 700)}`, sourceIds, 0.86, 0.68));
    for (const question of openQuestions)
        items.push(item(runId, cwd, "open_question", `Open question/next action candidate: ${question.slice(0, 700)}`, sourceIds, 0.72, 0.65));
    const deduped = dedupeItems(items).slice(0, maxItems);
    return { runId, sourceIds, inputTokens, items: deduped, summary: deduped.find((entry) => entry.category === "summary")?.text ?? "No useful memory extracted." };
}
export function dedupeItems(items) {
    const seen = new Set();
    const result = [];
    for (const item of items) {
        const key = `${item.category}:${item.text.toLowerCase().replace(/\W+/g, " ").slice(0, 160)}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(item);
    }
    return result;
}
export function promoteProjectMemories(items, root) {
    const promoted = items.filter((entry) => entry.promoted || entry.scope === "project");
    appendProjectMemory(promoted, root);
    return promoted;
}
function normalizeScore(value, fallback) {
    if (typeof value === "number")
        return Math.max(0, Math.min(1, value > 1 ? value / 5 : value));
    const text = String(value ?? "").toLowerCase();
    if (text === "high")
        return 0.9;
    if (text === "medium")
        return 0.65;
    if (text === "low")
        return 0.35;
    return fallback;
}
function normalizeCategory(category) {
    const normalized = category.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const aliases = {
        requirements: "preference",
        requirement: "preference",
        system_design: "working_rule",
        agent_role: "working_rule",
        policy: "working_rule",
        data_handling: "working_rule",
        design: "working_rule",
        architecture: "working_rule",
        rule: "working_rule",
        routing: "routing_rule",
        skill: "skill_rule",
        task: "task_context",
        project: "project_context",
        pointer: "retrieval_pointer",
        retrieval: "retrieval_pointer",
    };
    const known = new Set(["summary", "decision", "preference", "fact", "error", "file", "command", "open_question", "next_action", "project_context", "task_context", "working_rule", "routing_rule", "skill_rule", "retrieval_pointer"]);
    return aliases[normalized] ?? (known.has(normalized) ? normalized : "fact");
}
export async function minimaxDistill(events, options = {}) {
    const endpoint = options.endpoint ?? process.env.SISO_CONTEXT_MINIMAX_ENDPOINT ?? `${process.env.SISO_GATEWAY_BASE ?? "https://shaans-mac-mini.tail100d11.ts.net:8443"}/anthropic/v1/messages`;
    const apiKey = options.apiKey ?? process.env.SISO_CONTEXT_MINIMAX_API_KEY ?? process.env.SISO_BIFROST_KEY ?? "";
    const model = options.model ?? process.env.SISO_CONTEXT_MINIMAX_MODEL ?? "claude-haiku-4-5-20251001";
    if (process.env.SISO_CONTEXT_SEMANTIC_LIBRARIAN === "0")
        return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
    try {
        const compact = events.map((event) => ({ id: event.id, kind: event.kind, tool: event.toolName, text: eventText(event).slice(0, 1200) })).slice(-40);
        const response = await fetch(endpoint, {
            method: "POST",
            signal: controller.signal,
            headers: { "content-type": "application/json", "x-api-key": apiKey, authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                thinking: { type: "disabled" },
                max_tokens: 3000,
                messages: [{ role: "user", content: `Extract compact coding-agent memory from these events. Return JSON with items [{category,text,importance,confidence,scope}]. Categories: summary,decision,preference,fact,error,file,command,open_question,next_action,project_context,task_context,working_rule,routing_rule,skill_rule,retrieval_pointer. Extract current task, overall goal, project context, user criteria, system/developer working rules, subagent routing rules, skill usage rules, contradictions/corrections, and Codex case-packet facts. Promote only reusable cross-agent facts with scope=project. Events: ${JSON.stringify(compact)}` }],
            }),
        });
        if (!response.ok)
            return undefined;
        const json = await response.json();
        const text = json.content?.map((part) => part.text ?? "").join("") ?? "";
        const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
        const arrayMatch = trimmed.startsWith("[") ? trimmed.match(/\[[\s\S]*\]/)?.[0] : undefined;
        const objectMatch = trimmed.match(/\{[\s\S]*\}/)?.[0];
        const jsonText = arrayMatch ? `{ "items": ${arrayMatch} }` : objectMatch ?? trimmed;
        const parsedRaw = JSON.parse(jsonText);
        const parsed = Array.isArray(parsedRaw) ? { items: parsedRaw } : parsedRaw;
        const base = deterministicDistill(events, { maxItems: 4 });
        const items = (parsed.items ?? []).filter((entry) => typeof entry.text === "string" && typeof entry.category === "string").map((entry) => {
            const scope = entry.scope === "project" ? "project" : "agent";
            return {
                id: newId("mem"),
                runId: base.runId,
                ts: new Date().toISOString(),
                cwd: events[0]?.cwd ?? process.cwd(),
                scope,
                category: normalizeCategory(String(entry.category)),
                text: String(entry.text).slice(0, 1200),
                importance: normalizeScore(entry.importance, 0.7),
                confidence: normalizeScore(entry.confidence, 0.7),
                sourceIds: base.sourceIds,
                ...(scope === "project" ? { promoted: true } : {}),
            };
        }).slice(0, 24);
        if (items.length === 0)
            return undefined;
        return { ...base, items, summary: items.find((item) => item.category === "summary")?.text ?? base.summary };
    }
    catch {
        return undefined;
    }
    finally {
        clearTimeout(timeout);
    }
}
