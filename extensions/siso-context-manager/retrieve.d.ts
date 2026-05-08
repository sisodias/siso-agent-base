import { type ContextEvent } from "./store.js";
import { type SupersedeCandidate } from "./supersede.js";
export type RetrievalResult = {
    runId: string;
    eventId: string;
    found: boolean;
    event?: ContextEvent;
    candidate?: SupersedeCandidate;
    text: string;
};
export declare function retrieveEvent(runId: string, eventId: string, options?: {
    maxChars?: number;
    root?: string;
}): RetrievalResult;
export declare function formatRetrievalPointers(runId: string, candidates: SupersedeCandidate[], limit?: number): string;
