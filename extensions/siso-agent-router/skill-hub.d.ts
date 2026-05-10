export interface SkillHubEntry {
    skillId: string;
    name: string;
    source: string;
    path: string;
    description: string;
    triggers: string[];
    hasFrontmatter: boolean;
    headings: Array<{
        level: number;
        text: string;
        line: number;
    }>;
}
export interface SkillHubQuery {
    op?: "list" | "search" | "route" | "info" | "load_body";
    query?: string;
    skillId?: string;
    section?: string;
    source?: string;
    cwd?: string;
    limit?: number;
    maxChars?: number;
}
export interface SkillHubResult {
    op?: "list" | "search" | "route" | "info" | "load_body";
    total: number;
    returned: number;
    entries: SkillHubEntry[];
    body?: string;
}
export declare function getSkillCatalog(query?: Pick<SkillHubQuery, "cwd">): SkillHubEntry[];
export declare function clearSkillHubCache(): void;
export declare function clearSkillHubStats(): void;
export declare function skillHubStats(): {
    catalogScans: number;
    catalogCacheHits: number;
};
export declare function querySkillHub(query?: SkillHubQuery): SkillHubResult;
export declare function formatSkillHubResult(result: SkillHubResult): string;
