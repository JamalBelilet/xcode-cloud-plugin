import type { AppStoreConnectClient } from "./client.js";
import { flattenOne, flattenResponse } from "./client.js";
import type { JsonApiResource, ScmGitReference, ScmProvider, ScmRepository } from "./types.js";

export async function listScmProviders(
  client: AppStoreConnectClient,
): Promise<ScmProvider[]> {
  const response = await client.get<JsonApiResource>("/v1/scmProviders");
  return flattenResponse<ScmProvider>(response);
}

export async function listScmRepositories(
  client: AppStoreConnectClient,
  options?: { limit?: number },
): Promise<ScmRepository[]> {
  const params: Record<string, string> = {};
  if (options?.limit) params["limit"] = String(options.limit);
  const response = await client.get<JsonApiResource>("/v1/scmRepositories", params);
  return flattenResponse<ScmRepository>(response);
}

export async function getScmRepository(
  client: AppStoreConnectClient,
  id: string,
): Promise<ScmRepository> {
  const response = await client.get<JsonApiResource>(`/v1/scmRepositories/${id}`);
  return flattenOne<ScmRepository>(response);
}

export async function listGitReferences(
  client: AppStoreConnectClient,
  repositoryId: string,
  options?: { limit?: number },
): Promise<ScmGitReference[]> {
  const params: Record<string, string> = {};
  if (options?.limit) params["limit"] = String(options.limit);
  const response = await client.get<JsonApiResource>(
    `/v1/scmRepositories/${repositoryId}/gitReferences`,
    params,
  );
  return flattenResponse<ScmGitReference>(response);
}
