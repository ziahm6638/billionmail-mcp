import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const [toolName, argsJson] = process.argv.slice(2);
if (!toolName) { console.error("Usage: npx tsx test/run-tool.ts <tool_name> [args_json]"); process.exit(1); }

const serverPath = new URL("../dist/index.js", import.meta.url).pathname;
const transport = new StdioClientTransport({
  command: "node",
  args: [serverPath],
  env: process.env,
});

const client = new Client({ name: "cli", version: "1.0" });
await client.connect(transport);

const args = argsJson ? JSON.parse(argsJson) : {};
const result = await client.callTool({ name: toolName, arguments: args });
console.log((result.content as any)[0].text);

await client.close();
