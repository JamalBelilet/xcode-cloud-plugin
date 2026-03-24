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

describe("get_build_issues", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted issues with mixed types", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          {
            type: "ciIssues",
            id: "issue-1",
            attributes: {
              issueType: "ERROR",
              message: "Cannot find type 'Foo'",
              fileSource: { path: "Sources/App.swift", lineNumber: 42 },
              category: "Compiler",
            },
          },
          {
            type: "ciIssues",
            id: "issue-2",
            attributes: {
              issueType: "WARNING",
              message: "Unused variable 'x'",
              fileSource: { path: "Sources/Utils.swift" },
              category: null,
            },
          },
          {
            type: "ciIssues",
            id: "issue-3",
            attributes: {
              issueType: "ANALYZER_WARNING",
              message: "Potential memory leak",
            },
          },
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_build_issues",
      arguments: { buildActionId: "action-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("3 issues");
    expect(text).toContain("[ERROR]");
    expect(text).toContain("Sources/App.swift:42");
    expect(text).toContain("Cannot find type 'Foo'");
    expect(text).toContain("(Compiler)");
    expect(text).toContain("[WARNING]");
    expect(text).toContain("Sources/Utils.swift");
    expect(text).toContain("[ANALYZER_WARNING]");
    expect(text).toContain("Potential memory leak");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns message when no issues found", async () => {
    const { server } = createTestServer();
    vi.stubGlobal("fetch", mockFetch({ data: [] }));

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_build_issues",
      arguments: { buildActionId: "action-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toBe("No issues found for this action.");

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
      name: "get_build_issues",
      arguments: { buildActionId: "action-1" },
    });

    expect(result.isError).toBe(true);

    await mcpClient.close();
  });
});

describe("get_test_results", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows failures with summary", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          {
            type: "ciTestResults",
            id: "tr-1",
            attributes: {
              className: "LoginTests",
              name: "testLoginSuccess",
              status: "SUCCESS",
            },
          },
          {
            type: "ciTestResults",
            id: "tr-2",
            attributes: {
              className: "LoginTests",
              name: "testLoginFailure",
              status: "FAILURE",
              message: "XCTAssertEqual failed: expected 200 got 401",
            },
          },
          {
            type: "ciTestResults",
            id: "tr-3",
            attributes: {
              className: "LoginTests",
              name: "testLoginSkipped",
              status: "SKIPPED",
            },
          },
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_test_results",
      arguments: { buildActionId: "action-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("1 passed");
    expect(text).toContain("1 failed");
    expect(text).toContain("1 skipped");
    expect(text).toContain("3 total");
    expect(text).toContain("Failures");
    expect(text).toContain("LoginTests.testLoginFailure");
    expect(text).toContain("XCTAssertEqual failed");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("shows all passing with no failures section", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          {
            type: "ciTestResults",
            id: "tr-1",
            attributes: {
              className: "AppTests",
              name: "testOne",
              status: "SUCCESS",
            },
          },
          {
            type: "ciTestResults",
            id: "tr-2",
            attributes: {
              className: "AppTests",
              name: "testTwo",
              status: "SUCCESS",
            },
          },
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_test_results",
      arguments: { buildActionId: "action-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("2 passed");
    expect(text).toContain("0 failed");
    expect(text).not.toContain("Failures");

    await mcpClient.close();
  });

  it("returns message when no test results found", async () => {
    const { server } = createTestServer();
    vi.stubGlobal("fetch", mockFetch({ data: [] }));

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_test_results",
      arguments: { buildActionId: "action-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toBe("No test results found for this action.");

    await mcpClient.close();
  });
});

describe("get_build_artifacts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted artifact list", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          {
            type: "ciArtifacts",
            id: "art-1",
            attributes: {
              fileName: "build.log",
              fileType: "BUILD_LOG",
              fileSize: 2048,
              downloadUrl: "https://example.com/build.log",
            },
          },
          {
            type: "ciArtifacts",
            id: "art-2",
            attributes: {
              fileName: "App.xcarchive",
              fileType: "ARCHIVE",
              fileSize: 52428800,
              downloadUrl: "https://example.com/app.xcarchive",
            },
          },
        ],
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_build_artifacts",
      arguments: { buildActionId: "action-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("2 artifacts");
    expect(text).toContain("build.log");
    expect(text).toContain("BUILD_LOG");
    expect(text).toContain("2.0 KB");
    expect(text).toContain("App.xcarchive");
    expect(text).toContain("50.0 MB");
    expect(text).toContain("https://example.com/build.log");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns message when no artifacts found", async () => {
    const { server } = createTestServer();
    vi.stubGlobal("fetch", mockFetch({ data: [] }));

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_build_artifacts",
      arguments: { buildActionId: "action-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toBe("No artifacts found for this action.");

    await mcpClient.close();
  });
});

describe("get_artifact", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns single artifact details", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: {
          type: "ciArtifacts",
          id: "art-1",
          attributes: {
            fileName: "result.xcresult",
            fileType: "TEST_RESULTS",
            fileSize: 1048576,
            downloadUrl: "https://example.com/result.xcresult",
          },
        },
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_artifact",
      arguments: { artifactId: "art-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("result.xcresult");
    expect(text).toContain("TEST_RESULTS");
    expect(text).toContain("1.0 MB");
    expect(text).toContain("art-1");
    expect(text).toContain("https://example.com/result.xcresult");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });
});

describe("get_issue", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns issue details with file location", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: {
          type: "ciIssues",
          id: "issue-1",
          attributes: {
            issueType: "ERROR",
            message: "Use of undeclared type 'Foo'",
            fileSource: { path: "Sources/Main.swift", lineNumber: 10 },
            category: "Semantic Issue",
          },
        },
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_issue",
      arguments: { issueId: "issue-1" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("[ERROR]");
    expect(text).toContain("Sources/Main.swift:10");
    expect(text).toContain("Use of undeclared type 'Foo'");
    expect(text).toContain("Semantic Issue");
    expect(result.isError).toBeFalsy();

    await mcpClient.close();
  });

  it("returns issue without file location", async () => {
    const { server } = createTestServer();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: {
          type: "ciIssues",
          id: "issue-2",
          attributes: {
            issueType: "WARNING",
            message: "Deprecation warning",
          },
        },
      }),
    );

    const mcpClient = await connectServerAndClient(server);
    const result = await mcpClient.callTool({
      name: "get_issue",
      arguments: { issueId: "issue-2" },
    });

    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("[WARNING]");
    expect(text).toContain("Deprecation warning");
    expect(text).not.toContain(" at ");

    await mcpClient.close();
  });
});
