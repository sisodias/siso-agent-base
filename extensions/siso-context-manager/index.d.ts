export type ExtensionContext = {
    hasUI?: boolean;
    ui?: {
        setStatus?: (key: string, text: string | undefined) => void;
        setWidget?: (key: string, lines: string[] | undefined, options?: {
            placement?: "aboveEditor" | "belowEditor";
        }) => void;
    };
};
export type ExtensionAPI = {
    on: (event: string, handler: (event: Record<string, unknown>, ctx: ExtensionContext) => unknown | Promise<unknown>) => void;
    registerCommand?: (name: string, handler: {
        description: string;
        handler: (args: string[] | string, ctx?: ExtensionContext) => Promise<unknown> | unknown;
    }) => void;
    registerTool?: (tool: {
        name: string;
        label: string;
        description: string;
        parameters: unknown;
        renderResult?: (result: {
            content?: Array<{
                text?: string;
            }>;
            details?: unknown;
        }, options: {
            expanded?: boolean;
        }, theme: {
            fg?: (name: string, text: string) => string;
            bold?: (text: string) => string;
        }) => unknown;
        execute: (toolCallId?: string, params?: Record<string, unknown>, signal?: AbortSignal, onUpdate?: unknown, ctx?: ExtensionContext) => Promise<unknown> | unknown;
    }) => void;
};
export default function sisoContextManager(pi: ExtensionAPI): void;
export { deterministicDistill } from "./distill.js";
export { readRunEvents, readRunMemory, storeStats } from "./store.js";
