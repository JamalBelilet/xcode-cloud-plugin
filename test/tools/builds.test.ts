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
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.1.0" });

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return client;
}

describe("MCP tool registration", () => {
  it("registers all 21 tools", async () => {
    const { server } = createTestServer();
    const mcpClient = await connectServerAndClient(server);

    const { tools } = await mcpClient.listTools();

    expect(tools).toHaveLength(21);

    const toolNames = tools.map((t) => t.name).sort();
    expect(toolNames).toEqual([
      "delete_workflow",
      "get_artifact",
      "get_build",
      "get_build_artifacts",
      "get_build_issues",
      "get_ci_product",
      "get_issue",
      "get_scm_repository",
      "get_test_results",
      "get_workflow",
      "list_builds",
      "list_ci_products",
      "list_git_references",
      "list_macos_versions",
      "list_scm_providers",
      "list_scm_repositories",
      "list_workflows",
      "list_xcode_versions",
      "retry_build",
      "start_build",
      "update_workflow",
    ]);

    await mcpClient.close();
  });

  it("list_ci_products returns formatted text", async () => {
    const { server, client } = createTestServer();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
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
          ],
        }),
      }),
    );

    const mcpClient = await connectServerAndClient(server);

    const result = await mcpClient.callTool({
      name: "list_ci_products",
      arguments: {},
    });

    expect(result.content).toHaveLength(1);
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("MyApp");
    expect(text).toContain("APP");
    expect(text).toContain("prod-1");

    await mcpClient.close();
  });

  it("list_builds with no scope returns global builds", async () => {
    const { server } = createTestServer();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          data: [
            {
              type: "ciBuildRuns",
              id: "build-1",
              attributes: {
                number: 42,
                executionProgress: "COMPLETE",
                completionStatus: "SUCCEEDED",
                startReason: "MANUAL",
                isPullRequestBuild: false,
                createdDate: "2025-01-15T10:00:00Z",
                startedDate: "2025-01-15T10:01:00Z",
                finishedDate: "2025-01-15T10:05:00Z",
              },
            },
          ],
        }),
      }),
    );

    const mcpClient = await connectServerAndClient(server);

    const result = await mcpClient.callTool({
      name: "list_builds",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Build #42");
    expect(text).toContain("SUCCEEDED");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });
});
