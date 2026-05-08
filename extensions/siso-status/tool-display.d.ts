export interface ToolDisplay {
    display: string;
    full: string;
}
export declare function formatToolDisplay(toolName: string, input: unknown, width?: number): ToolDisplay;
