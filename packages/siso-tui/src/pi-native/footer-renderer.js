import { modelHelpersSource } from "./model-helpers.js";

export const footerHelpersSource = `${modelHelpersSource}function sanitizeStatusText(text) {
    return String(text ?? "")
        .split(/\\s+/g)
        .join(" ")
        .trim();
}
`;

export const cleanFooterBlockSource = [
  "        // Build clean SISO footer: context left, live activity middle, model right.",
  "        const sisoLiveContextKnown = contextUsage?.tokens !== null && contextUsage?.tokens !== undefined;",
  "        const sisoContextTokens = sisoLiveContextKnown ? contextUsage.tokens : 0;",
  "        const sisoContextPercentValue = sisoLiveContextKnown && typeof contextUsage?.percent === \"number\" ? Math.round(contextUsage.percent) : null;",
  "        const contextPercentLabel = sisoContextPercentValue === null ? \"?\" : `${sisoContextPercentValue}%`;",
  "        const contextTokenLabel = sisoLiveContextKnown ? formatTokens(sisoContextTokens) : \"?\";",
  "        const contextWidth = Math.max(8, Math.min(28, Math.floor(width * 0.22)));",
  "        const filled = sisoContextPercentValue === null ? 0 : Math.max(0, Math.min(contextWidth, Math.round((sisoContextPercentValue / 100) * contextWidth)));",
  "        const empty = Math.max(0, contextWidth - filled);",
  "        const barColor = sisoContextPercentValue === null ? \"muted\" : sisoContextPercentValue > 90 ? \"error\" : sisoContextPercentValue > 70 ? \"warning\" : \"accent\";",
  "        const contextBar = `${theme.fg(barColor, \"█\".repeat(filled))}${theme.fg(\"dim\", \"░\".repeat(empty))}`;",
  "        const contextText = `${contextBar} ${theme.fg(barColor, contextPercentLabel)} ${theme.fg(\"dim\", contextTokenLabel)}`;",
  "        const extensionStatuses = this.footerData.getExtensionStatuses();",
  "        let calls = 0;",
  "        let activeAgents = 0;",
  "        let subAgents = 0;",
  "        for (const [key, rawValue] of extensionStatuses.entries()) {",
  "            const value = sanitizeStatusText(String(rawValue ?? \"\")).toLowerCase();",
  "            const combined = `${String(key).toLowerCase()} ${value}`;",
  "            const nums = [...combined.matchAll(/(calls?|tools?|sub-?agents?|agents?|active|running)[:= ]+(\\d+)/g)];",
  "            const reversedNums = [...combined.matchAll(/(\\d+)\\s+(calls?|tools?|sub-?agents?|agents?|active|running)/g)];",
  "            for (const match of reversedNums) nums.push([match[0], match[2], match[1]]);",
  "            for (const match of nums) {",
  "                const label = match[1];",
  "                const n = Number(match[2]);",
  "                if (!Number.isFinite(n)) continue;",
  "                if (label.includes(\"call\") || label.includes(\"tool\")) calls = Math.max(calls, n);",
  "                else if (label.includes(\"sub\")) subAgents = Math.max(subAgents, n);",
  "                else if (label.includes(\"active\") || label.includes(\"running\")) activeAgents = Math.max(activeAgents, n);",
  "                else if (label.includes(\"agent\")) subAgents = Math.max(subAgents, n);",
  "            }",
  "            if (/active|running|spawn|agent/.test(combined) && !nums.length) activeAgents += 1;",
  "        }",
  "        const activityParts = [];",
  "        activityParts.push(`${theme.fg(\"muted\", \"calls\")} ${theme.fg(calls ? \"accent\" : \"dim\", String(calls))}`);",
  "        activityParts.push(`${theme.fg(\"muted\", \"sub\")} ${theme.fg(subAgents ? \"accent\" : \"dim\", String(subAgents))}`);",
  "        activityParts.push(`${theme.fg(\"muted\", \"active\")} ${theme.fg(activeAgents ? \"success\" : \"dim\", String(activeAgents))}`);",
  "        const activityText = activityParts.join(theme.fg(\"dim\", \"  ·  \"));",
  "        const modelText = theme.fg(\"accent\", sisoDisplayModel(state.model?.id || \"no-model\"));",
  "        const left = `${contextText}  ${theme.fg(\"dim\", \"│\")}  ${activityText}`;",
  "        const leftWidth = visibleWidth(left);",
  "        const modelWidth = visibleWidth(modelText);",
  "        let footerLine;",
  "        if (leftWidth + modelWidth + 2 <= width) {",
  "            footerLine = left + \" \".repeat(width - leftWidth - modelWidth) + modelText;",
  "        }",
  "        else {",
  "            const availableLeft = Math.max(0, width - modelWidth - 2);",
  "            footerLine = `${truncateToWidth(left, availableLeft, theme.fg(\"dim\", \"…\"))}  ${modelText}`;",
  "        }",
  "        const lines = [footerLine];",
].join("\n");
