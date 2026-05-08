import type { ContextEvent } from "./store.js";
export type SupersedeReason = "duplicate_tool" | "one_file_one_view" | "state_query" | "stale_error_retry" | "large_stale_output";
export type SupersedeCandidate = {
    eventId: string;
    keptEventId?: string;
    reason: SupersedeReason;
    estimatedTokens: number;
    summary: string;
};
export type SupersedeReport = {
    scanned: number;
    candidates: SupersedeCandidate[];
    estimatedSavedTokens: number;
};
export declare function analyzeSupersede(events: ContextEvent[], options?: {
    protectLast?: number;
    largeOutputTokens?: number;
}): SupersedeReport;
export declare function formatSupersedeReport(report: SupersedeReport, limit?: number): string;
