import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["/Users/ziahmco/opensource/billionmail-mcp/dist/index.js"],
  env: process.env,
});

const client = new Client({ name: "test-client", version: "1.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`\n✅ Total tools registered: ${tools.length}\n`);
tools.forEach(t => console.log(`  - ${t.name}`));

const now = Math.floor(Date.now() / 1000);
const tests: [string, Record<string, any>][] = [
  ["get_version", {}],
  ["list_domains", {}],
  ["get_all_domains", {}],
  ["refresh_dns_records", { domain: "rako.sh" }],
  ["list_mailboxes", {}],
  ["get_all_mailboxes", {}],
  ["get_all_emails", {}],
  ["list_contact_groups", { page: 1, page_size: 5 }],
  ["get_all_contact_groups", {}],
  ["list_contacts", { page: 1, page_size: 5, status: 1 }],
  ["get_contact_trend", { time_interval: 7 }],
  ["list_templates", { page: 1, page_size: 5 }],
  ["get_all_templates", {}],
  ["list_send_apis", { page: 1, page_size: 5 }],
  ["get_send_api_stats", { start_time: now - 86400 * 7, end_time: now }],
  ["list_campaign_tasks", { page: 1, page_size: 5 }],
  ["get_campaign_overview", { start_time: now - 86400 * 7, end_time: now }],
  ["list_relay_configs", {}],
  ["get_unbound_domains", {}],
  ["get_overview", { start_time: now - 86400, end_time: now }],
  ["get_failed_list", { start_time: now - 86400, end_time: now }],
  ["get_system_config", {}],
  ["get_timezones", {}],
  ["list_tags", { page: 1, page_size: 5 }],
  ["get_all_tags", {}],
  ["list_operation_logs", { page: 1, page_size: 5 }],
  ["get_latest_output_log", {}],
  ["list_bcc_rules", {}],
  ["list_mail_forwards", {}],
  ["list_postfix_queue", {}],
  ["check_domain_blacklist", { domain: "rako.sh" }],
];

console.log("\n🔧 Testing tool calls via MCP protocol:\n");
let passed = 0;
for (const [name, args] of tests) {
  try {
    const result = await client.callTool({ name, arguments: args });
    const text = (result.content as any)[0]?.text || "";
    const preview = text.substring(0, 80).replace(/\n/g, " ");
    console.log(`  ✅ ${name}: ${preview}...`);
    passed++;
  } catch (err: any) {
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

console.log(`\n${"═".repeat(50)}`);
console.log(`Results: ${passed}/${tests.length} MCP tool calls passed`);
console.log(`${"═".repeat(50)}`);

await client.close();
process.exit(passed === tests.length ? 0 : 1);
