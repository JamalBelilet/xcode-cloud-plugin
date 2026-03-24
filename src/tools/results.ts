import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppStoreConnectClient } from "../api/client.js";
import {
  getActionArtifacts,
  getActionIssues,
  getActionTestResults,
  getCiArtifact,
  getCiIssue,
} from "../api/ci-build-actions.js";
import { formatToolError } from "../api/errors.js";
import { formatFileSize } from "../util/formatting.js";

export function registerResultTools(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  server.tool(
    "get_build_issues",
    "Get all issues (errors, warnings, analyzer findings) from a specific build action. Use get_build first to find action IDs.",
    {
      buildActionId: z.string().min(1).describe("The build action ID"),
      limit: z.number().min(1).max(200).optional().describe("Max issues to return (default 50)"),
    },
    async ({ buildActionId, limit }) => {
      try {
        const issues = await getActionIssues(client, buildActionId, {
          limit: limit ?? 50,
        });

        if (issues.length === 0) {
          return {
            content: [{ type: "text", text: "No issues found for this action." }],
          };
        }

        const lines = issues.map((issue) => {
          const location = issue.fileSource
            ? ` at ${issue.fileSource.path}${issue.fileSource.lineNumber ? `:${issue.fileSource.lineNumber}` : ""}`
            : "";
          return `- [${issue.issueType}]${location}\n  ${issue.message}${issue.category ? ` (${issue.category})` : ""}`;
        });

        return {
          content: [
            {
              type: "text",
              text: `${issues.length} issue${issues.length > 1 ? "s" : ""}:\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "get_test_results",
    "Get test results from a specific test action in an Xcode Cloud build. Shows pass/fail for each test case. Use get_build first to find action IDs.",
    {
      buildActionId: z.string().min(1).describe("The build action ID (must be a TEST action)"),
      limit: z.number().min(1).max(200).optional().describe("Max results to return (default 100)"),
    },
    async ({ buildActionId, limit }) => {
      try {
        const results = await getActionTestResults(client, buildActionId, {
          limit: limit ?? 100,
        });

        if (results.length === 0) {
          return {
            content: [
              { type: "text", text: "No test results found for this action." },
            ],
          };
        }

        const passed = results.filter((r) => r.status === "SUCCESS").length;
        const failed = results.filter((r) => r.status === "FAILURE").length;
        const skipped = results.filter((r) => r.status === "SKIPPED").length;

        const summary = `${passed} passed, ${failed} failed, ${skipped} skipped (${results.length} total)`;

        const failedTests = results
          .filter((r) => r.status === "FAILURE")
          .map(
            (r) =>
              `- FAIL: ${r.className}.${r.name}${r.message ? `\n  ${r.message}` : ""}`,
          );

        let text = `Test results: ${summary}`;
        if (failedTests.length > 0) {
          text += `\n\n**Failures:**\n${failedTests.join("\n\n")}`;
        }

        return { content: [{ type: "text", text }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "get_build_artifacts",
    "List artifacts from a specific build action (logs, archives, test result bundles). Returns download URLs. Use get_build first to find action IDs.",
    {
      buildActionId: z.string().min(1).describe("The build action ID"),
    },
    async ({ buildActionId }) => {
      try {
        const artifacts = await getActionArtifacts(client, buildActionId);

        if (artifacts.length === 0) {
          return {
            content: [
              { type: "text", text: "No artifacts found for this action." },
            ],
          };
        }

        const lines = artifacts.map(
          (a) =>
            `- **${a.fileName}** (${a.fileType}, ${formatFileSize(a.fileSize)})\n  ID: \`${a.id}\`\n  Download: ${a.downloadUrl}`,
        );

        return {
          content: [
            {
              type: "text",
              text: `${artifacts.length} artifact${artifacts.length > 1 ? "s" : ""}:\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "get_artifact",
    "Get details and download URL for a specific artifact by ID",
    {
      artifactId: z.string().min(1).describe("The artifact ID"),
    },
    async ({ artifactId }) => {
      try {
        const artifact = await getCiArtifact(client, artifactId);

        return {
          content: [
            {
              type: "text",
              text: `**${artifact.fileName}** (${artifact.fileType}, ${formatFileSize(artifact.fileSize)})\nID: \`${artifact.id}\`\nDownload: ${artifact.downloadUrl}`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "get_issue",
    "Get details of a specific build issue by ID",
    {
      issueId: z.string().min(1).describe("The issue ID"),
    },
    async ({ issueId }) => {
      try {
        const issue = await getCiIssue(client, issueId);

        const location = issue.fileSource
          ? ` at ${issue.fileSource.path}${issue.fileSource.lineNumber ? `:${issue.fileSource.lineNumber}` : ""}`
          : "";

        return {
          content: [
            {
              type: "text",
              text: `[${issue.issueType}]${location}\n${issue.message}${issue.category ? `\nCategory: ${issue.category}` : ""}`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
