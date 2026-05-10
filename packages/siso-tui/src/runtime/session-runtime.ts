import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAgentSessionFromServices,
  createAgentSessionServices,
  getAgentDir,
  SessionManager,
  type AgentSession,
  type AgentSessionEvent,
  type CreateAgentSessionOptions,
  type CreateAgentSessionResult,
} from "@mariozechner/pi-coding-agent";

export type SisoTuiRuntimeToolEvent = {
  phase: "start" | "update" | "end";
  id: string;
  name: string;
  args?: unknown;
  result?: unknown;
  isError?: boolean;
};

export type SisoTuiPromptCallbacks = {
  onAssistantDelta?: (delta: string) => void;
  onToolEvent?: (event: SisoTuiRuntimeToolEvent) => void;
  onEvent?: (event: AgentSessionEvent) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
};

export type SisoTuiRuntime = {
  sendPrompt: (text: string, callbacks?: SisoTuiPromptCallbacks) => Promise<void>;
  cancel: () => Promise<void>;
  dispose: () => Promise<void>;
  getSession: () => Promise<AgentSession>;
};

export type SisoTuiRuntimeOptions = {
  cwd?: string;
  agentDir?: string;
  model?: string;
  tools?: string[];
  extensionsDir?: string;
  createSession?: (options: CreateAgentSessionOptions) => Promise<CreateAgentSessionResult>;
};

const DEFAULT_TOOLS = ["read", "bash", "edit", "write", "ls", "siso", "siso_context"];

export async function createSisoTuiRuntime(options: SisoTuiRuntimeOptions = {}): Promise<SisoTuiRuntime> {
  applySisoEnvironment(options);

  let session: AgentSession | undefined;
  let unsubscribe: (() => void) | undefined;
  let callbacks: SisoTuiPromptCallbacks | undefined;

  async function getSession() {
    if (session) return session;

    const result = options.createSession
      ? await options.createSession(createSessionOptions(options))
      : await createRealSession(options);
    session = result.session;
    await bindExtensions(session);
    unsubscribe = session.subscribe((event) => {
      callbacks?.onEvent?.(event);
      dispatchRuntimeEvent(event, callbacks);
    });
    return session;
  }

  return {
    async sendPrompt(text, promptCallbacks = {}) {
      const activeSession = await getSession();
      callbacks = promptCallbacks;
      try {
        await activeSession.prompt(text, activeSession.isStreaming ? { streamingBehavior: "followUp" } : undefined);
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        promptCallbacks.onError?.(normalized);
        throw normalized;
      }
    },
    async cancel() {
      if (session) await session.abort();
    },
    async dispose() {
      unsubscribe?.();
      unsubscribe = undefined;
      session?.dispose();
      session = undefined;
      callbacks = undefined;
    },
    getSession,
  };
}

async function createRealSession(options: SisoTuiRuntimeOptions) {
  const cwd = options.cwd ?? process.env.SISO_TUI_CWD ?? process.cwd();
  const agentDir = options.agentDir ?? getAgentDir();
  const services = await createAgentSessionServices({
    cwd,
    agentDir,
    resourceLoaderOptions: {
      noSkills: true,
      noContextFiles: true,
      additionalExtensionPaths: extensionPaths(options.extensionsDir),
    },
  });
  const modelId = options.model ?? process.env.SISO_MODEL ?? "claude-opus-4-7";
  const model = services.modelRegistry.find("bifrost-anthropic", modelId);
  return createAgentSessionFromServices({
    services,
    sessionManager: SessionManager.create(cwd),
    model,
    thinkingLevel: "off",
    tools: options.tools ?? DEFAULT_TOOLS,
  });
}

function createSessionOptions(options: SisoTuiRuntimeOptions): CreateAgentSessionOptions {
  return {
    cwd: options.cwd ?? process.env.SISO_TUI_CWD ?? process.cwd(),
    agentDir: options.agentDir ?? process.env.PI_CODING_AGENT_DIR,
    tools: options.tools ?? DEFAULT_TOOLS,
  };
}

async function bindExtensions(session: AgentSession) {
  const candidate = session as AgentSession & { bindExtensions?: (bindings: unknown) => Promise<void> };
  if (typeof candidate.bindExtensions !== "function") return;
  await candidate.bindExtensions({
    uiContext: {
      notify: () => {},
      setStatus: () => {},
      setWidget: () => {},
      clearStatus: () => {},
      clearWidget: () => {},
      setWorkingIndicator: () => {},
      setFooter: () => {},
      setEditorText: () => {},
      setEditorComponent: () => {},
    },
    onError: () => {},
  });
}

function dispatchRuntimeEvent(event: AgentSessionEvent, callbacks: SisoTuiPromptCallbacks | undefined) {
  if (!callbacks) return;
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    callbacks.onAssistantDelta?.(event.assistantMessageEvent.delta);
    return;
  }
  if (event.type === "message_end") {
    callbacks.onDone?.();
    return;
  }
  if (event.type === "tool_execution_start") {
    callbacks.onToolEvent?.({ phase: "start", id: event.toolCallId, name: event.toolName, args: event.args });
    return;
  }
  if (event.type === "tool_execution_update") {
    callbacks.onToolEvent?.({
      phase: "update",
      id: event.toolCallId,
      name: event.toolName,
      args: event.args,
      result: event.partialResult,
    });
    return;
  }
  if (event.type === "tool_execution_end") {
    callbacks.onToolEvent?.({
      phase: "end",
      id: event.toolCallId,
      name: event.toolName,
      result: event.result,
      isError: event.isError,
    });
  }
}

function extensionPaths(extensionsDir = join(repoRoot(), "extensions")) {
  return [
    join(extensionsDir, "siso-lifecycle", "index.js"),
    join(extensionsDir, "siso-context-manager", "index.js"),
    join(extensionsDir, "siso-status", "index.js"),
    join(extensionsDir, "siso-agent-router", "index.js"),
  ].filter((path) => existsSync(path));
}

function repoRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
}

function applySisoEnvironment(options: SisoTuiRuntimeOptions) {
  loadSecrets();
  const sisoHome = join(homedir(), ".siso");
  const agentHome = join(sisoHome, "agent");
  process.env.PI_CODING_AGENT_DIR ??= options.agentDir ?? join(agentHome, "profile");
  process.env.SISO_HOME ??= sisoHome;
  process.env.SISO_AGENT_HOME ??= agentHome;
  process.env.SISO_GATEWAY_BASE ??= "https://shaans-mac-mini.tail100d11.ts.net:8443";
  process.env.SISO_CONTEXT_MINIMAX_ENDPOINT ??= `${process.env.SISO_GATEWAY_BASE}/anthropic/v1/messages`;
  if (process.env.SISO_BIFROST_KEY) {
    process.env.SISO_CONTEXT_MINIMAX_API_KEY ??= process.env.SISO_BIFROST_KEY;
  }
  process.env.SISO_CHILD_RUN_DIR ??= join(agentHome, "child-runs");
  process.env.SISO_TASK_STORE_PATH ??= join(agentHome, "tasks", "siso-tasks.json");
  process.env.SISO_TRANSCRIPT_DIR ??= join(agentHome, "transcripts");
  process.env.SISO_CONTEXT_MANAGER_DIR ??= join(agentHome, "context-manager");
  process.env.PI_OFFLINE ??= "1";
  process.env.PI_TELEMETRY ??= "0";
  process.env.SISO_AGENT_ROUTER_TOOL_MODE ??= "lean";
  process.env.SISO_STATUS_TOOL_MODE ??= "lean";
  process.env.SISO_LIFECYCLE_TOOL_MODE ??= "lean";
  process.env.SISO_STATUS_UI ??= "full";
  process.env.SISO_STATUS_POLL_MS ??= "2000";
  process.env.SISO_AGENT_ROUTER_UI ??= "compact";
  process.env.SISO_LIFECYCLE_UI ??= "off";
  process.env.SISO_PI_FOOTER_CLEAN ??= "1";
  process.env.SISO_CONTEXT_FILTER ??= "1";
  process.env.SISO_CONTEXT_FORCE_OLD_TOOL_AFTER ??= "24";
  process.env.SISO_CONTEXT_SEMANTIC_LIBRARIAN ??= "1";
  process.env.SISO_CONTEXT_LIBRARIAN_TURNS ??= "4";
  process.env.SISO_CONTEXT_LIBRARIAN_TOKENS ??= "25000";
  process.env.SISO_SPAWN_DEFAULT_BACKGROUND ??= "0";
}

function loadSecrets() {
  const secretsPath = process.env.SISO_SECRETS_FILE ?? join(homedir(), ".siso", "agent", "secrets.env");
  if (!existsSync(secretsPath)) return;
  for (const line of readFileSync(secretsPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}
