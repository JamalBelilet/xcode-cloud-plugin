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

describe("list_xcode_versions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns Xcode versions with included macOS versions", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          {
            type: "ciXcodeVersions",
            id: "xc-1",
            attributes: { name: "Xcode 15.2", version: "15E148" },
          },
          {
            type: "ciXcodeVersions",
            id: "xc-2",
            attributes: { name: "Xcode 16.0", version: "16A242d" },
          },
        ],
        included: [
          {
            type: "ciMacOsVersions",
            id: "mac-1",
            attributes: { name: "macOS Sonoma", version: "14.2" },
          },
          {
            type: "ciMacOsVersions",
            id: "mac-2",
            attributes: { name: "macOS Sequoia", version: "15.0" },
          },
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_xcode_versions",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("2 Xcode versions");
    expect(text).toContain("Xcode 15.2");
    expect(text).toContain("15E148");
    expect(text).toContain("xc-1");
    expect(text).toContain("Xcode 16.0");
    expect(text).toContain("macOS versions");
    expect(text).toContain("macOS Sonoma");
    expect(text).toContain("14.2");
    expect(text).toContain("macOS Sequoia");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns Xcode versions without macOS includes", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          {
            type: "ciXcodeVersions",
            id: "xc-1",
            attributes: { name: "Xcode 15.2", version: "15E148" },
          },
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_xcode_versions",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("1 Xcode version");
    expect(text).not.toContain("macOS versions");

    await mcpClient.close();
  });

  it("returns message when no Xcode versions found", async () => {
    const { server } = createTestServer();
    vi.stubGlobal("fetch", mockFetch({ data: [] }));

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_xcode_versions",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toBe("No Xcode versions found.");

    await mcpClient.close();
  });

  it("returns error on API failure", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({ errors: [{ detail: "Unauthorized" }] }, 401),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_xcode_versions",
      arguments: {},
    });

    expect(result.isError).toBe(true);

    await mcpClient.close();
  });
});

describe("list_macos_versions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted macOS version list", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          {
            type: "ciMacOsVersions",
            id: "mac-1",
            attributes: { name: "macOS Sonoma", version: "14.2" },
          },
          {
            type: "ciMacOsVersions",
            id: "mac-2",
            attributes: { name: "macOS Ventura", version: "13.6" },
          },
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_macos_versions",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("2 macOS versions");
    expect(text).toContain("macOS Sonoma");
    expect(text).toContain("14.2");
    expect(text).toContain("mac-1");
    expect(text).toContain("macOS Ventura");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns message when no macOS versions found", async () => {
    const { server } = createTestServer();
    vi.stubGlobal("fetch", mockFetch({ data: [] }));

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_macos_versions",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toBe("No macOS versions found.");

    await mcpClient.close();
  });
});
