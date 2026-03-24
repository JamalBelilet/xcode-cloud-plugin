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

describe("list_scm_providers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted provider list", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          {
            type: "scmProviders",
            id: "prov-1",
            attributes: { scmProviderType: "GITHUB" },
          },
          {
            type: "scmProviders",
            id: "prov-2",
            attributes: { scmProviderType: "BITBUCKET_CLOUD" },
          },
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_scm_providers",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("2 SCM providers");
    expect(text).toContain("GITHUB");
    expect(text).toContain("prov-1");
    expect(text).toContain("BITBUCKET_CLOUD");
    expect(text).toContain("prov-2");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns message when no providers found", async () => {
    const { server } = createTestServer();
    vi.stubGlobal("fetch", mockFetch({ data: [] }));

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_scm_providers",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toBe("No SCM providers connected.");

    await mcpClient.close();
  });

  it("returns error on API failure", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({ errors: [{ detail: "Server error" }] }, 500),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_scm_providers",
      arguments: {},
    });

    expect(result.isError).toBe(true);

    await mcpClient.close();
  });
});

describe("list_scm_repositories", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted repository list", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          {
            type: "scmRepositories",
            id: "repo-1",
            attributes: {
              ownerName: "my-org",
              repositoryName: "ios-app",
              httpCloneUrl: "https://github.com/my-org/ios-app.git",
            },
          },
          {
            type: "scmRepositories",
            id: "repo-2",
            attributes: {
              ownerName: "my-org",
              repositoryName: "shared-lib",
              httpCloneUrl: null,
            },
          },
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_scm_repositories",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("2 repositories");
    expect(text).toContain("my-org/ios-app");
    expect(text).toContain("repo-1");
    expect(text).toContain("https://github.com/my-org/ios-app.git");
    expect(text).toContain("my-org/shared-lib");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns message when no repositories found", async () => {
    const { server } = createTestServer();
    vi.stubGlobal("fetch", mockFetch({ data: [] }));

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_scm_repositories",
      arguments: {},
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toBe("No repositories found.");

    await mcpClient.close();
  });
});

describe("get_scm_repository", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns repository details with clone URLs", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: {
          type: "scmRepositories",
          id: "repo-1",
          attributes: {
            ownerName: "my-org",
            repositoryName: "ios-app",
            httpCloneUrl: "https://github.com/my-org/ios-app.git",
            sshCloneUrl: "git@github.com:my-org/ios-app.git",
          },
        },
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_scm_repository",
      arguments: { repositoryId: "repo-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("my-org/ios-app");
    expect(text).toContain("repo-1");
    expect(text).toContain("HTTP: https://github.com/my-org/ios-app.git");
    expect(text).toContain("SSH: git@github.com:my-org/ios-app.git");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns error when repository not found", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({ errors: [{ detail: "Not found" }] }, 404),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_scm_repository",
      arguments: { repositoryId: "bad-id" },
    });

    expect(result.isError).toBe(true);

    await mcpClient.close();
  });
});

describe("list_git_references", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns branches and tags grouped", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          {
            type: "scmGitReferences",
            id: "ref-1",
            attributes: {
              name: "main",
              canonicalName: "refs/heads/main",
              kind: "BRANCH",
              isDeleted: false,
            },
          },
          {
            type: "scmGitReferences",
            id: "ref-2",
            attributes: {
              name: "develop",
              canonicalName: "refs/heads/develop",
              kind: "BRANCH",
              isDeleted: false,
            },
          },
          {
            type: "scmGitReferences",
            id: "ref-3",
            attributes: {
              name: "v1.0.0",
              canonicalName: "refs/tags/v1.0.0",
              kind: "TAG",
              isDeleted: false,
            },
          },
          {
            type: "scmGitReferences",
            id: "ref-deleted",
            attributes: {
              name: "old-branch",
              canonicalName: "refs/heads/old-branch",
              kind: "BRANCH",
              isDeleted: true,
            },
          },
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_git_references",
      arguments: { repositoryId: "repo-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Branches");
    expect(text).toContain("(2)");
    expect(text).toContain("main");
    expect(text).toContain("ref-1");
    expect(text).toContain("develop");
    expect(text).toContain("Tags");
    expect(text).toContain("(1)");
    expect(text).toContain("v1.0.0");
    expect(text).toContain("ref-3");
    expect(text).not.toContain("old-branch");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns message when no references found", async () => {
    const { server } = createTestServer();
    vi.stubGlobal("fetch", mockFetch({ data: [] }));

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_git_references",
      arguments: { repositoryId: "repo-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toBe("No git references found for this repository.");

    await mcpClient.close();
  });

  it("returns error on API failure", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({ errors: [{ detail: "Forbidden" }] }, 403),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "list_git_references",
      arguments: { repositoryId: "repo-1" },
    });

    expect(result.isError).toBe(true);

    await mcpClient.close();
  });
});
