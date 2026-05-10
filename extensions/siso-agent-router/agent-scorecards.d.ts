export interface AgentScorecardInput {
  agent: string;
  version?: string;
  taskSet?: string;
  task_set?: string;
  runs?: number;
  trueFindings?: number;
  true_findings?: number;
  falsePositives?: number;
  false_positives?: number;
  missedBugs?: number;
  missed_bugs?: number;
  avgCostUsd?: number;
  avg_cost_usd?: number;
  avgLatencySeconds?: number;
  avg_latency_seconds?: number;
  notes?: string;
  recordedAt?: string;
}

export interface AgentScorecardOptions {
  cwd?: string;
  rootDir?: string;
  agent?: string;
  limit?: number;
  now?: () => string;
}

export interface AgentScorecard {
  id: string;
  agent: string;
  version: string;
  taskSet: string;
  recordedAt: string;
  runs: number;
  trueFindings: number;
  falsePositives: number;
  missedBugs: number;
  avgCostUsd: number;
  avgLatencySeconds: number;
  notes: string;
  score: {
    accuracy: number;
    cost: number;
    speed: number;
    overall: number;
  };
  path?: string;
}

export function agentScorecardPath(scorecard?: AgentScorecardInput, options?: AgentScorecardOptions): string;
export function recordAgentScorecard(scorecard?: AgentScorecardInput, options?: AgentScorecardOptions): AgentScorecard;
export function listAgentScorecards(options?: AgentScorecardOptions): AgentScorecard[];
export function buildScorecardFromChildRun(record?: Record<string, unknown>, options?: AgentScorecardOptions & {
  reason?: string;
  recordedAt?: string;
}): AgentScorecardInput;
export function recordChildRunScorecard(record?: Record<string, unknown>, options?: AgentScorecardOptions & {
  reason?: string;
  recordedAt?: string;
}): AgentScorecard;
export function summarizeAgentScorecards(records?: AgentScorecard[]): {
  total: number;
  best: AgentScorecard | null;
  byAgent: Record<string, { agent: string; runs: number; bestOverall: number; scorecards: number }>;
  summary: string;
};
