export type ExtensionContext = {
    hasUI?: boolean;
    ui?: {
        setStatus?: (key: string, text: string | undefined) => void;
    };
};
export type ExtensionAPI = {
    on: (event: string, handler: (event: Record<string, unknown>, ctx: ExtensionContext) => unknown | Promise<unknown>) => void;
    registerCommand?: (name: string, handler: {
        description: string;
        handler: (args: string[], ctx?: ExtensionContext) => Promise<unknown> | unknown;
    }) => void;
    registerTool?: (tool: {
        name: string;
        label: string;
        description: string;
        parameters: unknown;
        execute: (toolCallId?: string, params?: Record<string, unknown>, signal?: AbortSignal, onUpdate?: unknown, ctx?: ExtensionContext) => Promise<unknown> | unknown;
    }) => void;
};
type LifecycleState = {
    cwd: string;
    prompt: string;
    sessionId: string;
    transcriptPath?: string;
    lastProviderSummary: ProviderSummary | undefined;
    restoreSummary?: RestoreSummary;
    corrections: number;
    lessons: number;
    queuedCorrections: number;
    checkpoints: number;
    transcriptRows: number;
    errors: number;
    latestError?: string;
    touchedFiles: Set<string>;
};
export type RestoreSummary = {
    file: string;
    path: string;
    reason: string;
    timestamp: string;
    ageMs: number;
    eligible: boolean;
};
export type CaptureResult = {
    captured: boolean;
    matchedPattern?: string;
    lessonAppended?: boolean;
};
export type LessonDrainResult = {
    appended: number;
    duplicates: number;
    processed: number;
    remaining: number;
    lessonsPath: string;
};
type ProviderSummary = {
    model: string;
    inputItems: number;
    inputTextChars: number;
    toolCount: number;
    toolNames: string[];
};
export declare function appendProjectLesson(prompt: string, cwd: string): boolean;
export declare function drainCorrectionLessons(cwd: string, sessionId?: string): LessonDrainResult;
export declare function captureCorrection(prompt: string, cwd: string, sessionId?: string): CaptureResult;
export declare function writeCheckpoint(state: LifecycleState, reason: string): string;
export declare function discoverRestoreSummary(cwd: string): RestoreSummary | undefined;
export declare function readRestoreCheckpoint(cwd: string, maxChars?: number): {
    summary: undefined;
    content: string;
    truncated: boolean;
} | {
    summary: RestoreSummary;
    content: string;
    truncated: boolean;
};
export default function sisoLifecycleExtension(pi: ExtensionAPI): void;
export {};
