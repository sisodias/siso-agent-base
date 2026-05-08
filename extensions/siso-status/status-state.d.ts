export interface SisoStatusState {
    route: string;
    model: string;
    promptChars: number;
    responseChars: number;
    toolChars: number;
    toolCalls: number;
    requestChars: number;
    inputTextChars: number;
    toolSchemaChars: number;
    toolSchemaCount: number;
    historyItems: number;
    inputBreakdown: InputBreakdown;
    lastTool: string | null;
    currentSkill: string | null;
    lastPrompt: string | null;
    runStartedAt: string | null;
    activity: ActivityEvent[];
}
export type ActivityKind = "turn" | "model" | "tool" | "skill" | "child" | "council" | "workflow" | "task" | "repo";
export type ActivityPhase = "start" | "update" | "end" | "error";
export interface ActivityEvent {
    ts: string;
    kind: ActivityKind;
    phase: ActivityPhase;
    label: string;
    detail?: string;
    id?: string;
    full?: string;
}
export interface InputTextBlock {
    path: string;
    category: string;
    chars: number;
    preview: string;
}
export interface InputBreakdown {
    totalChars: number;
    categories: Record<string, number>;
    topBlocks: InputTextBlock[];
}
export interface RouterTokenUsage {
    input: number;
    output: number;
    totalTokens: number;
}
export interface RouterCompactChildResult {
    summary: string;
    findings: string[];
    files: string[];
    next_action: string;
}
export interface RouterChildSnapshot {
    id: string;
    status: string;
    profile: string;
    lane: string;
    model: string;
    startedAt?: string;
    updatedAt?: string;
    pid?: number;
    exitCode?: number | null;
    durationMs?: number;
    tokens?: RouterTokenUsage;
    toolCalls?: number;
    compactResult?: RouterCompactChildResult;
    error?: string;
    runRecordPath?: string;
}
export interface RouterStatusSnapshot {
    profile?: string;
    lane?: string;
    model?: string;
    tokens?: RouterTokenUsage;
    child?: RouterChildSnapshot;
    children?: Record<string, RouterChildSnapshot>;
    updatedAt: string;
}
export interface PiEventPayload {
    [key: string]: unknown;
}
declare global {
    var __SISO_ROUTER_STATUS__: RouterStatusSnapshot | undefined;
    var __SISO_ACTIVITY__: ActivityEvent[] | undefined;
}
export declare function createStatusState(): SisoStatusState;
export declare function toText(state: SisoStatusState): string;
export declare function toStatusLine(state: SisoStatusState): string;
export declare function toAgentWidgetLines(state: SisoStatusState): string[];
export declare function toWidgetLines(state: SisoStatusState): string[];
export declare function pushActivity(state: SisoStatusState, event: Omit<ActivityEvent, "ts"> & {
    ts?: string;
}): void;
export declare function formatActivityLine(event: ActivityEvent): string;
export declare function toActivityLines(state: SisoStatusState, limit?: number): string[];
export declare function agentDotGrid(children: RouterChildSnapshot[]): string;
export declare function getRouterSnapshot(): RouterStatusSnapshot | undefined;
export declare function summarizeProviderPayload(payload: unknown): Pick<SisoStatusState, "requestChars" | "inputTextChars" | "toolSchemaChars" | "toolSchemaCount" | "historyItems" | "inputBreakdown">;
export declare function summarizeInputBreakdown(payload: unknown): InputBreakdown;
export declare function applyEvent(state: SisoStatusState, eventType: string, payload?: PiEventPayload): void;
