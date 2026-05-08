export interface RepoCandidate {
    catalog?: "cloned" | "broad";
    id: string;
    name: string;
    url?: string;
    localPath?: string;
    kind?: string;
    package?: string;
    npm?: string;
    repo?: string;
    lane: string;
    priority: "A" | "B" | "C" | "D" | string;
    action: string;
    setup?: string;
    license?: string;
    description?: string;
    lastCommit?: string;
    steal?: string;
    score?: number | string;
    pi_relevance?: string;
    harness_fit?: string;
    local_status?: string;
}
export interface RepoCandidateFilters {
    catalog?: "cloned" | "broad" | "both";
    priority?: string;
    lane?: string;
    action?: string;
    kind?: string;
    query?: string;
    limit?: number;
}
export interface RepoCatalogResult {
    catalogPath: string;
    totalRows: number;
    returnedRows: number;
    rows: RepoCandidate[];
    lanes: Record<string, number>;
    priorities: Record<string, number>;
    nextAction: string;
}
export interface HarnessFeatureRecommendation {
    id: string;
    title: string;
    score: number;
    rationale: string;
    buildNow: string;
    sourceCount: number;
    topSources: RepoCandidate[];
}
export interface HarnessFeatureRecommendationResult {
    catalogPath: string;
    totalRows: number;
    returnedRows: number;
    features: HarnessFeatureRecommendation[];
    nextAction: string;
}
export interface ResearchIntegrationCandidate {
    id: string;
    title: string;
    priority: "A" | "B";
    status: "build-now" | "steal-next" | "pilot-next";
    sourceRepos: string[];
    evidenceFiles: string[];
    steal: string;
    firstPatch: string;
    testGate: string;
}
export interface ResearchIntegrationQueueResult {
    catalogPath: string;
    totalRows: number;
    returnedRows: number;
    candidates: ResearchIntegrationCandidate[];
    nextAction: string;
}
export declare function loadRepoCatalog(path?: string): RepoCandidate[];
export declare function loadBroadRepoCatalog(path?: string): RepoCandidate[];
export declare function queryRepoCatalog(filters?: RepoCandidateFilters, path?: string): RepoCatalogResult;
export declare function recommendHarnessFeatures(filters?: RepoCandidateFilters): HarnessFeatureRecommendationResult;
export declare function recommendResearchIntegrations(filters?: RepoCandidateFilters): ResearchIntegrationQueueResult;
export declare function formatRepoCatalogResult(result: RepoCatalogResult): string;
export declare function formatHarnessFeatureRecommendations(result: HarnessFeatureRecommendationResult): string;
export declare function formatResearchIntegrationQueue(result: ResearchIntegrationQueueResult): string;
