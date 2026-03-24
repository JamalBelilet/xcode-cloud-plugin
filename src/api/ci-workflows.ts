import type { AppStoreConnectClient } from "./client.js";
import { flattenOne, flattenResponse } from "./client.js";
import type { CiBuildRun, CiWorkflow, JsonApiResource } from "./types.js";

export async function getCiWorkflow(
  client: AppStoreConnectClient,
  id: string,
): Promise<CiWorkflow> {
  const response = await client.get<JsonApiResource>(`/v1/ciWorkflows/${id}`);
  return flattenOne<CiWorkflow>(response);
}

export async function listAllCiWorkflows(
  client: AppStoreConnectClient,
): Promise<CiWorkflow[]> {
  const response = await client.get<JsonApiResource>("/v1/ciWorkflows");
  return flattenResponse<CiWorkflow>(response);
}

export async function updateCiWorkflow(
  client: AppStoreConnectClient,
  id: string,
  updates: {
    name?: string;
    description?: string;
    isEnabled?: boolean;
  },
): Promise<CiWorkflow> {
  const attributes: Record<string, unknown> = {};
  if (updates.name !== undefined) attributes.name = updates.name;
  if (updates.description !== undefined) attributes.description = updates.description;
  if (updates.isEnabled !== undefined) attributes.isEnabled = updates.isEnabled;

  const body = {
    data: {
      type: "ciWorkflows",
      id,
      attributes,
    },
  };

  const response = await client.patch<JsonApiResource>(`/v1/ciWorkflows/${id}`, body);
  return flattenOne<CiWorkflow>(response);
}

export async function deleteCiWorkflow(
  client: AppStoreConnectClient,
  id: string,
): Promise<void> {
  await client.delete(`/v1/ciWorkflows/${id}`);
}

export async function getWorkflowBuildRuns(
  client: AppStoreConnectClient,
  workflowId: string,
  options?: { limit?: number; status?: string },
): Promise<CiBuildRun[]> {
  const params: Record<string, string> = {};
  if (options?.limit) params["limit"] = String(options.limit);
  if (options?.status) params["filter[completionStatus]"] = options.status;
  const response = await client.get<JsonApiResource>(
    `/v1/ciWorkflows/${workflowId}/buildRuns`,
    params,
  );
  return flattenResponse<CiBuildRun>(response);
}
