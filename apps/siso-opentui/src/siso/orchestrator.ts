import { loadSisoStatus } from "./adapter";

export type SisoIntent =
  | { type: "chat.submit"; text: string }
  | { type: "view.change"; view: "chat" | "agents" | "tools" | "extensions" | "status" }
  | { type: "status.refresh" };

export type SisoSnapshot = ReturnType<typeof loadSisoStatus> & {
  orchestrator: {
    mode: "local-file-snapshot" | "daemon";
    connected: boolean;
    note: string;
  };
};

export function loadSnapshot(): SisoSnapshot {
  return {
    ...loadSisoStatus(),
    orchestrator: {
      mode: "local-file-snapshot",
      connected: true,
      note: "Reading durable SISO child-run records directly until daemon event stream is wired.",
    },
  };
}

export function submitIntent(intent: SisoIntent) {
  // Future: POST/IPC this intent to the persistent SISO orchestrator.
  // For now the OpenTUI app handles only local UI intents and fake chat responses.
  return { accepted: true, intent, persisted: false };
}
