import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppStoreConnectClient } from "../api/client.js";
import { registerProductTools } from "./products.js";
import { registerWorkflowTools } from "./workflows.js";
import { registerBuildTools } from "./builds.js";
import { registerResultTools } from "./results.js";
import { registerEnvironmentTools } from "./environments.js";
import { registerScmTools } from "./scm.js";

export function registerAllTools(
  server: McpServer,
  client: AppStoreConnectClient,
): void {
  registerProductTools(server, client);
  registerWorkflowTools(server, client);
  registerBuildTools(server, client);
  registerResultTools(server, client);
  registerEnvironmentTools(server, client);
  registerScmTools(server, client);
}
