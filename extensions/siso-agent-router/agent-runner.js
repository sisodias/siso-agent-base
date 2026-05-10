// Compatibility note for older SISO agent sessions.
//
// Agent execution now lives in spawn-layer.js and native-subagent-bridge.js.
// Import from those modules for current child/subagent runtime behavior.
export { runProfileSpawn } from "./spawn-layer.js";
export { executeSpawnWithNativeSubagentBridge } from "./native-subagent-bridge.js";
