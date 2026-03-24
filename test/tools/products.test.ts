import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AppStoreConnectClient } from "../../src/api/client.js";
import type { TokenManager } from "../../src/auth/jwt.js";
import { registerAllTools } from "../../src/tools/register.js";

function createTestServer() {
  const tokenManager = { getToken: () => "mock-token" } as TokenManager;
  const client = new AppStoreConnectClient(tokenManager);
  const server = new McpServer({ name: "test", version: "0.1.0" });
  registerAllTools(server, client);
  return { server, client };
}

async function connectServerAndClient(server: McpServer) {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.1.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

function mockFetch(response: object, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Unauthorized",
    headers: new Headers(),
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
}

describe("list_ci_products", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted list of products", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          {
            type: "ciProducts",
            id: "prod-1",
            attributes: {
              name: "MyApp",
              productType: "APP",
              createdDate: "2025-01-15T10:00:00Z",
            },
          },
          {
            type: "ciProducts",
            id: "prod-2",
            attributes: {
              name: "MyFramework",
              productType: "FRAMEWORK",
              createdDate: "2025-02-01T12:00:00Z",
            },
          },
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_ci_products",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("MyApp");
    expect(text).toContain("prod-1");
    expect(text).toContain("MyFramework");
    expect(text).toContain("prod-2");
    expect(text).toContain("2 CI products");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns message when no products found", async () => {
    const { server } = createTestServer();
    vi.stubGlobal("fetch", mockFetch({ data: [] }));

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_ci_products",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toBe("No CI products found.");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns error on 401 response", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({ errors: [{ detail: "Not authorized" }] }, 401),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_ci_products",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(result.isError).toBe(true);
    expect(text).toContain("Not authorized");
    expect(text).toContain("reconfigure");

    await mcpClient.close();
  });
});

describe("get_ci_product", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns product with linked repositories", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: {
          type: "ciProducts",
          id: "prod-1",
          attributes: {
            name: "MyApp",
            productType: "APP",
            createdDate: "2025-01-15T10:00:00Z",
          },
        },
        included: [
          {
            type: "scmRepositories",
            id: "repo-1",
            attributes: {
              ownerName: "my-org",
              repositoryName: "my-app",
            },
          },
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_ci_product",
      arguments: { productId: "prod-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("MyApp");
    expect(text).toContain("prod-1");
    expect(text).toContain("Linked repositories");
    expect(text).toContain("my-org/my-app");
    expect(text).toContain("repo-1");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns product without repositories", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: {
          type: "ciProducts",
          id: "prod-1",
          attributes: {
            name: "MyApp",
            productType: "APP",
            createdDate: "2025-01-15T10:00:00Z",
          },
        },
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_ci_product",
      arguments: { productId: "prod-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("MyApp");
    expect(text).not.toContain("Linked repositories");

    await mcpClient.close();
  });

  it("returns error when product not found", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({ errors: [{ detail: "Product not found" }] }, 404),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_ci_product",
      arguments: { productId: "bad-id" },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Product not found");

    await mcpClient.close();
  });
});
