export type ChildGuardMatchKind = "siso-orchestration" | "tmux-team-orchestration" | "child-resume";
export type ChildGuardMatch = {
    kind: ChildGuardMatchKind;
    value: string;
};
export type ChildGuardDecision = {
    allowed: boolean;
    reason?: string;
    matches: ChildGuardMatch[];
};
type ChildGuardInput = {
    toolName?: string;
    params?: Record<string, unknown>;
    prompt?: string;
    env?: Record<string, string | undefined>;
};
export declare function isPiSubagentChild(env?: Record<string, string | undefined>): boolean;
export declare function evaluatePiChildGuardrail(input: ChildGuardInput): ChildGuardDecision;
export {};
