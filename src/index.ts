import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TokenManager } from "./auth/jwt.js";
import { AppStoreConnectClient } from "./api/client.js";
import { tryLoadConfig } from "./util/config.js";
import { registerAllTools } from "./tools/register.js";

const { config, error: configError } = tryLoadConfig();
const tokenManager = config ? new TokenManager(config) : null;
const client = new AppStoreConnectClient(tokenManager, configError);

const server = new McpServer({
  name: "xcode-cloud",
  version: "1.0.0",
});

registerAllTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
