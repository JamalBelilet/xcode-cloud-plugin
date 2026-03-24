import type { AppStoreConnectClient } from "./client.js";
import { flattenOne, flattenResponse } from "./client.js";
import type {
  CiBuildRun,
  CiProduct,
  CiWorkflow,
  JsonApiResource,
  ScmRepository,
} from "./types.js";

export async function listCiProducts(
  client: AppStoreConnectClient,
  options?: { limit?: number },
): Promise<CiProduct[]> {
  const params: Record<string, string> = {};
  if (options?.limit) params["limit"] = String(options.limit);
  const response = await client.get<JsonApiResource>("/v1/ciProducts", params);
  return flattenResponse<CiProduct>(response);
}

export async function getCiProduct(
  client: AppStoreConnectClient,
  id: string,
): Promise<{ product: CiProduct; repositories: ScmRepository[] }> {
  const response = await client.get<JsonApiResource>(
    `/v1/ciProducts/${id}`,
    { include: "primaryRepositories" },
  );
  const product = flattenOne<CiProduct>(response);
  const repositories = (response.included ?? [])
    .filter((r) => r.type === "scmRepositories")
    .map((r) => ({ id: r.id, ...r.attributes }) as ScmRepository);
  return { product, repositories };
}

export async function getProductWorkflows(
  client: AppStoreConnectClient,
  productId: string,
): Promise<CiWorkflow[]> {
  const response = await client.get<JsonApiResource>(
    `/v1/ciProducts/${productId}/workflows`,
  );
  return flattenResponse<CiWorkflow>(response);
}

export async function getProductBuildRuns(
  client: AppStoreConnectClient,
  productId: string,
  options?: { limit?: number; status?: string },
): Promise<CiBuildRun[]> {
  const params: Record<string, string> = {};
  if (options?.limit) params["limit"] = String(options.limit);
  if (options?.status) params["filter[completionStatus]"] = options.status;
  const response = await client.get<JsonApiResource>(
    `/v1/ciProducts/${productId}/buildRuns`,
    params,
  );
  return flattenResponse<CiBuildRun>(response);
}
