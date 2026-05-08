export interface BifrostMetricEntry {
    timestamp?: string;
    model?: string;
    body_chars?: number;
    body_without_tools_chars?: number;
    tool_count?: number;
    tool_chars?: number;
    visible_tool_names?: string[];
    text_block_chars?: number;
    text_categories?: Record<string, number>;
    top_text_blocks?: Array<{
        category?: string;
        chars?: number;
        preview?: string;
    }>;
    top_tools?: Array<{
        name?: string;
        chars?: number;
    }>;
    siso?: {
        profile?: string;
        lane?: string;
        route_model?: string;
        child_status?: string;
        child_model?: string;
        child_tokens_total?: number;
        child_result?: {
            summary?: string;
            findings?: string[];
            files?: string[];
            next_action?: string;
        } | string;
    };
}
export declare function parseMetricsJsonl(text: string): BifrostMetricEntry[];
export declare function formatMetricsTable(entries: BifrostMetricEntry[], limit?: number): string;
export declare function formatMetricsDashboard(entries: BifrostMetricEntry[], limit?: number): string;
export declare function readLatestMetricsTable(path?: string, limit?: number): Promise<string>;
export declare function readLatestMetricsDashboard(path?: string, limit?: number): Promise<string>;
