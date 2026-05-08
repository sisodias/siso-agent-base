import type { ModelId, PermissionProfile } from "./profile-registry.js";
export type AgentRunSurface = "foreground" | "child" | "council" | "workflow" | "occ-reference";
export type AgentRunStatus = "planned" | "background" | "completed" | "failed" | "timeout" | "aborted" | "unsupported";
export type SisoAgentEvent = {
    type: "run_started";
    runId: string;
    surface: AgentRunSurface;
    timestamp: string;
    profile?: string;
    model?: ModelId | string;
    permissionProfile?: PermissionProfile;
} | {
    type: "model_request";
    runId: string;
    surface: AgentRunSurface;
    timestamp: string;
    model: ModelId | string;
    messageCount?: number;
    toolCount?: number;
    promptTokens?: number;
} | {
    type: "assistant_message";
    runId: string;
    surface: AgentRunSurface;
    timestamp: string;
    text: string;
} | {
    type: "tool_call";
    runId: string;
    surface: AgentRunSurface;
    timestamp: string;
    toolName: string;
    toolCallId?: string;
    input?: Record<string, unknown>;
} | {
    type: "tool_result";
    runId: string;
    surface: AgentRunSurface;
    timestamp: string;
    toolName: string;
    toolCallId?: string;
    ok: boolean;
    summary?: string;
} | {
    type: "permission_check";
    runId: string;
    surface: AgentRunSurface;
    timestamp: string;
    mode: PermissionProfile;
    action: string;
    allowed: boolean;
    reason?: string;
} | {
    type: "run_finished";
    runId: string;
    surface: AgentRunSurface;
    timestamp: string;
    status: AgentRunStatus;
    totalTokens?: number;
};
export type UnstampedAgentEvent = SisoAgentEvent extends infer Event ? Event extends unknown ? Omit<Event, "timestamp"> : never : never;
export declare function createAgentEvent<T extends UnstampedAgentEvent>(event: T, now?: () => Date): T & {
    timestamp: string;
};
export declare function formatAgentEvent(event: SisoAgentEvent): string;
