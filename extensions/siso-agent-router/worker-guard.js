import { evaluatePiChildGuardrail, isPiSubagentChild } from "./child-context-guard.js";
export { isPiSubagentChild };
export function guardSisoAction(input, env = process.env) {
    const result = evaluatePiChildGuardrail({
        toolName: "siso",
        params: { action: input.domain, op: input.op, command: input.command },
        prompt: input.command,
        env,
    });
    return result.allowed ? { allowed: true } : { allowed: false, reason: result.reason };
}
