import type { AppStoreConnectClient } from "./client.js";
import { flattenResponse } from "./client.js";
import type {
  CiMacOsVersion,
  CiXcodeVersion,
  JsonApiResource,
} from "./types.js";

export async function listXcodeVersions(
  client: AppStoreConnectClient,
): Promise<{ xcodeVersions: CiXcodeVersion[]; macOsVersions: CiMacOsVersion[] }> {
  const response = await client.get<JsonApiResource>(
    "/v1/ciXcodeVersions",
    { include: "macOsVersions" },
  );
  const xcodeVersions = flattenResponse<CiXcodeVersion>(response);
  const macOsVersions = (response.included ?? [])
    .filter((r) => r.type === "ciMacOsVersions")
    .map((r) => ({ id: r.id, ...r.attributes }) as CiMacOsVersion);
  return { xcodeVersions, macOsVersions };
}

export async function listMacOsVersions(
  client: AppStoreConnectClient,
): Promise<CiMacOsVersion[]> {
  const response = await client.get<JsonApiResource>("/v1/ciMacOsVersions");
  return flattenResponse<CiMacOsVersion>(response);
}
