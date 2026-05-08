export type ExtensionAPI = {
    on: (event: string, handler: (event: {
        type?: string;
        [key: string]: unknown;
    }, ctx: ExtensionContext) => void | Promise<void>) => void;
    registerCommand: (name: string, handler: {
        description: string;
        handler: (args: string[], ctx?: ExtensionContext) => Promise<unknown> | unknown;
    }) => void;
    registerTool?: (tool: {
        name: string;
        label: string;
        description: string;
        parameters: unknown;
        execute: (toolCallId: string, params: {
            op?: string;
            limit?: number;
        }, signal?: AbortSignal, onUpdate?: unknown, ctx?: ExtensionContext) => Promise<unknown> | unknown;
    }) => void;
    appendEntry?: <T = unknown>(customType: string, data?: T) => void;
    registerMessageRenderer?: <T = unknown>(customType: string, renderer: (message: {
        content?: unknown;
        details?: T;
    }, options: {
        expanded?: boolean;
    }, theme: {
        bold: (text: string) => string;
        fg: (name: string, text: string) => string;
    }) => unknown) => void;
};
export type ExtensionContext = {
    hasUI?: boolean;
    ui?: {
        setStatus?: (key: string, text: string | undefined) => void;
        setHiddenThinkingLabel?: (label?: string) => void;
        setWidget?: (key: string, lines: string[] | undefined, options?: {
            placement?: "aboveEditor" | "belowEditor";
        }) => void;
        setEditorText?: (text: string) => void;
        setEditorComponent?: (factory: ((tui: unknown, theme: unknown, keybindings: unknown) => unknown) | undefined) => void;
        notify?: (text: string, level?: "info" | "warning" | "error") => void;
    };
};
export default function sisoStatusExtension(pi: ExtensionAPI): void;
