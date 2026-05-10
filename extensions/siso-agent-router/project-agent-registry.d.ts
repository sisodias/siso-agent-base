export type ToolAclInput = string | string[] | {
    allow?: string | string[];
    deny?: string | string[];
    all?: boolean;
};
export interface ToolAclPolicy {
    allow: string[];
    deny: string[];
    all: boolean;
}
export type AgentScope = "project" | "user";
export interface ProjectAgentDefinition {
    id: string;
    name: string;
    description?: string;
    model?: string;
    thinkingLevel?: string;
    costTier?: string;
    memoryScope?: string;
    background?: boolean;
    maxTurns?: number;
    writeScope: string[];
    extensionDependencies: string[];
    evals: string[];
    tools: ToolAclPolicy;
    frontmatter: Record<string, unknown>;
    body: string;
    sourcePath: string;
    rootPath: string;
    scope: AgentScope;
}
export interface ProjectAgentRegistryOptions {
    cwd?: string;
    projectRoots?: string[];
    userRoots?: string[];
    trustMarkerName?: string;
}
export interface ProjectAgentRegistry {
    cwd: string;
    projectRoots: string[];
    userRoots: string[];
    trustMarkerName: string;
    trustedProjectRoots: string[];
    skippedProjectRoots: string[];
    projectAgents: ProjectAgentDefinition[];
    userAgents: ProjectAgentDefinition[];
    agents: ProjectAgentDefinition[];
    collisions: Array<{
        id: string;
        name: string;
        winnerScope: AgentScope;
        winnerPath: string;
        shadowedScope: AgentScope;
        shadowedPath: string;
    }>;
}
export declare function normalizeToolAcl(input?: ToolAclInput | ToolAclPolicy | null): ToolAclPolicy;
export declare function isToolAllowed(policy: ToolAclInput | ToolAclPolicy | null | undefined, tool: string): boolean;
export declare function parseAgentMarkdown(text: string, sourcePath: string, scope: AgentScope, rootPath: string): ProjectAgentDefinition | undefined;
export declare function loadProjectAgentRegistry(options?: ProjectAgentRegistryOptions): ProjectAgentRegistry;
