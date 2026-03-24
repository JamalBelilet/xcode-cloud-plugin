import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppStoreConnectClient } from "../api/client.js";
import { getProductWorkflows } from "../api/ci-products.js";
import { getCiWorkflow, listAllCiWorkflows, updateCiWorkflow, deleteCiWorkflow } from "../api/ci-workflows.js";
import { formatToolError } from "../api/errors.js";
import { formatDate } from "../util/formatting.js";

export function registerWorkflowTools(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  server.tool(
    "list_workflows",
    "List Xcode Cloud workflows. If productId is provided, lists workflows for that product. Otherwise lists all workflows.",
    { productId: z.string().min(1).optional().describe("CI product ID (optional — omit to list all workflows)") },
    async ({ productId }) => {
      try {
        const workflows = productId
          ? await getProductWorkflows(client, productId)
          : await listAllCiWorkflows(client);

        if (workflows.length === 0) {
          return {
            content: [{ type: "text", text: productId ? "No workflows found for this product." : "No workflows found." }],
          };
        }

        const lines = workflows.map(
          (w) =>
            `- **${w.name}** ${w.isEnabled ? "(enabled)" : "(disabled)"}\n  ID: \`${w.id}\`\n  ${w.description || "No description"}\n  Last modified: ${formatDate(w.lastModifiedDate)}`,
        );

        return {
          content: [
            {
              type: "text",
              text: `Found ${workflows.length} workflow${workflows.length > 1 ? "s" : ""}:\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "get_workflow",
    "Get full details of an Xcode Cloud workflow, including its configuration",
    { workflowId: z.string().min(1).describe("The workflow ID") },
    async ({ workflowId }) => {
      try {
        const workflow = await getCiWorkflow(client, workflowId);

        const text = [
          `**${workflow.name}** ${workflow.isEnabled ? "(enabled)" : "(disabled)"}`,
          `ID: \`${workflow.id}\``,
          workflow.description ? `Description: ${workflow.description}` : null,
          `Last modified: ${formatDate(workflow.lastModifiedDate)}`,
          workflow.isLockedForEditing ? "Locked for editing" : null,
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
    "update_workflow",
    "Update an Xcode Cloud workflow. Can enable/disable, rename, or change description.",
    {
      workflowId: z.string().min(1).describe("The workflow ID to update"),
      name: z.string().min(1).optional().describe("New workflow name"),
      description: z.string().optional().describe("New workflow description"),
      isEnabled: z.boolean().optional().describe("Enable or disable the workflow"),
    },
    async ({ workflowId, name, description, isEnabled }) => {
      try {
        if (name === undefined && description === undefined && isEnabled === undefined) {
          return {
            content: [{ type: "text", text: "Error: provide at least one field to update (name, description, or isEnabled)" }],
            isError: true,
          };
        }

        const workflow = await updateCiWorkflow(client, workflowId, {
          name,
          description,
          isEnabled,
        });

        const changes: string[] = [];
        if (name !== undefined) changes.push(`name → "${workflow.name}"`);
        if (description !== undefined) changes.push(`description → "${workflow.description}"`);
        if (isEnabled !== undefined) changes.push(`enabled → ${workflow.isEnabled}`);

        return {
          content: [
            {
              type: "text",
              text: `Workflow updated: **${workflow.name}**\nID: \`${workflow.id}\`\nChanges: ${changes.join(", ")}`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "delete_workflow",
    "Delete an Xcode Cloud workflow and all its associated builds and data. This action is irreversible.",
    {
      workflowId: z.string().min(1).describe("The workflow ID to delete"),
    },
    async ({ workflowId }) => {
      try {
        // Fetch workflow details first so we can confirm what was deleted
        const workflow = await getCiWorkflow(client, workflowId);
        await deleteCiWorkflow(client, workflowId);

        return {
          content: [
            {
              type: "text",
              text: `Workflow deleted: **${workflow.name}** (\`${workflowId}\`).\nAll associated builds and data have been removed.`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
