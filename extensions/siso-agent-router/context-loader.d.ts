export interface ContextPacket {
    projectRoot: string;
    sisoWiki?: string;
    projectRules?: string;
    lessons?: string;
    globalRules?: ContextSnippet;
    globalLessons?: ContextSnippet;
    memoryIndex?: ContextSnippet;
    projectRulesSnippet?: ContextSnippet;
    lessonsSnippet?: ContextSnippet;
    sisoWikiSnippet?: ContextSnippet;
    latestCheckpoint?: {
        file: string;
        reason?: string;
        timestamp?: string;
    };
}
export interface ContextSnippet {
    file: string;
    chars: number;
    text: string;
}
export declare function loadContextPacket(cwd?: string): ContextPacket;
export declare function formatContextPacket(packet: ContextPacket): string;
