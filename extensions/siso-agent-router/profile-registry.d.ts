export type ModelId = "claude-haiku-4-5-20251001" | "gpt-5.4-mini" | "claude-sonnet-4-6" | "claude-opus-4-7" | "codex";
export type ModelLane = "minimax" | "gpt54mini" | "spark" | "gpt55" | "codex";
export type ProfileRole = "scout" | "worker" | "verifier" | "reviewer" | "planner" | "oracle" | "rescue";
export type ContextTier = "none" | "topology" | "agents" | "library" | "project" | "full";
export type StatePolicy = "stateless" | "task-state" | "sprint-worktree" | "advisory";
export type PermissionProfile = "plan" | "ask" | "accept_edits" | "deny_by_default" | "lab_bypass";
export interface AgentProfile {
    id: string;
    lane: ModelLane;
    role: ProfileRole;
    model: ModelId;
    tools: string[];
    defaultContext: ContextTier;
    statePolicy: StatePolicy;
    permissionProfile: PermissionProfile;
    maxParallelAgents: number;
    purpose: string;
}
export declare const PROFILE_REGISTRY: Record<string, AgentProfile>;
export declare function getProfile(id: string): AgentProfile;
