import { eq, and, SQL } from "drizzle-orm";

/**
 * Row-Level Security Helper
 * Ensures all queries against a table are scoped to the current workspace.
 */
export function withWorkspace(table: any, workspaceId: string, additionalFilter?: SQL | undefined) {
    const workspaceFilter = eq(table.workspaceId, workspaceId);
    return additionalFilter ? and(workspaceFilter, additionalFilter) : workspaceFilter;
}
