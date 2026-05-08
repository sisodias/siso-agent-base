import { type ModelId, type ModelLane, type ProfileRole } from "./profile-registry.js";
import { type CompactChildResult, type SpawnRunResult, type TokenUsage } from "./spawn-layer.js";
import type { RouteDecision } from "./route-policy.js";
import type { SisoAgentEvent } from "./agent-events.js";
export type CouncilMode = "compare" | "synthesize" | "review";
export interface CouncilOptions {
    mode?: CouncilMode;
    members?: string[];
    cwd?: string;
    rubric?: string;
    timeoutMs?: number;
    dryRun?: boolean;
    maxMembers?: number;
    noTools?: boolean;
}
export interface CouncilMemberResult {
    profile: string;
    lane: ModelLane;
    model: ModelId;
    role: ProfileRole;
    status: SpawnRunResult["status"];
    childId: string;
    tokens: TokenUsage;
    result: CompactChildResult;
    recordPath?: string;
    events?: SisoAgentEvent[];
}
export interface CouncilRunResult {
    mode: CouncilMode;
    task: string;
    status: "planned" | "completed" | "partial" | "failed";
    members: CouncilMemberResult[];
    synthesis: CompactChildResult;
    totalTokens: number;
    events: SisoAgentEvent[];
}
export declare function decisionForProfile(profileId: string, rationale?: string): RouteDecision;
export declare function runCouncil(task: string, options?: CouncilOptions, signal?: AbortSignal): Promise<CouncilRunResult>;
export declare function formatCouncilResult(result: CouncilRunResult): string;
