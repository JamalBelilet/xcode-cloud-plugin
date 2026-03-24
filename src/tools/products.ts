import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCiProduct, listCiProducts } from "../api/ci-products.js";
import type { AppStoreConnectClient } from "../api/client.js";
import { formatToolError } from "../api/errors.js";
import { formatDate } from "../util/formatting.js";

export function registerProductTools(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  server.tool(
    "list_ci_products",
    "List all Xcode Cloud CI products (apps/frameworks) configured in your App Store Connect account",
    { limit: z.number().min(1).max(200).optional().describe("Max products to return (default 50)") },
    async ({ limit }) => {
      try {
        const products = await listCiProducts(client, { limit: limit ?? 50 });

        if (products.length === 0) {
          return { content: [{ type: "text", text: "No CI products found." }] };
        }

        const lines = products.map(
          (p) =>
            `- **${p.name}** (${p.productType})\n  ID: \`${p.id}\`\n  Created: ${formatDate(p.createdDate)}`,
        );

        return {
          content: [
            {
              type: "text",
              text: `Found ${products.length} CI product${products.length > 1 ? "s" : ""}:\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "get_ci_product",
    "Get details of a specific Xcode Cloud CI product, including its linked repositories",
    { productId: z.string().min(1).describe("The CI product ID") },
    async ({ productId }) => {
      try {
        const { product, repositories } = await getCiProduct(client, productId);

        let text = `**${product.name}** (${product.productType})\nID: \`${product.id}\`\nCreated: ${formatDate(product.createdDate)}`;

        if (repositories.length > 0) {
          const repoLines = repositories.map(
            (r) =>
              `  - ${r.ownerName}/${r.repositoryName} (ID: \`${r.id}\`)`,
          );
          text += `\n\nLinked repositories:\n${repoLines.join("\n")}`;
        }

        return { content: [{ type: "text", text }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
