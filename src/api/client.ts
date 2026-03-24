import type { TokenManager } from "../auth/jwt.js";
import type { JsonApiResource, JsonApiResponse } from "./types.js";
import { classifyError, RateLimitError } from "./errors.js";

const BASE_URL = "https://api.appstoreconnect.apple.com";
const MAX_RETRIES = 3;

export class AppStoreConnectClient {
  private tokenManager: TokenManager | null;
  private configError: string | null;

  constructor(tokenManager: TokenManager | null, configError?: string | null) {
    this.tokenManager = tokenManager;
    this.configError = configError ?? null;
  }

  private async request<T extends JsonApiResource>(
    method: string,
    path: string,
    params?: Record<string, string>,
    body?: unknown,
  ): Promise<JsonApiResponse<T>> {
    if (!this.tokenManager) {
      const detail = this.configError
        ? `Credential error: ${this.configError}`
        : "Apple App Store Connect credentials are not configured.";
      throw new Error(
        `${detail} Run /xcode-cloud:setup for instructions.`,
      );
    }

    const url = new URL(path, BASE_URL);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const token = this.tokenManager.getToken();
      const response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.min(1000 * 2 ** attempt, 30000);
        lastError = new RateLimitError("Rate limited by App Store Connect API");
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        let message = `App Store Connect API error: ${response.status} ${response.statusText}`;
        try {
          const parsed = JSON.parse(errorBody);
          if (parsed.errors?.length) {
            message = parsed.errors
              .map(
                (e: { title?: string; detail?: string }) =>
                  e.detail || e.title || "Unknown error",
              )
              .join("; ");
          }
        } catch {
          // use default message
        }
        throw classifyError(response.status, message);
      }

      if (response.status === 204) {
        return { data: [] as unknown as T } as JsonApiResponse<T>;
      }

      return (await response.json()) as JsonApiResponse<T>;
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  async get<T extends JsonApiResource>(
    path: string,
    params?: Record<string, string>,
  ): Promise<JsonApiResponse<T>> {
    return this.request<T>("GET", path, params);
  }

  async post<T extends JsonApiResource>(
    path: string,
    body: unknown,
  ): Promise<JsonApiResponse<T>> {
    return this.request<T>("POST", path, undefined, body);
  }

  async patch<T extends JsonApiResource>(
    path: string,
    body: unknown,
  ): Promise<JsonApiResponse<T>> {
    return this.request<T>("PATCH", path, undefined, body);
  }

  async delete(path: string): Promise<void> {
    await this.request<JsonApiResource>("DELETE", path);
  }

  async getAll<T extends JsonApiResource>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T[]> {
    const results: T[] = [];
    let currentPath = path;
    let currentParams = params;

    while (true) {
      const response = await this.get<T>(currentPath, currentParams);
      const data = Array.isArray(response.data)
        ? response.data
        : [response.data];
      results.push(...data);

      if (!response.links?.next) break;

      const nextUrl = new URL(response.links.next);
      currentPath = nextUrl.pathname;
      currentParams = Object.fromEntries(nextUrl.searchParams.entries());
    }

    return results;
  }
}

// Helpers to flatten JSONAPI resources into domain types

export function flattenResource<T>(resource: JsonApiResource): T {
  return {
    id: resource.id,
    ...resource.attributes,
  } as T;
}

export function flattenResponse<T>(
  response: JsonApiResponse<JsonApiResource>,
): T[] {
  const data = Array.isArray(response.data)
    ? response.data
    : [response.data];
  return data.map((r) => flattenResource<T>(r));
}

export function flattenOne<T>(
  response: JsonApiResponse<JsonApiResource>,
): T {
  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return flattenResource<T>(data);
}
