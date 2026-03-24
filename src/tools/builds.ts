import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppStoreConnectClient } from "../api/client.js";
import { getProductBuildRuns } from "../api/ci-products.js";
import {
  getCiBuildRun,
  getBuildRunActions,
  startBuildRun,
  retryBuildRun,
  listAllBuildRuns,
} from "../api/ci-build-runs.js";
import { getWorkflowBuildRuns } from "../api/ci-workflows.js";
import { formatToolError } from "../api/errors.js";
import {
  formatBuildStatus,
  formatDate,
  formatDuration,
  formatIssueCounts,
} from "../util/formatting.js";

export function registerBuildTools(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  server.tool(
    "list_builds",
    "List recent Xcode Cloud build runs. Can scope to a product, workflow, or list all builds globally. Supports filtering by completion status.",
    {
      productId: z.string().min(1).optional().describe("CI product ID (optional)"),
      workflowId: z.string().min(1).optional().describe("Workflow ID (optional)"),
      limit: z.number().min(1).max(200).optional().describe("Max builds to return (default 10)"),
      status: z.enum(["SUCCEEDED", "FAILED", "ERRORED", "CANCELED", "SKIPPED"]).optional().describe("Filter by completion status"),
    },
    async ({ productId, workflowId, limit, status }) => {
      try {
        let builds;
        if (productId) {
          builds = await getProductBuildRuns(client, productId, { limit: limit ?? 10, status });
        } else if (workflowId) {
          builds = await getWorkflowBuildRuns(client, workflowId!, { limit: limit ?? 10, status });
        } else {
          builds = await listAllBuildRuns(client, { limit: limit ?? 10, status });
        }

        if (builds.length === 0) {
          return { content: [{ type: "text", text: "No builds found." }] };
        }

        const lines = builds.map((b) => {
          const commit = b.sourceCommit
            ? ` — ${b.sourceCommit.commitSha.slice(0, 7)}`
            : "";
          const issues =
            b.issueCounts &&
            (b.issueCounts.errors > 0 || b.issueCounts.testFailures > 0)
              ? `\n  Issues: ${formatIssueCounts(b.issueCounts)}`
              : "";
          return `- ${formatBuildStatus(b)}${commit}\n  Reason: ${b.startReason} | Started: ${b.startedDate ? formatDate(b.startedDate) : "pending"}\n  ID: \`${b.id}\`${issues}`;
        });

        return {
          content: [
            {
              type: "text",
              text: `${builds.length} build${builds.length > 1 ? "s" : ""}:\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "get_build",
    "Get detailed status of a specific Xcode Cloud build run, including all its actions (build, test, analyze, archive), issues summary, and source commit info",
    { buildRunId: z.string().min(1).describe("The build run ID") },
    async ({ buildRunId }) => {
      try {
        const [run, actions] = await Promise.all([
          getCiBuildRun(client, buildRunId),
          getBuildRunActions(client, buildRunId),
        ]);

        const parts: string[] = [formatBuildStatus(run)];

        if (run.sourceCommit) {
          parts.push(
            `Commit: ${run.sourceCommit.commitSha.slice(0, 7)}${run.sourceCommit.author ? ` by ${run.sourceCommit.author.displayName}` : ""}`,
          );
          if (run.sourceCommit.message) {
            parts.push(`Message: ${run.sourceCommit.message.split("\n")[0]}`);
          }
        }

        parts.push(`Reason: ${run.startReason}`);
        if (run.isPullRequestBuild) parts.push("Pull request build: yes");
        if (run.issueCounts) parts.push(`Issues: ${formatIssueCounts(run.issueCounts)}`);

        if (actions.length > 0) {
          parts.push("");
          parts.push("**Actions:**");
          for (const action of actions) {
            const status =
              action.executionProgress === "COMPLETE"
                ? (action.completionStatus ?? "UNKNOWN")
                : action.executionProgress;
            const duration =
              action.startedDate && action.finishedDate
                ? ` (${formatDuration(action.startedDate, action.finishedDate)})`
                : "";
            const issues =
              action.issueCounts &&
              (action.issueCounts.errors > 0 ||
                action.issueCounts.testFailures > 0)
                ? ` — ${formatIssueCounts(action.issueCounts)}`
                : "";
            parts.push(
              `- ${action.name} [${action.actionType}]: ${status}${duration}${issues}\n  Action ID: \`${action.id}\``,
            );
          }
        }

        return { content: [{ type: "text", text: parts.join("\n") }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "start_build",
    "Start a new Xcode Cloud build run for a workflow. Optionally specify a git reference (branch/tag) and whether to do a clean build.",
    {
      workflowId: z.string().min(1).describe("The workflow ID to run"),
      gitReferenceId: z
        .string()
        .min(1)
        .optional()
        .describe("Git reference ID (branch/tag) to build. Use list_git_references to find IDs."),
      clean: z.boolean().optional().describe("Whether to perform a clean build (default false)"),
    },
    async ({ workflowId, gitReferenceId, clean }) => {
      try {
        const run = await startBuildRun(client, workflowId, {
          gitReferenceId,
          clean,
        });

        return {
          content: [
            {
              type: "text",
              text: `Build started: ${formatBuildStatus(run)}\nID: \`${run.id}\`\n\nUse get_build with this ID to check progress.`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "retry_build",
    "Retry (re-run) an existing Xcode Cloud build run",
    { buildRunId: z.string().min(1).describe("The build run ID to retry") },
    async ({ buildRunId }) => {
      try {
        const run = await retryBuildRun(client, buildRunId);

        return {
          content: [
            {
              type: "text",
              text: `Build retried: ${formatBuildStatus(run)}\nNew ID: \`${run.id}\`\n\nUse get_build with this ID to check progress.`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
