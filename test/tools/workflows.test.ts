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
    statusText: "OK",
    headers: new Headers(),
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
}

const workflowResource = (
  id: string,
  name: string,
  opts?: { isEnabled?: boolean; description?: string },
) => ({
  type: "ciWorkflows",
  id,
  attributes: {
    name,
    description: opts?.description ?? "A workflow",
    isEnabled: opts?.isEnabled ?? true,
    isLockedForEditing: false,
    lastModifiedDate: "2025-03-01T09:00:00Z",
  },
});

describe("list_workflows", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists workflows for a product", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          workflowResource("wf-1", "Build & Test"),
          workflowResource("wf-2", "Release", { isEnabled: false }),
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_workflows",
      arguments: { productId: "prod-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Build & Test");
    expect(text).toContain("(enabled)");
    expect(text).toContain("Release");
    expect(text).toContain("(disabled)");
    expect(text).toContain("2 workflows");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("lists all workflows globally when no productId", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [workflowResource("wf-1", "CI Pipeline")],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_workflows",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("CI Pipeline");
    expect(text).toContain("1 workflow");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns message when no workflows found", async () => {
    const { server } = createTestServer();
    vi.stubGlobal("fetch", mockFetch({ data: [] }));

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_workflows",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toBe("No workflows found.");

    await mcpClient.close();
  });

  it("returns product-specific empty message with productId", async () => {
    const { server } = createTestServer();
    vi.stubGlobal("fetch", mockFetch({ data: [] }));

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_workflows",
      arguments: { productId: "prod-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toBe("No workflows found for this product.");

    await mcpClient.close();
  });
});

describe("get_workflow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns workflow details", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: workflowResource("wf-1", "Build & Test", {
          description: "Runs on every push",
        }),
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_workflow",
      arguments: { workflowId: "wf-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Build & Test");
    expect(text).toContain("(enabled)");
    expect(text).toContain("wf-1");
    expect(text).toContain("Runs on every push");
    expect(text).toContain("Last modified");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns error for non-existent workflow", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({ errors: [{ detail: "Workflow not found" }] }, 404),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_workflow",
      arguments: { workflowId: "bad-id" },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Workflow not found");

    await mcpClient.close();
  });
});

describe("update_workflow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("updates workflow and shows changes", async () => {
    const fetchSpy = mockFetch({
      data: workflowResource("wf-1", "New Name", { isEnabled: false }),
    });
    const { server } = createTestServer();
    vi.stubGlobal("fetch", fetchSpy);

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "update_workflow",
      arguments: {
        workflowId: "wf-1",
        name: "New Name",
        isEnabled: false,
      },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Workflow updated");
    expect(text).toContain("New Name");
    expect(text).toContain('name →');
    expect(text).toContain("enabled → false");
    expect(result.isError).toBeFalsy();

    const patchCall = fetchSpy.mock.calls.find(
      (call: unknown[]) =>
        (call[1] as { method: string }).method === "PATCH",
    );
    expect(patchCall).toBeDefined();

    await mcpClient.close();
  });

  it("returns error when no fields provided", async () => {
    const { server } = createTestServer();
    vi.stubGlobal("fetch", mockFetch({ data: [] }));

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "update_workflow",
      arguments: { workflowId: "wf-1" },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("at least one field");

    await mcpClient.close();
  });
});

describe("delete_workflow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes workflow and shows confirmation", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({
              data: workflowResource("wf-1", "Old Workflow"),
            }),
            text: async () => "{}",
          };
        }
        return {
          ok: true,
          status: 204,
          headers: new Headers(),
          json: async () => ({}),
          text: async () => "",
        };
      }),
    );

    const { server } = createTestServer();
    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "delete_workflow",
      arguments: { workflowId: "wf-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Workflow deleted");
    expect(text).toContain("Old Workflow");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns error when workflow not found for deletion", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({ errors: [{ detail: "Not found" }] }, 404),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "delete_workflow",
      arguments: { workflowId: "bad-id" },
    });

    expect(result.isError).toBe(true);

    await mcpClient.close();
  });
});
