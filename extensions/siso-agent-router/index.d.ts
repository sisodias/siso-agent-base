import { type NativeSubagentBridgeContext } from "./native-subagent-bridge.js";
export type ExtensionContext = {
    hasUI?: boolean;
    getAllTools?: () => Array<{
        name?: string;
        execute?: (toolCallId: string, params: Record<string, unknown>, signal?: AbortSignal, onUpdate?: unknown, ctx?: ExtensionContext) => Promise<{
            content?: Array<{
                type?: string;
                text?: string;
            }>;
            details?: unknown;
        }> | {
            content?: Array<{
                type?: string;
                text?: string;
            }>;
            details?: unknown;
        };
    }>;
    ui?: {
        setStatus?: (key: string, text: string | undefined) => void;
        setWidget?: (key: string, lines: string[] | undefined, options?: {
            placement?: "aboveEditor" | "belowEditor";
        }) => void;
    };
};
export type ExtensionAPI = {
    on: (event: string, handler: (event: {
        [key: string]: unknown;
    }, ctx: ExtensionContext) => void | Promise<void>) => void;
    registerCommand: (name: string, handler: {
        description: string;
        handler: (args: string, ctx?: ExtensionContext) => Promise<unknown> | unknown;
    }) => void;
    getAllTools?: NativeSubagentBridgeContext["getAllTools"];
    registerTool: (tool: {
        name: string;
        label: string;
        description: string;
        promptSnippet?: string;
        promptGuidelines?: string[];
        parameters: unknown;
        renderShell?: "default" | "self";
        renderCall?: (args: Record<string, unknown>, theme: {
            fg?: (name: string, text: string) => string;
            bold?: (text: string) => string;
        }) => unknown;
        renderResult?: (result: {
            content?: Array<{
                type?: string;
                text?: string;
            }>;
            details?: unknown;
        }, options: {
            expanded?: boolean;
            isPartial?: boolean;
        }, theme: {
            fg?: (name: string, text: string) => string;
            bold?: (text: string) => string;
        }) => unknown;
        execute: (toolCallId: string, params: Record<string, unknown>, signal?: AbortSignal, onUpdate?: unknown, ctx?: ExtensionContext) => Promise<unknown> | unknown;
    }) => void;
};
export default function sisoAgentRouterExtension(pi: ExtensionAPI): void;
