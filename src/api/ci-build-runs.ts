import type { AppStoreConnectClient } from "./client.js";
import { flattenOne, flattenResponse } from "./client.js";
import type { CiBuildAction, CiBuildRun, JsonApiResource } from "./types.js";

export async function listAllBuildRuns(
  client: AppStoreConnectClient,
  options?: { limit?: number; status?: string },
): Promise<CiBuildRun[]> {
  const params: Record<string, string> = {};
  if (options?.limit) params["limit"] = String(options.limit);
  if (options?.status) params["filter[completionStatus]"] = options.status;
  const response = await client.get<JsonApiResource>("/v1/ciBuildRuns", params);
  return flattenResponse<CiBuildRun>(response);
}

export async function getCiBuildRun(
  client: AppStoreConnectClient,
  id: string,
): Promise<CiBuildRun> {
  const response = await client.get<JsonApiResource>(`/v1/ciBuildRuns/${id}`);
  return flattenOne<CiBuildRun>(response);
}

export async function getBuildRunActions(
  client: AppStoreConnectClient,
  buildRunId: string,
): Promise<CiBuildAction[]> {
  const response = await client.get<JsonApiResource>(
    `/v1/ciBuildRuns/${buildRunId}/actions`,
  );
  return flattenResponse<CiBuildAction>(response);
}

export async function startBuildRun(
  client: AppStoreConnectClient,
  workflowId: string,
  options?: {
    gitReferenceId?: string;
    clean?: boolean;
  },
): Promise<CiBuildRun> {
  const body: Record<string, unknown> = {
    data: {
      type: "ciBuildRuns",
      attributes: {
        clean: options?.clean ?? false,
      },
      relationships: {
        workflow: {
          data: { type: "ciWorkflows", id: workflowId },
        },
        ...(options?.gitReferenceId && {
          sourceBranchOrTag: {
            data: { type: "scmGitReferences", id: options.gitReferenceId },
          },
        }),
      },
    },
  };

  const response = await client.post<JsonApiResource>("/v1/ciBuildRuns", body);
  return flattenOne<CiBuildRun>(response);
}

export async function retryBuildRun(
  client: AppStoreConnectClient,
  buildRunId: string,
): Promise<CiBuildRun> {
  const body = {
    data: {
      type: "ciBuildRuns",
      relationships: {
        buildRun: {
          data: { type: "ciBuildRuns", id: buildRunId },
        },
      },
    },
  };

  const response = await client.post<JsonApiResource>("/v1/ciBuildRuns", body);
  return flattenOne<CiBuildRun>(response);
}
