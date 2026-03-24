import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppStoreConnectClient } from "../api/client.js";
import {
  listGitReferences,
  listScmProviders,
  listScmRepositories,
  getScmRepository,
} from "../api/scm.js";
import { formatToolError } from "../api/errors.js";

export function registerScmTools(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  server.tool(
    "list_scm_providers",
    "List all source control providers (GitHub, Bitbucket, GitLab) connected to your App Store Connect account",
    {},
    async () => {
      try {
        const providers = await listScmProviders(client);

        if (providers.length === 0) {
          return {
            content: [{ type: "text", text: "No SCM providers connected." }],
          };
        }

        const lines = providers.map(
          (p) =>
            `- **${p.scmProviderType}**\n  ID: \`${p.id}\``,
        );

        return {
          content: [
            {
              type: "text",
              text: `${providers.length} SCM provider${providers.length > 1 ? "s" : ""} connected:\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "list_scm_repositories",
    "List all source code repositories connected to Xcode Cloud",
    {
      limit: z.number().min(1).max(200).optional().describe("Max repositories to return (default 50)"),
    },
    async ({ limit }) => {
      try {
        const repos = await listScmRepositories(client, { limit: limit ?? 50 });

        if (repos.length === 0) {
          return {
            content: [{ type: "text", text: "No repositories found." }],
          };
        }

        const lines = repos.map(
          (r) =>
            `- **${r.ownerName}/${r.repositoryName}**\n  ID: \`${r.id}\`${r.httpCloneUrl ? `\n  URL: ${r.httpCloneUrl}` : ""}`,
        );

        return {
          content: [
            {
              type: "text",
              text: `${repos.length} repositor${repos.length > 1 ? "ies" : "y"}:\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "get_scm_repository",
    "Get details of a specific source code repository connected to Xcode Cloud",
    {
      repositoryId: z.string().min(1).describe("The SCM repository ID"),
    },
    async ({ repositoryId }) => {
      try {
        const repo = await getScmRepository(client, repositoryId);

        const text = [
          `**${repo.ownerName}/${repo.repositoryName}**`,
          `ID: \`${repo.id}\``,
          repo.httpCloneUrl ? `HTTP: ${repo.httpCloneUrl}` : null,
          repo.sshCloneUrl ? `SSH: ${repo.sshCloneUrl}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        return { content: [{ type: "text", text }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "list_git_references",
    "List branches and tags for a repository connected to Xcode Cloud. Useful for finding the git reference ID needed to start a build on a specific branch.",
    {
      repositoryId: z.string().min(1).describe("The SCM repository ID (use get_ci_product to find it)"),
      limit: z.number().min(1).max(200).optional().describe("Max references to return (default 50)"),
    },
    async ({ repositoryId, limit }) => {
      try {
        const refs = await listGitReferences(client, repositoryId, {
          limit: limit ?? 50,
        });

        if (refs.length === 0) {
          return {
            content: [
              { type: "text", text: "No git references found for this repository." },
            ],
          };
        }

        const branches = refs.filter((r) => r.kind === "BRANCH" && !r.isDeleted);
        const tags = refs.filter((r) => r.kind === "TAG" && !r.isDeleted);

        const parts: string[] = [];

        if (branches.length > 0) {
          const branchLines = branches.map(
            (b) => `- ${b.name}\n  ID: \`${b.id}\``,
          );
          parts.push(`**Branches** (${branches.length}):\n${branchLines.join("\n")}`);
        }

        if (tags.length > 0) {
          const tagLines = tags.map((t) => `- ${t.name}\n  ID: \`${t.id}\``);
          parts.push(`**Tags** (${tags.length}):\n${tagLines.join("\n")}`);
        }

        return {
          content: [{ type: "text", text: parts.join("\n\n") }],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
