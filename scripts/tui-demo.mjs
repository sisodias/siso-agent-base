#!/usr/bin/env node
import { visibleWidth } from "../node_modules/@mariozechner/pi-tui/dist/utils.js";
import {
  AccessibilityPanel,
  Accordion,
  AgentCreateWizard,
  AgentDetail,
  AgentEditor,
  AgentList,
  AgentTimeline,
  AlertRulePanel,
  ApiKeyApproval,
  ApiRequestCard,
  ApprovalModeSelector,
  ArtifactListPanel,
  AskUserQuestionPermissionRequest,
  AssistantMessage,
  AttachmentChip,
  AttachmentMessage,
  AuditLogPanel,
  AuthStatusBox,
  AutoUpdateNotice,
  BackupPanel,
  BashPermissionRequest,
  BashToolCard,
  BenchmarkPanel,
  BifrostDashboard,
  BottomComposer,
  BranchSummaryPanel,
  Breadcrumb,
  BrowserActionCard,
  BudgetPressureWarning,
  BuildStatusPanel,
  CacheStatusPanel,
  Card,
  CenteredAppShell,
  ChangelogPanel,
  ChatViewport,
  CheckboxList,
  ChildAgentRow,
  ChildAgentSpawnPermissionRequest,
  ChildNotificationCard,
  ClipboardPasteNotice,
  CoachMark,
  CodeBlock,
  ColorPalettePanel,
  CommandHistoryPanel,
  CommandPalette,
  CompactBoundaryMessage,
  CompactStatusDashboard,
  CompactionSummaryPanel,
  CompatibilityMatrix,
  ComputerUseCard,
  ConfirmDialog,
  ContextChip,
  ContextExplainPanel,
  ContextMemoryPanel,
  ContextMeter,
  ContributionGuidePanel,
  CostTrackerPanel,
  CouncilLaunchPermissionRequest,
  CouncilMemberRow,
  CouncilSynthesisCard,
  CoveragePanel,
  CsvTablePreview,
  DataRetentionPanel,
  DatabaseQueryCard,
  DensityPreviewPanel,
  DependencyGraphPanel,
  DesktopUpsellPanel,
  DiffAddedLine,
  DiffCard,
  DiffContextLine,
  DiffHunk,
  DiffNavigator,
  DiffRemovedLine,
  Divider,
  DoctorPanel,
  DownloadProgressPanel,
  EmptyProjectOnboarding,
  EmptyState,
  EnvVarPanel,
  ErrorBoundaryPanel,
  ExperimentBanner,
  ExtensionManagerPanel,
  ExternalEditorPanel,
  ExternalRoutePermissionRequest,
  FeatureFlagPanel,
  FeedbackSurveyPanel,
  FileAttachmentList,
  FileChangeSummary,
  FileEditToolCard,
  FilePermissionRequest,
  FileReadToolCard,
  FileTree,
  FleetBudgetMeter,
  FleetDetailPanel,
  GitStatusPanel,
  GroupedToolUseContent,
  GuidedTourPanel,
  HelpPanel,
  HistoryTimeline,
  IDESelectionPanel,
  ImageAttachmentGrid,
  ImagePreview,
  IncidentPanel,
  InlineCommentPanel,
  InstallProgressPanel,
  IssueFlagBanner,
  JsonPreview,
  KeyHint,
  KeybindingConflictPanel,
  KeyboardShortcutEditor,
  LatencyBreakdownPanel,
  LintReportPanel,
  ListRow,
  LoadingScreen,
  LoadingState,
  LocalizationPanel,
  LogViewer,
  LogoMark,
  MacroRecorderPanel,
  MarkdownBlock,
  McpAuthPanel,
  McpServerDetail,
  McpToolCard,
  McpToolList,
  MemoryPanel,
  MessageGroup,
  MessageRouter,
  MetricSparkline,
  MigrationPlanPanel,
  ModalDialog,
  ModelSelectorPanel,
  NetworkRequestPanel,
  NewMessagesPill,
  NotebookEditCard,
  NotebookPermissionRequest,
  Notice,
  NotificationCenter,
  OAuthSelector,
  OnboardingChecklist,
  OpenSourceLicensePanel,
  OverlayMenu,
  PackageManagerPanel,
  PanelOverlay,
  ParentFollowupCard,
  PatchApplyPanel,
  PerformancePanel,
  PermissionCard,
  PermissionDialog,
  PermissionRuleEditor,
  PermissionRulePreview,
  PlanModePanel,
  PlanModePermissionRequest,
  PluginInstallPanel,
  PrivacyNoticePanel,
  ProcessListPanel,
  ProfileManagerPanel,
  ProgressBar,
  ProgressLine,
  ProjectTrustSummary,
  PromptComposer,
  PromptFooter,
  PromptHistorySearch,
  PromptInputFooterLeft,
  PromptInputFooterRight,
  PromptInputSuggestions,
  PromptModeIndicator,
  PromptNotifications,
  PromptQueuedCommands,
  PromptStashNotice,
  PromptTemplatePanel,
  ProviderStatusPanel,
  PrunePanel,
  QueuePanel,
  QuotaUsagePanel,
  RadioGroup,
  RateLimitNotice,
  RateLimitPanel,
  RecoveryActionPanel,
  ReleaseChecklistPanel,
  RemoteTunnelPanel,
  RepoCatalogPanel,
  RepoMapPanel,
  RepoRecommendationPanel,
  ResizePreviewPanel,
  ResumeConversationPanel,
  ReviewSummaryPanel,
  RollbackPanel,
  RouterDecisionCard,
  SandboxConfigPanel,
  SandboxDependenciesPanel,
  SandboxPromptFooterHint,
  ScrollBar,
  SearchPanel,
  SearchToolCard,
  SecuritySettingsPanel,
  SelectList,
  ServerHealthPanel,
  SessionExportPanel,
  SessionStatsPanel,
  SettingsCategoryList,
  SettingsPanel,
  ShortcutTable,
  SkillMarketplacePanel,
  SkillPanel,
  SkillPermissionRequest,
  SlashCommandHelp,
  SmokeReportPanel,
  SnippetLibraryPanel,
  Spinner,
  SplitPane,
  StatusLine,
  StatusPill,
  StructuredDiffCard,
  SystemNoticeMessage,
  TabBar,
  Table,
  TaskDependencyPanel,
  TaskPanel,
  TeamPanel,
  TelemetryChart,
  TerminalCapabilityPanel,
  TerminalMultiplexerPanel,
  TestFailurePanel,
  TextInputPreview,
  ThemePreviewGrid,
  ThemeSelectorPanel,
  ThinkingMessage,
  TimelineEventDetail,
  TimelineFilterPanel,
  ToastStack,
  TodoListPanel,
  TokenBudgetMeter,
  ToolApprovalSummary,
  ToolCard,
  ToolErrorPreview,
  ToolOutputPreview,
  ToolSubject,
  TranscriptViewport,
  TreeView,
  TruncatedPath,
  TypecheckReportPanel,
  UnseenDivider,
  UserMessage,
  VersionBadge,
  VirtualizedViewport,
  VoiceIndicator,
  WebFetchPermissionRequest,
  WebFetchToolCard,
  WebSearchResultCard,
  WizardStep,
  WorkflowGraph,
  WorkflowLaunchPermissionRequest,
  WorkflowStepRow,
  WorkspaceHealthPanel,
  truncatePath
} from "./tui-demo-components/index.mjs";
import { fit, padRight, paint } from "./tui-demo-components/theme.mjs";

const modes = new Set(["composer", "tool-cards", "agent-ops", "workflow", "permissions", "messages", "menus", "settings", "mcp", "diff", "markdown", "budget", "transcript", "code", "agent-detail", "permissions-full", "help", "wizard", "sandbox", "viewport", "prompt-deep", "agent-manager", "mcp-deep", "permission-rules", "settings-deep", "diff-deep", "onboarding", "models", "search", "notifications", "memory", "skills", "tasks", "bifrost", "resume", "prompt-complete", "message-complete", "tool-variants", "permission-variants", "auth", "doctor", "repo", "session", "commands", "dialogs", "media", "feedback", "layout", "telemetry", "fleet-deep", "security", "changes", "accessibility", "smoke-report", "release", "router", "context-deep", "notifications-deep", "attachments", "plan", "history", "review", "data-tools", "browser", "processes", "experiments", "theme-lab", "privacy", "templates", "extensions", "catalog", "benchmarks", "timeline-deep", "terminal", "server", "maintenance", "migration", "opensource", "loading", "app-shell", "centered-chat", "onboarding-deep", "workspace", "quality", "artifacts", "network-deep", "alerts", "narrow", "short", "all"]);
const rawMode = process.argv[2] || "composer";
const mode = modes.has(rawMode) ? rawMode : "composer";
const width = Number(readArg("--width") ?? process.env.SISO_TUI_DEMO_WIDTH ?? process.stdout.columns ?? 88);
const height = Number(readArg("--height") ?? process.env.SISO_TUI_DEMO_HEIGHT ?? process.stdout.rows ?? 30);

function readArg(name) {
  const arg = process.argv.find((value) => value === name || value.startsWith(`${name}=`));
  if (!arg) return undefined;
  if (arg.includes("=")) return arg.split("=").slice(1).join("=");
  const index = process.argv.indexOf(arg);
  return process.argv[index + 1];
}

function header(title) {
  return [
    `${paint(title, "bold")} ${paint("clean-room static workbench", "gray")}`,
    StatusLine({
      left: [StatusPill({ label: "SISO TUI demo", tone: "info" }, 18), StatusPill({ label: `mode ${mode}`, tone: "muted" }, 18)],
      right: [ContextMeter({ used: 0.32 }, 28)],
    }, width),
    Divider(width),
  ];
}

function footer() {
  return [
    Divider(width),
    StatusLine({
      left: [KeyHint("Tab", "focus"), KeyHint("Enter", "send"), KeyHint("Esc", "cancel")],
      right: [paint("Bifrost ok · gpt-5.4-mini · 6 tools", "green")],
    }, width),
  ];
}

function composerDemo() {
  return [
    ...header("Composer"),
    ...MessageGroup({ title: "User", tone: "selected", messages: ["Improve the TUI polish without changing runtime behavior."] }, width),
    ...PromptComposer({ placeholder: "Plan the next safe UI primitive…", mode: "normal", queued: 1, attachments: ["repo:SISO_Agent_Base", "task:UI rebuild"] }, width),
    ...OverlayMenu({ title: "Prompt suggestions", selected: 0, items: [
      { label: "/agents", detail: "open child-agent panel" },
      { label: "/status", detail: "show Bifrost + context" },
      { label: "/workflow", detail: "coordinate workers" },
    ] }, width),
    ...footer(),
  ];
}

function toolCardsDemo() {
  return [
    ...header("Tool cards"),
    ...ToolCard({ title: "Bash running", command: "npm run smoke:tui-demo", status: "running", elapsed: "00:07", output: ToolOutputPreview({ lines: ["rendering 15 modes × 3 widths", "checking labels and line widths"], collapsed: 6 }, width - 8) }, width),
    ...ToolCard({ title: "File edit", status: "done", subject: ToolSubject({ name: "write", path: "scripts/tui-demo-components/index.mjs", detail: "+ semantic primitives" }, width - 8), output: ["demo-only component library updated"] }, width),
    ...ToolCard({ title: "Search failed", status: "failed", subject: ToolSubject({ name: "rg", detail: "PermissionCard" }, width - 8), output: ToolErrorPreview({ message: "no live runtime files touched", hint: "demo-only search" }, width - 8) }, width),
    ...footer(),
  ];
}

function agentOpsDemo() {
  return [
    ...header("Agent operations"),
    ...Card({ title: "Active child agents", tone: "running", body: [
      ChildAgentRow({ name: "UI polish worker", model: "gpt-5.4-mini", status: "running", elapsed: "01:24", tools: 5, budget: "42k left", task: "building demo" }, width - 4),
      ChildAgentRow({ name: "Smoke reviewer", model: "claude-haiku", status: "completed", elapsed: "00:39", tools: 2, budget: "done", task: "labels verified" }, width - 4),
      ChildAgentRow({ name: "Release gate", model: "local", status: "queued", elapsed: "queued", tools: 0, budget: "waiting", task: "parent decides bump" }, width - 4),
    ] }, width).render(),
    ...FleetBudgetMeter({ running: 2, queued: 1, maxParallel: 5, tokensUsed: "61k", tokensLeft: "189k" }, width),
    ...footer(),
  ];
}

function workflowDemo() {
  return [
    ...header("Workflow"),
    ...Card({ title: "TUI polish workflow", tone: "running", body: [
      WorkflowStepRow({ step: "Load clean-room plan", owner: "parent", status: "done" }, width - 4),
      WorkflowStepRow({ step: "Build static workbench", owner: "worker", status: "done" }, width - 4),
      WorkflowStepRow({ step: "Smoke widths 40 / 80 / 120", owner: "smoke", status: "running" }, width - 4),
      WorkflowStepRow({ step: "Runtime adoption review", owner: "parent", status: "blocked", detail: "later" }, width - 4),
    ] }, width).render(),
    ...Card({ title: "Council progress", tone: "info", body: [
      CouncilMemberRow({ member: "Design", stance: "semantic primitives", status: "done", confidence: 92 }, width - 4),
      CouncilMemberRow({ member: "Safety", stance: "no live runtime changes", status: "done", confidence: 97 }, width - 4),
      CouncilMemberRow({ member: "Shipping", stance: "version left to parent", status: "running" }, width - 4),
    ] }, width).render(),
    ...footer(),
  ];
}

function permissionsDemo() {
  return [
    ...header("Permission cards"),
    ...PermissionCard({ action: "Run bash", target: "npm run smoke:tui-demo", risk: "medium", reason: "Validate demo renderer before live integration", actions: ["Allow once", "Always allow npm smoke", "Deny"] }, width),
    ...PermissionDialog({ title: "Write permission", request: "Write scripts/tui-demo-components/index.mjs", rules: [{ effect: "ask", scope: "project", rule: "scripts/tui-demo-components/**" }, { effect: "deny", scope: "global", rule: "node_modules/**" }], actions: ["Review diff", "Allow", "Deny"] }, width),
    ...Notice({ title: "Trust boundary", body: "Demo permissions are static and do not alter live approval rules.", tone: "info" }, width),
    ...footer(),
  ];
}

function messagesDemo() {
  return [
    ...header("Message rendering"),
    ...MessageGroup({ title: "User", tone: "selected", messages: ["Build a SISO-native UI system without touching runtime routing."] }, width),
    ...MessageGroup({ title: "Assistant", tone: "info", messages: ["Plan: create demo primitives, smoke them at multiple widths, then integrate cautiously.", `${paint("thinking", "gray")} mapping tool cards and agent ops surfaces`] }, width),
    ...MessageGroup({ title: "System notice", tone: "warn", messages: ["Timeline rows remain opt-in. Child notifications stay hidden from user-authored chat."] }, width),
    ...footer(),
  ];
}

function menusDemo() {
  return [
    ...header("Menus and overlays"),
    ...OverlayMenu({ title: "Slash commands", selected: 1, items: [
      { label: "/agents", detail: "inspect child agents and fleets" },
      { label: "/workflow", detail: "launch coordinated workers" },
      { label: "/status", detail: "open compact Bifrost/SISO dashboard" },
      { label: "/permissions", detail: "review approval rules" },
    ] }, width),
    ...PromptComposer({ placeholder: "/agents status ui-polish", mode: "command", attachments: ["repo:SISO_Agent_Base"] }, width),
    ...footer(),
  ];
}

function settingsDemo() {
  return [
    ...header("Settings/selectors"),
    Breadcrumb(["SISO", "Settings", "Model routing"], width),
    ...OverlayMenu({ title: "Model selector", selected: 0, items: [
      { label: "Spark", detail: "fast default" },
      { label: "Oracle GPT-5.5", detail: "deep planning" },
      { label: "MiniMax worker", detail: "cheap child tasks" },
    ] }, width),
    ...Notice({ title: "Design rule", body: "Selectors are demo-only; live provider configuration is untouched.", tone: "info" }, width),
    ...footer(),
  ];
}

function mcpDemo() {
  return [
    ...header("MCP and external tools"),
    ...Card({ title: "MCP servers", tone: "info", body: [
      ChildAgentRow({ name: "filesystem", model: "local tools", status: "completed", elapsed: "ready", tools: 12, budget: "trusted" }, width - 4),
      ChildAgentRow({ name: "github", model: "remote", status: "queued", elapsed: "auth", tools: 8, budget: "permission needed" }, width - 4),
      ChildAgentRow({ name: "browser", model: "sandbox", status: "failed", elapsed: "off", tools: 0, budget: "disabled in demo" }, width - 4),
    ] }, width).render(),
    ...ToolCard({ title: "MCP tool preview", command: "github.searchIssues", subject: ToolSubject({ name: "mcp", detail: "repo:SISO_Agent_Base label:ui" }, width - 8), status: "done", output: ["3 matching issues · preview collapsed"] }, width),
    ...footer(),
  ];
}

function diffDemo() {
  return [
    ...header("Diff and structured edits"),
    ...StructuredDiffCard({ files: [
      { path: "scripts/tui-demo-components/index.mjs", status: "edit", added: 84, removed: 2 },
      { path: "docs/research/siso-r1-tui-component-inventory.md", status: "edit", added: 36, removed: 0 },
      { path: "scripts/demo-fixtures/tool-card.json", status: "create", added: 24, removed: 0 },
    ] }, width),
    ...DiffCard({ file: "scripts/tui-demo-components/index.mjs", context: ["export function ToolCard(...) {"], removed: ["basic output row"], added: ["ToolOutputPreview", "ToolErrorPreview", "StructuredDiffCard"] }, width),
    ...footer(),
  ];
}

function markdownDemo() {
  return [
    ...header("Markdown and thinking"),
    ...MessageGroup({ title: "Assistant markdown", tone: "info", messages: MarkdownBlock({ lines: ["# UI plan", "- Build demo primitive", "- Smoke at 40/80/120", "```bash", "npm run smoke:tui-demo", "```"], }, width - 4) }, width),
    ...Notice({ title: "Thinking", body: "Internal planning should render as lightweight status, not noisy transcript spam.", tone: "muted" }, width),
    ...footer(),
  ];
}

function budgetDemo() {
  return [
    ...header("Budgets and context"),
    ...Card({ title: "Context attachments", tone: "info", body: [
      `${AttachmentChip({ type: "repo", label: "SISO_Agent_Base" }, 26)} ${ContextChip({ type: "task", label: "ui-rebuild" }, 24)}`,
      TokenBudgetMeter({ used: 0.68, label: "parent", remaining: "82k left" }, width - 4),
      TokenBudgetMeter({ used: 0.91, label: "fleet", remaining: "18k left" }, width - 4),
    ] }, width).render(),
    ...FleetBudgetMeter({ running: 5, queued: 3, maxParallel: 5, tokensUsed: "232k", tokensLeft: "18k" }, width),
    ...footer(),
  ];
}

function transcriptDemo() {
  return [
    ...header("Transcript viewport"),
    ...TranscriptViewport({ messages: [
      { type: "user", text: "Build the missing TUI components." },
      { type: "assistant", lines: ["I will extend demo primitives first, then smoke test."] },
      { type: "tool", title: "Bash", command: "node scripts/smoke-tui-demo.mjs", status: "done", output: ["SISO_TUI_DEMO_SMOKE_OK"] },
      { type: "notice", title: "Hidden child result", text: "Delivered to parent without becoming user-authored chat.", tone: "muted" },
    ] }, width),
    ...footer(),
  ];
}

function codeDemo() {
  return [
    ...header("Code blocks"),
    ...CodeBlock({ language: "js", code: "export function ToolCard(props) {\n  return Card(props);\n}\n// demo-only" }, width),
    ...footer(),
  ];
}

function agentDetailDemo() {
  return [
    ...header("Agent detail"),
    ...AgentDetail({ name: "UI polish worker", model: "gpt-5.4-mini", status: "running", task: "Build demo-only component families", usage: { tokens: "42k", tools: 12, runtime: "03:14" } }, width),
    ...AgentTimeline({ events: [
      { label: "spawned", detail: "fleet siso-tui-rebuild", tone: "ok", time: "00:00" },
      { label: "read plan", detail: "component inventory", tone: "ok", time: "00:19" },
      { label: "building", detail: "demo primitives", tone: "running", time: "03:14" },
    ] }, width),
    ...footer(),
  ];
}

function permissionsFullDemo() {
  return [
    ...header("Specialized permissions"),
    ...BashPermissionRequest({ command: "npm run smoke:tui-demo" }, width),
    ...FilePermissionRequest({ operation: "Edit", path: "scripts/tui-demo.mjs" }, width),
    ...WebFetchPermissionRequest({ url: "https://example.com/docs" }, width),
    ...ChildAgentSpawnPermissionRequest({ profile: "worker", task: "build ToolCard", maxParallel: 5 }, width),
    ...footer(),
  ];
}

function helpDemo() {
  return [
    ...header("Help and shortcuts"),
    ...HelpPanel({
      commands: [
        { name: "/agents", description: "inspect child agents" },
        { name: "/workflow", description: "orchestrate workers" },
        { name: "/status", description: "show SISO/Bifrost state" },
      ],
      shortcuts: [
        { key: "Tab", action: "cycle focus" },
        { key: "Esc", action: "dismiss overlay" },
        { key: "Ctrl+R", action: "history search" },
      ],
    }, width),
    ...footer(),
  ];
}

function wizardDemo() {
  return [
    ...header("Wizard"),
    ...WizardStep({ title: "Project trust", step: 2, total: 4, body: ["Review workspace permissions", "Choose default approval mode"], actions: ["Back", "Trust project", "Cancel"] }, width),
    ...SelectList({ title: "Approval mode", selected: 1, items: [
      { label: "Ask every time", detail: "safest" },
      { label: "Allow workspace edits", detail: "recommended" },
      { label: "Autonomous", detail: "requires trust" },
    ] }, width),
    ...footer(),
  ];
}

function sandboxDemo() {
  return [
    ...header("Sandbox"),
    ...SandboxConfigPanel({ mode: "workspace-write", network: "ask", dependencies: ["rg", "fd", "git"] }, width),
    ...McpServerDetail({ name: "filesystem", status: "ready", auth: "local", tools: ["read", "write", "search"] }, width),
    ...footer(),
  ];
}

function viewportDemo() {
  const rows = Array.from({ length: 24 }, (_, index) => `turn ${index + 1}: ${index % 3 === 0 ? "assistant tool summary" : index % 3 === 1 ? "user prompt" : "status notice"}`);
  return [
    ...header("Virtual viewport"),
    NewMessagesPill({ count: 3 }, width),
    UnseenDivider({ count: 2 }, width),
    ...VirtualizedViewport({ rows, offset: 8, height: Math.min(12, height - 6), title: "Transcript window" }, width),
    ...footer(),
  ];
}

function promptDeepDemo() {
  return [
    ...header("Prompt deep states"),
    PromptModeIndicator({ mode: "plan", detail: "readonly tools" }, width),
    ...PromptComposer({ placeholder: "Plan the live ToolCard integration…", mode: "plan", attachments: ["diff:3 files", "agent:UI worker", "ide:selection"] }, width),
    PromptFooter({ mode: "plan", left: [KeyHint("Ctrl+R", "history")], right: ["queued 2", "context 68%"] }, width),
    ...PromptHistorySearch({ query: "toolcard", results: ["Add ToolCard demo", "Smoke ToolCard at 40 cols", "Review live renderer patch"] }, width),
    ...footer(),
  ];
}

function agentManagerDemo() {
  return [
    ...header("Agent manager"),
    ...AgentList({ selected: 1, agents: [
      { name: "scout", model: "haiku", status: "idle", tools: 3 },
      { name: "ui-polish-worker", model: "gpt-5.4-mini", status: "running", tools: 12 },
      { name: "release-reviewer", model: "spark", status: "queued", tools: 0 },
    ] }, width),
    ...AgentEditor({ name: "ui-polish-worker", prompt: "Build SISO-native TUI primitives from clean-room taxonomy", tools: ["read", "write", "bash"], permissions: ["workspace-write", "ask-bash"] }, width),
    ...AgentCreateWizard({ step: 2, total: 3, name: "toolcard-specialist" }, width),
    ...footer(),
  ];
}

function mcpDeepDemo() {
  return [
    ...header("MCP deep"),
    ...McpAuthPanel({ server: "github", status: "auth required", scopes: ["issues:read", "contents:read"] }, width),
    ...McpToolList({ server: "github", tools: [
      { name: "searchIssues", description: "find UI tasks", permission: "ask" },
      { name: "readFile", description: "read repo file", permission: "allow" },
      { name: "createPR", description: "open pull request", permission: "deny" },
    ] }, width),
    ...footer(),
  ];
}

function permissionRulesDemo() {
  return [
    ...header("Permission rules"),
    ...PermissionRuleEditor({ rules: [
      { effect: "ask", scope: "project", rule: "bash:npm run smoke:*" },
      { effect: "allow", scope: "workspace", rule: "write:scripts/tui-demo*" },
      { effect: "deny", scope: "global", rule: "write:node_modules/**" },
    ] }, width),
    ...footer(),
  ];
}

function settingsDeepDemo() {
  return [
    ...header("Settings deep"),
    ...SettingsCategoryList({ selected: 1, categories: [
      { label: "Models", detail: "routing and fallback" },
      { label: "Permissions", detail: "rules and trust" },
      { label: "Display", detail: "theme and density" },
    ] }, width),
    ...SettingsPanel({ title: "Display settings", rows: [
      { label: "Theme", value: "dark", status: "active" },
      { label: "Timeline", value: "opt-in", status: "safe" },
      { label: "Density", value: "compact", status: "default" },
    ] }, width),
    ...footer(),
  ];
}

function diffDeepDemo() {
  return [
    ...header("Diff deep"),
    ...DiffNavigator({ selected: 0, files: [
      { path: "scripts/tui-demo-components/index.mjs", status: "edit", added: 211, removed: 4 },
      { path: "scripts/tui-demo.mjs", status: "edit", added: 98, removed: 2 },
    ] }, width),
    ...Card({ title: "Selected hunk", tone: "info", body: DiffHunk({ header: "@@ demo primitives @@", context: ["export function ToolCard"], removed: ["single generic row"], added: ["ToolOutputPreview", "ToolErrorPreview", "DiffNavigator"] }, width - 4) }, width).render(),
    ...footer(),
  ];
}

function onboardingDemo() {
  return [
    ...header("Onboarding"),
    ...OnboardingChecklist({ items: [
      { label: "Trust project", detail: "workspace permissions", done: true },
      { label: "Configure model", detail: "Spark default", done: true },
      { label: "Enable agent ops", detail: "child notifications", done: false },
    ] }, width),
    ...WizardStep({ title: "Open-source setup", step: 3, total: 4, body: ["Review demo surfaces", "Run smoke suite", "Pick first live integration"], actions: ["Back", "Continue"] }, width),
    ...footer(),
  ];
}

function modelsDemo() {
  return [
    ...header("Models and providers"),
    ...ModelSelectorPanel({ selected: 1, models: [
      { name: "Spark", provider: "anthropic", context: "200k", status: "default" },
      { name: "Oracle GPT-5.5", provider: "openai", context: "1m", status: "deep" },
      { name: "MiniMax worker", provider: "anthropic", context: "200k", status: "cheap" },
    ] }, width),
    ...ProviderStatusPanel({ providers: [
      { name: "anthropic", ok: true, detail: "oauth ready", model: "Spark" },
      { name: "openai", ok: true, detail: "bifrost route", model: "Oracle" },
      { name: "local", ok: false, detail: "not configured", model: "none" },
    ] }, width),
    ...footer(),
  ];
}

function searchDemo() {
  return [
    ...header("Search"),
    ...SearchPanel({ query: "PermissionDialog", results: [
      { path: "scripts/tui-demo-components/index.mjs", match: "export function PermissionDialog", line: 221 },
      { path: "docs/research/siso-r1-tui-component-inventory.md", match: "PermissionDialog tracker", line: 48 },
      { path: "scripts/tui-demo.mjs", match: "permissionsFullDemo", line: 302 },
    ] }, width),
    ...footer(),
  ];
}

function notificationsDemo() {
  return [
    ...header("Notifications"),
    ...NotificationCenter({ notifications: [
      { title: "Child completed", detail: "result delivered as hidden follow-up", tone: "ok", time: "now" },
      { title: "Smoke passed", detail: "tui-demo at 40/80/120", tone: "ok", time: "1m" },
      { title: "Rate limit warning", detail: "fallback route suggested", tone: "warn", time: "3m" },
    ] }, width),
    ...RateLimitNotice({ provider: "Spark", reset: "in 04:21" }, width),
    ...footer(),
  ];
}

function memoryDemo() {
  return [
    ...header("Memory"),
    ...MemoryPanel({ entries: [
      { title: "UI guardrail", scope: "project", age: "today" },
      { title: "Timeline opt-in", scope: "runtime", age: "0.1.78" },
      { title: "Child notification hidden", scope: "router", age: "0.1.79" },
    ] }, width),
    ...footer(),
  ];
}

function skillsDemo() {
  return [
    ...header("Skills"),
    ...SkillPanel({ skills: [
      { name: "improve-agent-system", description: "release/version/smoke workflow", source: "profile" },
      { name: "code-intelligence", description: "repo analysis helpers", source: "active" },
      { name: "ui-rebuild", description: "demo-only component inventory", source: "research" },
    ] }, width),
    ...footer(),
  ];
}

function tasksDemo() {
  return [
    ...header("Tasks"),
    ...TaskPanel({ tasks: [
      { title: "Build demo primitives", owner: "worker", status: "done", budget: "55 exports" },
      { title: "Wire first live ToolCard", owner: "parent", status: "blocked", budget: "review" },
      { title: "Design AgentOpsPanel", owner: "workflow", status: "running", budget: "42k left" },
    ] }, width),
    ...footer(),
  ];
}

function bifrostDemo() {
  return [
    ...header("Bifrost"),
    ...BifrostDashboard({ route: "shaans-mac-mini", duplicateCount: 0, calls: 42, latency: "310ms" }, width),
    ...CompactStatusDashboard({ context: 0.58, calls: 11, agents: 5, model: "Spark" }, width),
    ...footer(),
  ];
}

function resumeDemo() {
  return [
    ...header("Resume"),
    ...ResumeConversationPanel({ sessions: [
      { title: "SISO TUI rebuild", cwd: "SISO_Agent_Base", age: "now" },
      { title: "Subagent lifecycle smoke", cwd: "SISO_Agent_Base", age: "2h" },
      { title: "Bifrost dashboard", cwd: "SISO_Agent_Base", age: "yesterday" },
    ] }, width),
    ...footer(),
  ];
}

function promptCompleteDemo() {
  return [
    ...header("Prompt complete"),
    PromptInputFooterLeft({ mode: "command", branch: "feature/tui", cwd: "SISO_Agent_Base" }, width),
    ...PromptComposer({ placeholder: "Ask SISO anything…", mode: "command", queued: 2, attachments: ["file:index.mjs", "image:screenshot", "ide:selection"] }, width),
    ...PromptInputSuggestions({ suggestions: [
      { label: "/agents", detail: "manage child workers" },
      { label: "/memory", detail: "open memory panel" },
      { label: "/permissions", detail: "edit rules" },
    ] }, width),
    ...PromptQueuedCommands({ commands: ["Run smoke:tui-demo", "Open diff-deep view"] }, width),
    ...PromptNotifications({ items: [{ title: "Paste detected", detail: "large input truncated safely", tone: "warn" }] }, width),
    PromptInputFooterRight({ model: "Spark", context: 0.68, agents: 3 }, width),
    VoiceIndicator({ active: false }, width),
    SandboxPromptFooterHint({ mode: "workspace-write" }, width),
    ...PromptStashNotice({ count: 2 }, width),
    ...footer(),
  ];
}

function messageCompleteDemo() {
  return [
    ...header("Message complete"),
    ...UserMessage({ text: "Build the missing message families." }, width),
    ...AttachmentMessage({ attachments: [{ type: "file", label: "index.mjs" }, { type: "image", label: "ui.png" }] }, width),
    ...AssistantMessage({ lines: ["Here is the plan:", "- split message router", "- add tool grouping"] }, width),
    ...ThinkingMessage({ text: "Mapping transcript states to SISO runtime events." }, width),
    CompactBoundaryMessage({ label: "context compacted" }, width),
    ...GroupedToolUseContent({ tools: [
      { name: "read", subject: "component inventory", status: "done", elapsed: "00:01" },
      { name: "write", subject: "demo primitives", status: "running", elapsed: "00:08" },
    ] }, width),
    ...SystemNoticeMessage({ title: "Status", text: "Child result delivered hidden from visible chat.", tone: "info" }, width),
    ...footer(),
  ];
}

function toolVariantsDemo() {
  return [
    ...header("Tool variants"),
    ...BashToolCard({ command: "npm run smoke:tui-demo", status: "running", output: ["checking all demo modes"] }, width),
    ...FileReadToolCard({ path: "docs/research/siso-r1-tui-component-inventory.md", lines: 142 }, width),
    ...FileEditToolCard({ path: "scripts/tui-demo-components/index.mjs", added: 28, removed: 0 }, width),
    ...SearchToolCard({ query: "PromptInput", matches: 12 }, width),
    ...WebFetchToolCard({ url: "https://example.com/docs", status: "pending" }, width),
    ...McpToolCard({ server: "github", tool: "searchIssues", status: "done" }, width),
    ...footer(),
  ];
}

function permissionVariantsDemo() {
  return [
    ...header("Permission variants"),
    ...NotebookPermissionRequest({ path: "analysis.ipynb" }, width),
    ...PlanModePermissionRequest({ action: "enter" }, width),
    ...AskUserQuestionPermissionRequest({ question: "Ask user whether to wire ToolCard live now?" }, width),
    ...WorkflowLaunchPermissionRequest({ workflow: "ui-rebuild", workers: 5 }, width),
    ...CouncilLaunchPermissionRequest({ members: 3 }, width),
    ...ExternalRoutePermissionRequest({ route: "Bifrost Oracle" }, width),
    ...footer(),
  ];
}

function authDemo() {
  return [
    ...header("Auth"),
    ...AuthStatusBox({ provider: "anthropic", status: "verified", account: "shaan" }, width),
    ...OAuthSelector({ providers: [
      { name: "Anthropic", status: "connected", default: true },
      { name: "OpenAI", status: "bifrost", default: false },
      { name: "AWS Bedrock", status: "not configured", default: false },
    ] }, width),
    ...ApiKeyApproval({ service: "Bifrost", keyState: "available in keychain" }, width),
    ...footer(),
  ];
}

function doctorDemo() {
  return [
    ...header("Doctor and update"),
    ...LogoMark({ name: "SISO", version: "0.1.x" }, width),
    ...DoctorPanel({ checks: [
      { name: "launcher", ok: true, detail: "bin/siso" },
      { name: "pi runtime", ok: true, detail: "0.73.1" },
      { name: "renderer patches", ok: true, detail: "verified" },
      { name: "optional desktop", ok: false, detail: "not installed" },
    ] }, width),
    ...AutoUpdateNotice({ version: "0.1.next", status: "available" }, width),
    ...ChangelogPanel({ entries: [{ version: "0.1.82", summary: "expanded TUI demo components" }, { version: "0.1.79", summary: "subagent lifecycle smoke" }] }, width),
    ...footer(),
  ];
}

function repoDemo() {
  return [
    ...header("Repo intelligence"),
    ...GitStatusPanel({ branch: "feature/tui", changes: [{ status: "M", path: "scripts/tui-demo.mjs" }, { status: "??", path: "docs/research/siso-r1-tui-component-inventory.md" }] }, width),
    ...FileTree({ root: "SISO_Agent_Base", entries: [{ type: "dir", name: "scripts", depth: 0 }, { type: "file", name: "tui-demo.mjs", depth: 1 }, { type: "dir", name: "docs", depth: 0 }] }, width),
    ...RepoMapPanel({ modules: [{ path: "extensions/siso-agent-router", summary: "child agents/workflows" }, { path: "extensions/siso-status", summary: "Bifrost/status widgets" }] }, width),
    ...BranchSummaryPanel({ base: "main", head: "feature/tui", summary: ["Adds demo-only UI primitives", "No live runtime behavior changed"] }, width),
    ...footer(),
  ];
}

function sessionDemo() {
  return [
    ...header("Session"),
    ...SessionStatsPanel({ turns: 18, tools: 44, agents: 5, context: 0.71 }, width),
    ...CostTrackerPanel({ input: "184k", output: "38k", cost: "$2.41" }, width),
    ...CompactionSummaryPanel({ before: "122k", after: "31k", notes: ["kept task plan", "dropped old tool noise"] }, width),
    ...footer(),
  ];
}

function commandsDemo() {
  return [
    ...header("Commands"),
    ...CommandPalette({ selected: 2, commands: [
      { name: "/agents", description: "inspect fleets" },
      { name: "/status", description: "open dashboard" },
      { name: "/doctor", description: "check install" },
      { name: "/theme", description: "select UI theme" },
    ] }, width),
    ...SlashCommandHelp({ commands: [{ name: "/workflow", description: "orchestrate workers" }, { name: "/memory", description: "retrieve project memory" }] }, width),
    ...ThemeSelectorPanel({ selected: 0, themes: [{ name: "dark", description: "default", active: true }, { name: "contrast", description: "accessible" }] }, width),
    ...footer(),
  ];
}

function dialogsDemo() {
  return [
    ...header("Dialogs"),
    ...ModalDialog({ title: "Trust project", body: ["Allow SISO to edit this workspace?", "Rules can be changed later."], actions: ["Trust", "Cancel"] }, width),
    ...ConfirmDialog({ title: "Apply renderer patch", action: "Apply" }, width),
    ...ErrorBoundaryPanel({ error: "Demo component failed", stack: "ToolCard.render -> Card.render" }, width),
    ...ToastStack({ toasts: [{ title: "Saved", body: "Prompt stashed", tone: "ok" }, { title: "Warning", body: "Timeline is opt-in", tone: "warn" }] }, width),
    ...footer(),
  ];
}

function mediaDemo() {
  return [
    ...header("Media and inputs"),
    ...ImagePreview({ path: "screenshots/agent-ops.png", width: 32, height: 6 }, width),
    ...TextInputPreview({ label: "Rename agent", value: "ui-polish-worker" }, width),
    LoadingState({ label: "Converting image", detail: "kitty preview", frame: 2 }, width),
    ...EmptyState({ title: "No screenshots", hint: "Drop files to attach visual context" }, width),
    ...footer(),
  ];
}

function feedbackDemo() {
  return [
    ...header("Feedback and team"),
    ...TeamPanel({ members: [{ name: "Shaan", role: "owner", status: "active" }, { name: "SISO", role: "agent system", status: "building" }] }, width),
    ...FeedbackSurveyPanel({ prompt: "Was this TUI pass useful?" }, width),
    ...DesktopUpsellPanel({ message: "Optional richer previews without changing CLI-first workflow." }, width),
    ...footer(),
  ];
}

function layoutDemo() {
  return [
    ...header("Layout primitives"),
    TabBar({ tabs: ["Transcript", "Agents", "Tools", "Settings"], selected: 1 }, width),
    ...SplitPane({ leftTitle: "Nav", rightTitle: "Detail", left: ["/agents", "/workflow", "/status"], right: ["Selected: Agents", "3 running", "1 queued"] }, width),
    ...Accordion({ sections: [{ title: "Prompt", open: true, items: ["composer", "history", "suggestions"] }, { title: "Advanced", open: false, items: [] }] }, width),
    ...TreeView({ nodes: [{ label: "src", expanded: true, depth: 0, children: true }, { label: "components", depth: 1, children: true }, { label: "ToolCard.ts", depth: 2 }] }, width),
    ...footer(),
  ];
}

function telemetryDemo() {
  return [
    ...header("Telemetry"),
    ...TelemetryChart({ title: "Tool telemetry", series: [
      { label: "calls", values: [1, 3, 2, 8, 5, 9, 4, 7] },
      { label: "tokens", values: [2, 2, 4, 5, 9, 6, 8, 10] },
    ] }, width),
    ...LogViewer({ title: "Recent events", lines: [
      { level: "info", message: "child spawned" },
      { level: "warn", message: "queue pressure 5/5" },
      { level: "info", message: "smoke passed" },
    ] }, width),
    ...footer(),
  ];
}

function fleetDeepDemo() {
  return [
    ...header("Fleet deep"),
    ...FleetDetailPanel({ fleetId: "siso-tui-rebuild", children: [
      { name: "prompt-worker", model: "haiku", status: "running", elapsed: "02:14", tools: 8, budget: "34k left" },
      { name: "tool-worker", model: "spark", status: "completed", elapsed: "01:01", tools: 5, budget: "done" },
      { name: "permission-worker", model: "mini", status: "queued", elapsed: "queued", tools: 0, budget: "waiting" },
    ] }, width),
    ...QueuePanel({ items: [{ title: "wire ToolCard live", reason: "blocked pending review" }, { title: "design viewport", reason: "maxParallel 5/5" }] }, width),
    ...WorkflowGraph({ nodes: [{ id: "plan", next: ["build", "smoke"], status: "done" }, { id: "build", next: ["review"], status: "running" }, { id: "review", next: [], status: "blocked" }] }, width),
    ...CouncilSynthesisCard({ question: "What live component first?", synthesis: "ToolCard is safest before composer.", votes: [{ member: "Safety", position: "ToolCard", confidence: 94 }, { member: "UX", position: "AgentOps", confidence: 88 }] }, width),
    ...TaskDependencyPanel({ tasks: [{ id: "tool-card", blockedBy: [] }, { id: "composer", blockedBy: ["tool-card"] }] }, width),
    ...footer(),
  ];
}

function securityDemo() {
  return [
    ...header("Security"),
    ...SecuritySettingsPanel({ rows: [
      { label: "Bash", value: "ask", status: "safe" },
      { label: "Network", value: "ask", status: "safe" },
      { label: "Workspace writes", value: "review diff", status: "recommended" },
    ] }, width),
    ...ApprovalModeSelector({ selected: 1 }, width),
    ...SandboxDependenciesPanel({ dependencies: [{ name: "rg", installed: true, version: "14" }, { name: "fd", installed: true, version: "10" }, { name: "sqlite3", installed: false }] }, width),
    ...EnvVarPanel({ vars: [{ name: "SISO_STATUS_TIMELINE", value: false }, { name: "NO_COLOR", value: false }] }, width),
    ...footer(),
  ];
}

function changesDemo() {
  return [
    ...header("Change summary"),
    ...FileChangeSummary({ files: [
      { path: "scripts/tui-demo-components/index.mjs", status: "M", added: 190, removed: 0 },
      { path: "scripts/tui-demo.mjs", status: "M", added: 120, removed: 0 },
      { path: "docs/research/siso-r1-tui-component-inventory.md", status: "M", added: 12, removed: 0 },
    ] }, width),
    ...footer(),
  ];
}

function accessibilityDemo() {
  return [
    ...header("Accessibility"),
    ...AccessibilityPanel({ rows: [{ label: "NO_COLOR", value: "supported", ok: true }, { label: "40 column", value: "smoked", ok: true }, { label: "screen reader labels", value: "planned", ok: false }] }, width),
    ...KeybindingConflictPanel({ conflicts: [{ key: "Ctrl+R", current: "history", conflict: "terminal reverse-search" }] }, width),
    ...footer(),
  ];
}

function smokeReportDemo() {
  return [
    ...header("Smoke report"),
    ...SmokeReportPanel({ suites: [{ name: "tui-demo", ok: true, detail: "all modes", duration: "1.2s" }, { name: "syntax", ok: true, detail: "bash -n", duration: "0.1s" }, { name: "smoke:all", ok: false, detail: "not run in demo", duration: "skipped" }] }, width),
    ...TestFailurePanel({ test: "smoke:all", error: "deferred for parent review", command: "npm run smoke:all" }, width),
    ...footer(),
  ];
}

function releaseDemo() {
  return [
    ...header("Release"),
    VersionBadge({ version: "0.1.82", channel: "dev" }, width),
    ...ReleaseChecklistPanel({ items: [{ label: "targeted smoke", done: true }, { label: "changelog", done: false }, { label: "install local", done: false }] }, width),
    ...InstallProgressPanel({ steps: [{ name: "copy package", done: true }, { name: "patch renderers", done: true }, { name: "doctor", done: false }] }, width),
    ...footer(),
  ];
}

function routerDemo() {
  return [
    ...header("Router"),
    ...RouterDecisionCard({ route: "local", profile: "worker", reason: "small UI patch" }, width),
    ...ToolApprovalSummary({ approvals: [{ tool: "bash", decision: "allow", scope: "smoke" }, { tool: "write", decision: "allow", scope: "scripts/tui-demo" }, { tool: "network", decision: "deny", scope: "demo" }] }, width),
    ...footer(),
  ];
}

function contextDeepDemo() {
  return [
    ...header("Context deep"),
    ...ContextExplainPanel({ tiers: [{ name: "system", tokens: 4200, status: "pinned" }, { name: "repo", tokens: 18000, status: "active" }, { name: "history", tokens: 61000, status: "compressed" }] }, width),
    ...ContextMemoryPanel({ memories: [{ source: "lessons", summary: "timeline rows opt-in" }, { source: "tasks", summary: "ToolCard first live candidate" }] }, width),
    ...BudgetPressureWarning({ scope: "parent", used: 0.86 }, width),
    ...footer(),
  ];
}

function notificationsDeepDemo() {
  return [
    ...header("Child delivery"),
    ...ChildNotificationCard({ child: "siso-child-demo-123456", status: "completed", delivered: true }, width),
    ...ParentFollowupCard({ triggerTurn: true, summary: "Parent can answer naturally from hidden result context." }, width),
    ...footer(),
  ];
}

function attachmentsDemo() {
  return [
    ...header("Attachments"),
    ...FileAttachmentList({ files: ["scripts/tui-demo.mjs", "docs/research/siso-r1-tui-component-inventory.md"] }, width),
    ...ImageAttachmentGrid({ images: [{ path: "screenshots/composer.png", size: "1200x800" }, { path: "screenshots/agent-ops.png", size: "900x600" }] }, width),
    ...IDESelectionPanel({ file: "scripts/tui-demo.mjs", range: "120:180", preview: ["function promptCompleteDemo() {", "  return [...];", "}"] }, width),
    ...ClipboardPasteNotice({ kind: "image", size: "420kb" }, width),
    ...ExternalEditorPanel({ editor: "vim", file: "SISO_PROMPT.md" }, width),
    ...footer(),
  ];
}

function planDemo() {
  return [
    ...header("Plan and todos"),
    ...PlanModePanel({ objective: "Reach SISO-native component breadth target", steps: ["Build demo surfaces", "Smoke at 40/80/120", "Pick ToolCard live integration"] }, width),
    ...TodoListPanel({ todos: [{ text: "Add more permission variants", done: true }, { text: "Implement live ToolCard", done: false }, { text: "Review composer later", done: false }] }, width),
    ...NotebookEditCard({ path: "research/ui-audit.ipynb", cells: 4, added: 2, removed: 1 }, width),
    ...WebSearchResultCard({ query: "terminal UI accessibility", results: [{ title: "ANSI color guidelines", url: "example.com/a11y" }] }, width),
    ...footer(),
  ];
}

function historyDemo() {
  return [
    ...header("History and export"),
    ...HistoryTimeline({ events: [{ time: "09:10", title: "started TUI workbench" }, { time: "09:44", title: "added permission variants" }, { time: "10:03", title: "smoke passed" }] }, width),
    ...SessionExportPanel({ formats: [{ name: "Markdown", detail: "human review" }, { name: "JSONL", detail: "agent replay" }, { name: "Patch", detail: "code diff" }] }, width),
    ...footer(),
  ];
}

function reviewDemo() {
  return [
    ...header("Review"),
    ...ReviewSummaryPanel({ files: ["a", "b"], comments: [{ severity: "note", file: "scripts/tui-demo.mjs", text: "demo-only" }, { severity: "blocker", file: "live/runtime.js", text: "do not touch yet" }] }, width),
    ...InlineCommentPanel({ file: "scripts/tui-demo.mjs", line: 42, comments: [{ author: "reviewer", text: "keep live runtime isolated" }] }, width),
    ...PatchApplyPanel({ patches: [{ file: "scripts/tui-demo.mjs", status: "applied" }, { file: "interactive-mode.js", status: "skipped" }] }, width),
    ...RollbackPanel({ checkpoints: [{ name: "before-demo", time: "09:00", files: 3 }, { name: "after-smoke", time: "09:15", files: 5 }] }, width),
    ...footer(),
  ];
}

function dataToolsDemo() {
  return [
    ...header("Data tools"),
    ...DatabaseQueryCard({ query: "select status, count(*) from tasks group by status", rows: 4, duration: "12ms" }, width),
    ...JsonPreview({ title: "Task JSON", value: { status: "completed", tools: 6, hiddenFollowup: true } }, width),
    ...CsvTablePreview({ columns: ["mode", "width", "ok"], rows: [{ mode: "composer", width: "80", ok: "yes" }, { mode: "agent", width: "40", ok: "yes" }] }, width),
    ...ApiRequestCard({ method: "GET", url: "/api/status", status: "200" }, width),
    ...footer(),
  ];
}

function browserDemo() {
  return [
    ...header("Browser/computer"),
    ...BrowserActionCard({ action: "open", target: "http://localhost:3000", status: "running" }, width),
    ...ComputerUseCard({ action: "click", coordinates: "x=120 y=44", status: "pending" }, width),
    ...footer(),
  ];
}

function processesDemo() {
  return [
    ...header("Processes"),
    ...TerminalMultiplexerPanel({ panes: [{ id: "dev", status: "running", command: "npm run dev" }, { id: "smoke", status: "done", command: "npm run smoke:tui-demo" }] }, width),
    ...ProcessListPanel({ processes: [{ pid: 123, name: "node", cpu: "12%", status: "running" }, { pid: 456, name: "rg", cpu: "0%", status: "sleeping" }] }, width),
    ...PerformancePanel({ fps: 30, renderMs: 18, memory: "64mb" }, width),
    ...footer(),
  ];
}

function experimentsDemo() {
  return [
    ...header("Experiments"),
    ...FeatureFlagPanel({ flags: [{ name: "new-tool-card", enabled: true }, { name: "live-composer", enabled: false }] }, width),
    ...ExperimentBanner({ name: "agent-ops-panel", variant: "compact" }, width),
    ...LocalizationPanel({ locale: "en-US", strings: [{ key: "send", value: "Send" }, { key: "cancel", value: "Cancel" }] }, width),
    ...footer(),
  ];
}

function themeLabDemo() {
  return [
    ...header("Theme lab"),
    ...ThemePreviewGrid({ themes: [{ name: "dark", color: "cyan", description: "default" }, { name: "contrast", color: "yellow", description: "accessible" }] }, width),
    ...ColorPalettePanel({ colors: [{ name: "accent", tone: "cyan", hex: "#00d7ff" }, { name: "warning", tone: "yellow", hex: "#ffd75f" }] }, width),
    ...DensityPreviewPanel({ densities: [{ name: "compact", spacing: 1, description: "default" }, { name: "comfortable", spacing: 4, description: "more whitespace" }] }, width),
    ...footer(),
  ];
}

function privacyDemo() {
  return [
    ...header("Privacy"),
    ...PrivacyNoticePanel({ items: [{ name: "workspace files", shared: false }, { name: "external model prompt", shared: true }] }, width),
    ...DataRetentionPanel({ policies: [{ scope: "local sessions", duration: "until pruned" }, { scope: "child logs", duration: "task retention" }] }, width),
    ...AuditLogPanel({ entries: [{ time: "10:00", actor: "agent", action: "requested bash approval" }, { time: "10:02", actor: "user", action: "allowed smoke" }] }, width),
    ...footer(),
  ];
}

function templatesDemo() {
  return [
    ...header("Templates"),
    ...PromptTemplatePanel({ templates: [{ name: "UI review", description: "review demo component", source: "profile" }, { name: "Smoke fix", description: "repair failing smoke", source: "local" }] }, width),
    ...SnippetLibraryPanel({ snippets: [{ trigger: "tc", description: "ToolCard fixture" }, { trigger: "perm", description: "Permission dialog fixture" }] }, width),
    ...MacroRecorderPanel({ recording: true, events: 7 }, width),
    ...footer(),
  ];
}

function extensionsDemo() {
  return [
    ...header("Extensions"),
    ...ExtensionManagerPanel({ extensions: [{ name: "siso-status", enabled: true, version: "0.1" }, { name: "code-intel", enabled: true, version: "active" }, { name: "desktop-bridge", enabled: false }] }, width),
    ...PluginInstallPanel({ plugin: "mcp-github", steps: [{ name: "download", done: true }, { name: "verify", done: true }, { name: "configure", done: false }] }, width),
    ...ProfileManagerPanel({ profiles: [{ name: "spark.reviewer", model: "Spark", default: true }, { name: "minimax.worker", model: "MiniMax", lane: "cheap" }] }, width),
    ...SkillMarketplacePanel({ skills: [{ name: "ui-rebuild", installed: true, description: "TUI primitives" }, { name: "release-helper", installed: false, description: "version/changelog" }] }, width),
    ...footer(),
  ];
}

function catalogDemo() {
  return [
    ...header("Repo catalog"),
    ...RepoCatalogPanel({ repos: [{ name: "SISO_Agent_Base", kind: "local", priority: "high" }, { name: "pi-tui", kind: "dependency", priority: "medium" }] }, width),
    ...RepoRecommendationPanel({ recommendations: [{ score: "0.94", name: "ink patterns", reason: "overlay focus model" }, { score: "0.88", name: "blessed widgets", reason: "terminal tables" }] }, width),
    ...footer(),
  ];
}

function benchmarksDemo() {
  return [
    ...header("Benchmarks"),
    ...BenchmarkPanel({ benchmarks: [{ name: "render 40 cols", score: "1.2ms", delta: "+8%" }, { name: "render 120 cols", score: "2.8ms", delta: "-3%" }] }, width),
    ...LatencyBreakdownPanel({ phases: [{ name: "layout", ms: 4, ratio: 0.2 }, { name: "ansi-fit", ms: 8, ratio: 0.4 }, { name: "write", ms: 2, ratio: 0.1 }] }, width),
    ...footer(),
  ];
}

function timelineDeepDemo() {
  return [
    ...header("Timeline deep"),
    ...TimelineFilterPanel({ filters: [{ name: "tools", enabled: true, count: 12 }, { name: "agents", enabled: true, count: 5 }, { name: "routine", enabled: false, count: 44 }] }, width),
    ...TimelineEventDetail({ event: { type: "child-completed", surface: "hidden-followup", detail: "parent turn triggered", tone: "ok" } }, width),
    ...CommandHistoryPanel({ commands: [{ time: "10:00", command: "node scripts/tui-demo.mjs all" }, { time: "10:01", command: "npm run smoke:tui-demo" }] }, width),
    ...footer(),
  ];
}

function terminalDemo() {
  return [
    ...header("Terminal"),
    ...TerminalCapabilityPanel({ capabilities: [{ name: "truecolor", ok: true }, { name: "kitty images", ok: true }, { name: "sixel", ok: false, detail: "not detected" }] }, width),
    ...ResizePreviewPanel({ columns: width, rows: height }, width),
    ...KeyboardShortcutEditor({ bindings: [{ key: "Tab", action: "focus", custom: false }, { key: "Ctrl+G", action: "agent ops", custom: true }] }, width),
    ...footer(),
  ];
}

function serverDemo() {
  return [
    ...header("Server"),
    ...ServerHealthPanel({ services: [{ name: "Bifrost", ok: true, latency: "310ms" }, { name: "gateway", ok: true, latency: "22ms" }, { name: "desktop", ok: false, latency: "offline" }] }, width),
    ...RemoteTunnelPanel({ tunnels: [{ name: "mac-mini", url: "tailnet:8443", status: "online" }, { name: "local", url: "localhost", status: "ready" }] }, width),
    ...footer(),
  ];
}

function maintenanceDemo() {
  return [
    ...header("Maintenance"),
    ...BackupPanel({ backups: [{ name: "sessions", size: "44mb", age: "today" }, { name: "tasks", size: "8mb", age: "1h" }] }, width),
    ...PrunePanel({ candidates: [{ kind: "old child logs", count: 22, size: "12mb" }, { kind: "smoke temp", count: 4, size: "1mb" }] }, width),
    ...footer(),
  ];
}

function migrationDemo() {
  return [
    ...header("Migration"),
    ...MigrationPlanPanel({ migrations: [{ name: "demo primitives", done: true, risk: "low" }, { name: "live ToolCard", done: false, risk: "medium" }, { name: "Ink migration", done: false, risk: "defer" }] }, width),
    ...CompatibilityMatrix({ rows: [{ feature: "cards", pi: "yes", ink: "yes", status: "ready" }, { feature: "virtual list", pi: "partial", ink: "yes", status: "later" }] }, width),
    ...footer(),
  ];
}

function opensourceDemo() {
  return [
    ...header("Open source"),
    ...OpenSourceLicensePanel({ licenses: [{ package: "pi-tui", license: "MIT-ish check" }, { package: "siso-agent-base", license: "open-source planned" }] }, width),
    ...ContributionGuidePanel({ steps: ["Run npm run smoke:tui-demo", "Keep live runtime isolated", "Add demo mode for every component family", "Document inventory changes"] }, width),
    ...footer(),
  ];
}

function loadingDemo() {
  return LoadingScreen({
    title: "SISO",
    subtitle: "loading lightweight agent workspace",
    steps: [
      { label: "profile", detail: "loaded", done: true },
      { label: "Bifrost", detail: "route ready", done: true },
      { label: "TUI", detail: "building shell", done: false },
    ],
  }, width, height);
}

function appShellDemo() {
  const body = [
    ...ChatViewport({ messages: [
      { type: "user", text: "Make the TUI feel like a real app, but keep it light." },
      { type: "assistant", text: "Using a centered shell with static rows and no heavy renderer migration." },
      { type: "tool", title: "ToolCard", status: "done", output: ["rendered compactly"] },
    ] }, Math.min(100, width - 4), Math.max(6, height - 16)),
    ...BottomComposer({ placeholder: "Ask SISO…", mode: "normal" }, Math.min(100, width - 4)),
  ];
  return CenteredAppShell({
    title: "SISO",
    subtitle: "OpenCode-style shell · Claude-depth components",
    body,
    footer: [StatusLine({ left: [KeyHint("/", "commands"), KeyHint("Tab", "focus")], center: ["2 agents"], right: ["Spark · 32% ctx"] }, Math.min(104, Math.max(44, width - 4)))],
  }, width, height);
}

function centeredChatDemo() {
  const shellWidth = Math.min(96, Math.max(44, width - 4));
  return CenteredAppShell({
    title: "SISO Chat",
    subtitle: "centered transcript",
    body: [
      ...ChatViewport({ messages: [
        { type: "user", text: "This should feel more like OpenCode." },
        { type: "assistant", text: "Centered, framed, app-like, but still terminal-native." },
        { type: "notice", title: "Lightweight", text: "No Ink migration; just deterministic pi-tui-compatible text layout.", tone: "ok" },
      ] }, shellWidth, Math.max(6, height - 14)),
      ...PanelOverlay({ title: "Agent ops", body: ["worker running · 01:24", "smoke passed · 40/80/120"], actions: ["Open", "Dismiss"] }, shellWidth),
    ],
  }, width, height);
}

function onboardingDeepDemo() {
  return [
    ...header("Onboarding deep"),
    ...GuidedTourPanel({ current: 1, steps: [{ title: "Open composer", hint: "start here" }, { title: "Review permissions", hint: "stay safe" }, { title: "Launch agents", hint: "parallel work" }] }, width),
    ...CoachMark({ target: "footer", message: "Context, model, and agent counters stay visible without timeline spam." }, width),
    ...EmptyProjectOnboarding({ cwd: "new-workspace" }, width),
    ...ProjectTrustSummary({ trusted: false, rules: [{ effect: "ask", scope: "workspace", rule: "write:*" }] }, width),
    ...footer(),
  ];
}

function workspaceDemo() {
  return [
    ...header("Workspace"),
    ...WorkspaceHealthPanel({ checks: [{ name: "git", ok: true, detail: "clean enough" }, { name: "tests", ok: true, detail: "targeted smoke" }, { name: "docs", ok: false, detail: "inventory append needed" }] }, width),
    ...DependencyGraphPanel({ nodes: [{ name: "tui-demo", deps: ["components", "theme"] }, { name: "smoke", deps: ["tui-demo"] }] }, width),
    ...PackageManagerPanel({ manager: "npm", scripts: [{ name: "smoke:tui-demo", command: "node scripts/smoke-tui-demo.mjs" }, { name: "smoke:syntax", command: "bash -n ..." }] }, width),
    ...footer(),
  ];
}

function qualityDemo() {
  return [
    ...header("Quality"),
    ...BuildStatusPanel({ targets: [{ name: "demo", status: "done", detail: "rendered", duration: "1.1s" }, { name: "syntax", status: "done", detail: "bash -n", duration: "0.1s" }] }, width),
    ...LintReportPanel({ issues: [{ file: "scripts/tui-demo.mjs", line: 12, rule: "demo/long-file", message: "expected while scaffolding" }] }, width),
    ...TypecheckReportPanel({ errors: [] }, width),
    ...CoveragePanel({ percent: 0.84, files: [{ path: "scripts/smoke-tui-demo.mjs", percent: 1 }, { path: "scripts/tui-demo.mjs", percent: 0.72 }] }, width),
    ...footer(),
  ];
}

function artifactsDemo() {
  return [
    ...header("Artifacts"),
    ...ArtifactListPanel({ artifacts: [{ kind: "stdout", path: ".siso/agent/child-runs/demo.stdout.jsonl", size: "42kb" }, { kind: "screenshot", path: "artifacts/tui/agent-ops.txt", size: "8kb" }] }, width),
    ...DownloadProgressPanel({ downloads: [{ name: "reference inventory", progress: 0.78 }, { name: "theme package", progress: 0.34 }] }, width),
    ...CacheStatusPanel({ caches: [{ name: "repo-map", hitRate: "94%", size: "12mb" }, { name: "syntax", hitRate: "81%", size: "4mb" }] }, width),
    ...footer(),
  ];
}

function networkDeepDemo() {
  return [
    ...header("Network deep"),
    ...NetworkRequestPanel({ requests: [{ method: "POST", host: "bifrost", status: 200, ms: 310 }, { method: "GET", host: "docs", status: 304, ms: 44 }] }, width),
    ...RateLimitPanel({ limits: [{ name: "Spark", remaining: 18, total: 100, reset: "1h" }, { name: "Oracle", remaining: 3, total: 20, reset: "10m" }] }, width),
    ...QuotaUsagePanel({ quotas: [{ name: "fleet tokens", used: 0.62 }, { name: "tool calls", used: 0.41 }] }, width),
    ...footer(),
  ];
}

function alertsDemo() {
  return [
    ...header("Alerts"),
    ...AlertRulePanel({ rules: [{ name: "budget > 90%", enabled: true, condition: "fleet tokens" }, { name: "duplicate prompts", enabled: true, condition: "5 in 15s" }] }, width),
    ...IncidentPanel({ incidents: [{ severity: "warn", title: "Oracle route near limit", status: "monitoring" }] }, width),
    ...RecoveryActionPanel({ actions: [{ label: "switch to Spark", safe: true }, { label: "prune child logs", safe: true }, { label: "edit live renderer", safe: false }] }, width),
    ...footer(),
  ];
}

function narrowDemo() {
  return [
    ...header("Narrow"),
    ...Card({ title: "Path elision", tone: "info", body: [`file ${truncatePath("/workspace/SISO_Agent_Base/scripts/tui-demo.mjs", Math.max(10, width - 12))}`] }, width).render(),
    ...Card({ title: "Compact agent", tone: "running", body: [ChildAgentRow({ name: "TUI worker", model: "gpt-5.4-mini", status: "running", elapsed: "00:12", tools: 3, task: "narrow layout" }, width - 4)] }, width).render(),
    ...footer(),
  ];
}

function shortDemo() {
  return [
    ...header("Short"),
    ...Notice({ title: "Viewport", body: "Short terminal keeps header, one card, footer. Overflow is clipped by demo harness.", tone: "warn" }, width),
    ...footer(),
  ];
}

function allDemo() {
  return [
    ...header("SISO TUI component library"),
    ...Card({ title: "Primitive inventory", tone: "info", body: [
      "Shell: Header, StatusLine, Footer, Breadcrumb, Divider",
      "Composer: PromptComposer, OverlayMenu, KeyHint, AttachmentChip",
      "Messages: MessageGroup, Notice, MarkdownBlock",
      "Tools: ToolCard, ToolSubject, ToolOutputPreview, ToolErrorPreview",
      "Permissions: PermissionCard, PermissionDialog, PermissionRulePreview",
      "Agents: ChildAgentRow, WorkflowStepRow, CouncilMemberRow",
      "Diffs/Budgets: DiffCard, StructuredDiffCard, FleetBudgetMeter",
      "Advanced: TranscriptViewport, CodeBlock, HelpPanel, WizardStep",
      "Deep: VirtualizedViewport, AgentManager, McpAuth, PermissionRules",
      "Ops: Models, Search, Notifications, Memory, Skills, Tasks, Bifrost",
      "Variants: PromptComplete, MessageComplete, ToolVariants, PermissionVariants",
      "Product: Auth, Doctor, Repo, Session, Commands, Dialogs, Media, Feedback",
      "Layout/Ops: SplitPane, TreeView, TelemetryChart, FleetDetail, Security",
      "Final stretch: A11y, SmokeReport, Release, Router, Context, Attachments",
      "Extended: Review, DataTools, Browser, Processes, Experiments, ThemeLab",
      "Ecosystem: Extensions, Catalog, Benchmarks, Timeline, Terminal, Server",
      "OpenCode shell: LoadingScreen, CenteredAppShell, ChatViewport",
      "Ops+: Onboarding, Workspace, Quality, Artifacts, Network, Alerts",
    ] }, width).render(),
    ...footer(),
  ];
}

const renderers = {
  composer: composerDemo,
  "tool-cards": toolCardsDemo,
  "agent-ops": agentOpsDemo,
  workflow: workflowDemo,
  permissions: permissionsDemo,
  messages: messagesDemo,
  menus: menusDemo,
  settings: settingsDemo,
  mcp: mcpDemo,
  diff: diffDemo,
  markdown: markdownDemo,
  budget: budgetDemo,
  transcript: transcriptDemo,
  code: codeDemo,
  "agent-detail": agentDetailDemo,
  "permissions-full": permissionsFullDemo,
  help: helpDemo,
  wizard: wizardDemo,
  sandbox: sandboxDemo,
  viewport: viewportDemo,
  "prompt-deep": promptDeepDemo,
  "agent-manager": agentManagerDemo,
  "mcp-deep": mcpDeepDemo,
  "permission-rules": permissionRulesDemo,
  "settings-deep": settingsDeepDemo,
  "diff-deep": diffDeepDemo,
  onboarding: onboardingDemo,
  models: modelsDemo,
  search: searchDemo,
  notifications: notificationsDemo,
  memory: memoryDemo,
  skills: skillsDemo,
  tasks: tasksDemo,
  bifrost: bifrostDemo,
  resume: resumeDemo,
  "prompt-complete": promptCompleteDemo,
  "message-complete": messageCompleteDemo,
  "tool-variants": toolVariantsDemo,
  "permission-variants": permissionVariantsDemo,
  auth: authDemo,
  doctor: doctorDemo,
  repo: repoDemo,
  session: sessionDemo,
  commands: commandsDemo,
  dialogs: dialogsDemo,
  media: mediaDemo,
  feedback: feedbackDemo,
  layout: layoutDemo,
  telemetry: telemetryDemo,
  "fleet-deep": fleetDeepDemo,
  security: securityDemo,
  changes: changesDemo,
  accessibility: accessibilityDemo,
  "smoke-report": smokeReportDemo,
  release: releaseDemo,
  router: routerDemo,
  "context-deep": contextDeepDemo,
  "notifications-deep": notificationsDeepDemo,
  attachments: attachmentsDemo,
  plan: planDemo,
  history: historyDemo,
  review: reviewDemo,
  "data-tools": dataToolsDemo,
  browser: browserDemo,
  processes: processesDemo,
  experiments: experimentsDemo,
  "theme-lab": themeLabDemo,
  privacy: privacyDemo,
  templates: templatesDemo,
  extensions: extensionsDemo,
  catalog: catalogDemo,
  benchmarks: benchmarksDemo,
  "timeline-deep": timelineDeepDemo,
  terminal: terminalDemo,
  server: serverDemo,
  maintenance: maintenanceDemo,
  migration: migrationDemo,
  opensource: opensourceDemo,
  loading: loadingDemo,
  "app-shell": appShellDemo,
  "centered-chat": centeredChatDemo,
  "onboarding-deep": onboardingDeepDemo,
  workspace: workspaceDemo,
  quality: qualityDemo,
  artifacts: artifactsDemo,
  "network-deep": networkDeepDemo,
  alerts: alertsDemo,
  narrow: narrowDemo,
  short: shortDemo,
  all: allDemo,
};

let lines = renderers[mode]();
if (lines.length > height) {
  const keepFooter = footer();
  const bodyRoom = Math.max(0, height - keepFooter.length - 1);
  lines = [...lines.slice(0, bodyRoom), paint(`… ${lines.length - bodyRoom - keepFooter.length} lines clipped`, "gray"), ...keepFooter].slice(0, height);
}
for (const line of lines) {
  const cleanWidth = visibleWidth(line);
  console.log(cleanWidth > width ? fit(line, width) : padRight(line, Math.min(width, cleanWidth)));
}
