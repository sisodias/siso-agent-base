// Compatibility note for older SISO agent sessions.
//
// Child-control state now lives in task-registry.js and session-store.js.
// These exports cover the common read/list paths older agents looked for here.
export {
  listScopedTaskRecords,
  readScopedTaskRecord,
  writeScopedTaskRecord,
} from "./task-registry.js";

export {
  listSessionAgents,
  projectSessionRouterStatus,
  readSessionAgent,
} from "./session-store.js";
