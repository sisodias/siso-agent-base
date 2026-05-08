import { isPiSubagentChild } from "./child-context-guard.js";
export type GuardDecision = {
    allowed: boolean;
    reason?: string;
};
export { isPiSubagentChild };
export declare function guardSisoAction(input: {
    domain: string;
    op?: string;
    command?: string;
}, env?: NodeJS.ProcessEnv): GuardDecision;
