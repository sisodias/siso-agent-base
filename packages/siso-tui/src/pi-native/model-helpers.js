export const modelHelpersSource = `function sisoDisplayModel(id, provider, mode) {
    const labelMap = {
        "claude-opus-4-7": "Oracle GPT-5.5",
        "claude-sonnet-4-6": "Spark",
        "claude-haiku-4-5-20251001": "MiniMax M2.7",
        "gpt-5.4-mini": "GPT-5.4 Mini",
        "gpt-5.5": "Oracle GPT-5.5",
        "gpt-5.3-codex-spark": "Spark",
        "MiniMax-M2.7-highspeed": "MiniMax M2.7",
    };
    const metaMap = {
        "claude-opus-4-7": { group: "SISO", hint: "deep reasoning" },
        "gpt-5.5": { group: "SISO", hint: "deep reasoning" },
        "claude-sonnet-4-6": { group: "SISO", hint: "fast coding" },
        "gpt-5.3-codex-spark": { group: "SISO", hint: "fast coding" },
        "claude-haiku-4-5-20251001": { group: "SISO", hint: "quick side tasks" },
        "MiniMax-M2.7-highspeed": { group: "SISO", hint: "quick side tasks" },
        "gpt-5.4-mini": { group: "SISO", hint: "compact reasoning" },
    };
    const cleanId = String(id ?? "no-model").replace(/-202\\d{5,8}$/, "");
    const providerText = String(provider ?? "").trim();
    const providerGroupMap = {
        anthropic: "Anthropic",
        openai: "OpenAI",
        google: "Google",
        groq: "Groq",
        cerebras: "Cerebras",
        bifrost: "SISO",
        siso: "SISO",
    };
    const providerGroup = providerGroupMap[providerText.toLowerCase()] ?? (providerText ? providerText : "Model");
    const meta = {
        label: labelMap[id] ?? cleanId,
        group: metaMap[id]?.group ?? providerGroup,
        hint: metaMap[id]?.hint ?? "available",
    };
    if (mode === "group") return meta.group;
    if (mode === "annotation") return meta.group + " · " + meta.hint;
    return meta.label;
}
`;
