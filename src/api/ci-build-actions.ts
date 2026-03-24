import type { AppStoreConnectClient } from "./client.js";
import { flattenOne, flattenResponse } from "./client.js";
import type {
  CiArtifact,
  CiBuildAction,
  CiIssue,
  CiTestResult,
  JsonApiResource,
} from "./types.js";

export async function getCiBuildAction(
  client: AppStoreConnectClient,
  id: string,
): Promise<CiBuildAction> {
  const response = await client.get<JsonApiResource>(
    `/v1/ciBuildActions/${id}`,
  );
  return flattenOne<CiBuildAction>(response);
}

export async function getActionIssues(
  client: AppStoreConnectClient,
  actionId: string,
  options?: { limit?: number },
): Promise<CiIssue[]> {
  const params: Record<string, string> = {};
  if (options?.limit) params["limit"] = String(options.limit);
  const response = await client.get<JsonApiResource>(
    `/v1/ciBuildActions/${actionId}/issues`,
    params,
  );
  return flattenResponse<CiIssue>(response);
}

export async function getActionTestResults(
  client: AppStoreConnectClient,
  actionId: string,
  options?: { limit?: number },
): Promise<CiTestResult[]> {
  const params: Record<string, string> = {};
  if (options?.limit) params["limit"] = String(options.limit);
  const response = await client.get<JsonApiResource>(
    `/v1/ciBuildActions/${actionId}/testResults`,
    params,
  );
  return flattenResponse<CiTestResult>(response);
}

export async function getActionArtifacts(
  client: AppStoreConnectClient,
  actionId: string,
): Promise<CiArtifact[]> {
  const response = await client.get<JsonApiResource>(
    `/v1/ciBuildActions/${actionId}/artifacts`,
  );
  return flattenResponse<CiArtifact>(response);
}

export async function getCiArtifact(
  client: AppStoreConnectClient,
  id: string,
): Promise<CiArtifact> {
  const response = await client.get<JsonApiResource>(`/v1/ciArtifacts/${id}`);
  return flattenOne<CiArtifact>(response);
}

export async function getCiIssue(
  client: AppStoreConnectClient,
  id: string,
): Promise<CiIssue> {
  const response = await client.get<JsonApiResource>(`/v1/ciIssues/${id}`);
  return flattenOne<CiIssue>(response);
}
