export type SisoUiRole = "user" | "assistant" | "system";

export type SisoUiToolPhase = "Explore" | "Modify" | "Verify" | "Delegate" | "Tools";

export type SisoUiToolItem = {
  id?: string;
  label: string;
  detail?: string;
  status?: "queued" | "running" | "done" | "error";
};

export type SisoUiEvent =
  | { type: "message"; role: SisoUiRole; text: string; at?: string }
  | { type: "tool_group"; phase: SisoUiToolPhase; status: "queued" | "running" | "done" | "error"; summary: string; items: SisoUiToolItem[]; at?: string }
  | { type: "agent"; status: "running" | "complete" | "failed"; role: string; task?: string; checks?: number; tokens?: number; duration?: string; summary?: string; at?: string }
  | { type: "status"; model?: string; contextPercent?: number; contextTokens?: number; activeAgents?: number; at?: string }
  | { type: "notice"; tone: "info" | "success" | "warning" | "error"; title: string; text?: string; at?: string };

export type SisoUiSession = {
  id: string;
  title: string;
  events: SisoUiEvent[];
  model?: string;
  updatedAt?: string;
};
