import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppStoreConnectClient } from "../api/client.js";
import { listXcodeVersions, listMacOsVersions } from "../api/ci-environments.js";
import { formatToolError } from "../api/errors.js";

export function registerEnvironmentTools(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  server.tool(
    "list_xcode_versions",
    "List all Xcode versions available for Xcode Cloud builds, with their compatible macOS versions",
    {},
    async () => {
      try {
        const { xcodeVersions, macOsVersions } = await listXcodeVersions(client);

        if (xcodeVersions.length === 0) {
          return {
            content: [{ type: "text", text: "No Xcode versions found." }],
          };
        }

        const lines = xcodeVersions.map((xc) => {
          return `- **${xc.name}** (${xc.version})\n  ID: \`${xc.id}\``;
        });

        let text = `${xcodeVersions.length} Xcode version${xcodeVersions.length > 1 ? "s" : ""} available:\n\n${lines.join("\n\n")}`;

        if (macOsVersions.length > 0) {
          const macLines = macOsVersions.map(
            (m) => `- ${m.name} (${m.version})`,
          );
          text += `\n\nmacOS versions:\n${macLines.join("\n")}`;
        }

        return { content: [{ type: "text", text }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "list_macos_versions",
    "List all macOS versions available for Xcode Cloud builds",
    {},
    async () => {
      try {
        const macOsVersions = await listMacOsVersions(client);

        if (macOsVersions.length === 0) {
          return {
            content: [{ type: "text", text: "No macOS versions found." }],
          };
        }

        const lines = macOsVersions.map(
          (m) => `- **${m.name}** (${m.version})\n  ID: \`${m.id}\``,
        );

        return {
          content: [
            {
              type: "text",
              text: `${macOsVersions.length} macOS version${macOsVersions.length > 1 ? "s" : ""} available:\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
