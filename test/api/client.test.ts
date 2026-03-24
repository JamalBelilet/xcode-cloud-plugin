import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppStoreConnectClient, flattenResponse, flattenOne } from "../../src/api/client.js";
import type { TokenManager } from "../../src/auth/jwt.js";

function createMockTokenManager(): TokenManager {
  return { getToken: () => "mock-jwt-token" } as TokenManager;
}

function mockFetch(response: object, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    headers: new Headers(),
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
}

describe("AppStoreConnectClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct authorization header", async () => {
    const fetchSpy = mockFetch({ data: [] });
    vi.stubGlobal("fetch", fetchSpy);

    const client = new AppStoreConnectClient(createMockTokenManager());
    await client.get("/v1/ciProducts");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer mock-jwt-token");
  });

  it("builds URL with query params", async () => {
    const fetchSpy = mockFetch({ data: [] });
    vi.stubGlobal("fetch", fetchSpy);

    const client = new AppStoreConnectClient(createMockTokenManager());
    await client.get("/v1/ciProducts", { limit: "10", include: "primaryRepositories" });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain("limit=10");
    expect(url).toContain("include=primaryRepositories");
  });

  it("throws on API errors with detail messages", async () => {
    const fetchSpy = mockFetch(
      { errors: [{ detail: "Product not found" }] },
      404,
    );
    vi.stubGlobal("fetch", fetchSpy);

    const client = new AppStoreConnectClient(createMockTokenManager());
    await expect(client.get("/v1/ciProducts/bad-id")).rejects.toThrow(
      "Product not found",
    );
  });

  it("follows pagination links with getAll", async () => {
    const page1 = {
      data: [{ type: "ciProducts", id: "1", attributes: { name: "App1" } }],
      links: { next: "https://api.appstoreconnect.apple.com/v1/ciProducts?cursor=abc" },
    };
    const page2 = {
      data: [{ type: "ciProducts", id: "2", attributes: { name: "App2" } }],
      links: {},
    };

    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        const response = callCount === 0 ? page1 : page2;
        callCount++;
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => response,
        };
      }),
    );

    const client = new AppStoreConnectClient(createMockTokenManager());
    const results = await client.getAll("/v1/ciProducts");

    expect(results).toHaveLength(2);
    expect(callCount).toBe(2);
  });
});

describe("flatten helpers", () => {
  it("flattenResponse extracts attributes", () => {
    const response = {
      data: [
        { type: "ciProducts", id: "1", attributes: { name: "MyApp", productType: "APP" } },
        { type: "ciProducts", id: "2", attributes: { name: "MyLib", productType: "FRAMEWORK" } },
      ],
    };

    const result = flattenResponse<{ id: string; name: string; productType: string }>(response);
    expect(result).toEqual([
      { id: "1", name: "MyApp", productType: "APP" },
      { id: "2", name: "MyLib", productType: "FRAMEWORK" },
    ]);
  });

  it("flattenOne extracts single resource", () => {
    const response = {
      data: { type: "ciProducts", id: "1", attributes: { name: "MyApp" } },
    };

    const result = flattenOne<{ id: string; name: string }>(response);
    expect(result).toEqual({ id: "1", name: "MyApp" });
  });
});
