import { type ContextTier, type ModelId, type ModelLane, type PermissionProfile, type StatePolicy } from "./profile-registry.js";
export type RouteKind = "scout" | "worker" | "verifier" | "reviewer" | "planner" | "oracle" | "rescue" | "codex";
export interface RouteDecision {
    kind: RouteKind;
    profile: string;
    lane: ModelLane;
    model: ModelId;
    tools: string[];
    contextTier: ContextTier;
    statePolicy: StatePolicy;
    permissionProfile: PermissionProfile;
    inheritContext: boolean;
    needsWorktree: boolean;
    maxParallelAgents: number;
    rationale: string;
}
export declare function chooseRoute(task: string): RouteDecision;
export declare function formatDecision(_task: string, decision: RouteDecision): string;
