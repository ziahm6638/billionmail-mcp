/**
 * Integration test for billionmail-mcp-server
 * Tests all tool categories against a live BillionMail instance.
 *
 * Usage: BILLIONMAIL_BASE_URL=https://mail.rako.sh BILLIONMAIL_USER=billion BILLIONMAIL_PASSWORD=billion npx tsx test/integration.test.ts
 */

import { BillionMailClient } from "../src/client.js";

const baseUrl = process.env.BILLIONMAIL_BASE_URL;
const username = process.env.BILLIONMAIL_USER;
const password = process.env.BILLIONMAIL_PASSWORD;
const safePath = process.env.BILLIONMAIL_SAFE_PATH;

if (!baseUrl || !username || !password) {
  console.error("Set BILLIONMAIL_BASE_URL, BILLIONMAIL_USER, BILLIONMAIL_PASSWORD (optional: BILLIONMAIL_SAFE_PATH)");
  process.exit(1);
}

const client = new BillionMailClient(baseUrl, username, password, safePath);

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err: any) {
    failed++;
    failures.push(`${name}: ${err.message}`);
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// ─── AUTH ───
console.log("\n🔐 Auth");
await test("login and get token", async () => {
  const res = await client.get("/settings/get_version");
  assert(res.success, `login failed: ${res.msg}`);
});

// ─── DOMAINS ───
console.log("\n🌐 Domains");
await test("list_domains", async () => {
  const res = await client.get("/domains/list", { page: 1, page_size: 10 });
  assert(res.success, res.msg);
});

await test("get_all_domains", async () => {
  const res = await client.get("/domains/all");
  assert(res.success, res.msg);
});

await test("refresh_dns_records", async () => {
  const domains = await client.get<any[]>("/domains/all");
  if (domains.data?.length > 0) {
    const res = await client.post("/domains/fresh_dns_records", { domain: domains.data[0].domain });
    assert(res.success, res.msg);
  }
});

// ─── MAILBOXES ───
console.log("\n📬 Mailboxes");
await test("list_mailboxes", async () => {
  const res = await client.get("/mailbox/list", { page: 1, page_size: 10 });
  assert(res.success, res.msg);
});

await test("get_all_mailboxes", async () => {
  const res = await client.get("/mailbox/all");
  assert(res.success, res.msg);
});

await test("get_all_emails", async () => {
  const res = await client.get("/mailbox/all_email");
  assert(res.success, res.msg);
});

// ─── CONTACTS ───
console.log("\n👥 Contacts");
let testGroupId: number | null = null;

await test("list_contact_groups", async () => {
  const res = await client.get("/contact/group/list", { page: 1, page_size: 10 });
  assert(res.success, res.msg);
});

await test("get_all_contact_groups", async () => {
  const res = await client.get("/contact/group/all");
  assert(res.success, res.msg);
});

await test("create_contact_group", async () => {
  const res = await client.post<any>("/contact/group/create", {
    name: `mcp-test-${Date.now()}`,
    description: "Integration test group",
    create_type: 1,
  });
  assert(res.success, res.msg);
  testGroupId = res.data?.group_id || res.data?.id;
});

await test("list_contacts", async () => {
  const res = await client.get("/contact/list", { page: 1, page_size: 10, status: 1 });
  assert(res.success, res.msg);
});

await test("get_contact_trend", async () => {
  const res = await client.get("/contact/trend", { time_interval: 7 });
  assert(res.success, res.msg);
});

if (testGroupId) {
  await test("import_contacts", async () => {
    const res = await client.post("/contact/group/import", {
      group_ids: [testGroupId],
      contacts: "test-mcp@example.com\ntest-mcp2@example.com",
      import_type: 2,
      default_active: 1,
    });
    assert(res.success, res.msg);
  });

  await test("get_group_info", async () => {
    const res = await client.get("/contact/group/info", { group_id: testGroupId });
    assert(res.success, res.msg);
  });

  await test("delete_contact_group", async () => {
    const res = await client.post("/contact/group/delete", { group_ids: [testGroupId] });
    assert(res.success, res.msg);
  });
}

// ─── TEMPLATES ───
console.log("\n📝 Templates");
let testTemplateId: number | null = null;

await test("list_templates", async () => {
  const res = await client.get("/email_template/list", { page: 1, page_size: 10, add_type: -1 });
  assert(res.success, res.msg);
});

await test("get_all_templates", async () => {
  const res = await client.get("/email_template/all");
  assert(res.success, res.msg);
});

await test("create_template", async () => {
  const res = await client.post<any>("/email_template/create", {
    temp_name: `mcp-test-${Date.now()}`,
    add_type: 0,
    html_content: "<html><body><h1>Test</h1><p>MCP integration test</p></body></html>",
  });
  assert(res.success, res.msg);
  testTemplateId = res.data?.id;
});

if (testTemplateId) {
  await test("get_template", async () => {
    const res = await client.get("/email_template/get", { id: testTemplateId });
    assert(res.success, res.msg);
  });

  await test("update_template", async () => {
    const res = await client.post("/email_template/update", {
      id: testTemplateId,
      temp_name: `mcp-test-updated-${Date.now()}`,
    });
    assert(res.success, res.msg);
  });

  await test("copy_template", async () => {
    const res = await client.post<any>("/email_template/copy", { id: testTemplateId });
    assert(res.success, res.msg);
    if (res.data?.id) {
      await client.post("/email_template/delete", { id: res.data.id });
    }
  });

  await test("delete_template", async () => {
    const res = await client.post("/email_template/delete", { id: testTemplateId });
    assert(res.success, res.msg);
  });
}

// ─── SEND API ───
console.log("\n📤 Send API");
await test("list_send_apis", async () => {
  const res = await client.get("/batch_mail/api/list", { page: 1, page_size: 10 });
  assert(res.success, res.msg);
});

await test("get_send_api_stats", async () => {
  const now = Math.floor(Date.now() / 1000);
  const res = await client.get("/batch_mail/api/overview_stats", {
    start_time: now - 86400 * 7,
    end_time: now,
  });
  assert(res.success, res.msg);
});

// ─── CAMPAIGNS ───
console.log("\n📧 Campaigns");
await test("list_campaign_tasks", async () => {
  const res = await client.get("/batch_mail/task/list", { page: 1, page_size: 10, status: -1 });
  assert(res.success, res.msg);
});

await test("get_campaign_overview", async () => {
  const now = Math.floor(Date.now() / 1000);
  const res = await client.get("/batch_mail/task/overview", {
    start_time: now - 86400 * 7,
    end_time: now,
  });
  assert(res.success, res.msg);
});

// ─── RELAY ───
console.log("\n🔄 Relay");
await test("list_relay_configs", async () => {
  const res = await client.get("/relay/list");
  assert(res.success, res.msg);
});

await test("get_unbound_domains", async () => {
  const res = await client.get("/relay/get_unbound_domains");
  assert(res.success, res.msg);
});

// ─── OVERVIEW ───
console.log("\n📊 Overview");
await test("get_overview", async () => {
  const now = Math.floor(Date.now() / 1000);
  const res = await client.get("/overview", {
    start_time: now - 86400,
    end_time: now,
  });
  assert(res.success, res.msg);
});

// ─── SETTINGS ───
console.log("\n⚙️ Settings");
await test("get_version", async () => {
  const res = await client.get<any>("/settings/get_version");
  assert(res.success, res.msg);
  assert(res.data?.version !== undefined, "missing version");
});

await test("get_system_config", async () => {
  const res = await client.get("/settings/get_system_config");
  assert(res.success, res.msg);
});

await test("get_timezones", async () => {
  const res = await client.get("/settings/get_timezone_list");
  assert(res.success, res.msg);
});

// ─── TAGS ───
console.log("\n🏷️ Tags");
await test("list_tags", async () => {
  const res = await client.get("/tags/list", { page: 1, page_size: 10 });
  assert(res.success, res.msg);
});

await test("get_all_tags", async () => {
  const res = await client.get("/tags/all");
  assert(res.success, res.msg);
});

// ─── LOGS ───
console.log("\n📋 Logs");
await test("list_operation_logs", async () => {
  const res = await client.get("/operation_log/list", { page: 1, page_size: 10 });
  assert(res.success, res.msg);
});

await test("get_latest_output_log", async () => {
  const res = await client.get("/operation_log/output/latest");
  // May return success=false with "No log files found" on fresh instances — that's OK
  assert(res.success !== undefined, "no response");
});

// ─── MAIL SERVICES ───
console.log("\n📨 Mail Services");
await test("list_bcc_rules", async () => {
  const res = await client.get("/mail_bcc/list");
  assert(res.success, res.msg);
});

await test("list_mail_forwards", async () => {
  const res = await client.get("/mail_forward/list");
  assert(res.success, res.msg);
});

await test("list_postfix_queue", async () => {
  const res = await client.get("/postfix_queue/list");
  assert(res.success, res.msg);
});

await test("get_postfix_config", async () => {
  const res = await client.get("/postfix_queue/get_config");
  assert(res.success, res.msg);
});

// ─── BLACKLIST ───
console.log("\n🛡️ Blacklist");
await test("check_domain_blacklist", async () => {
  const domains = await client.get<any[]>("/domains/all");
  if (domains.data?.length > 0) {
    const res = await client.post("/domain_blocklist/check", { domain: domains.data[0].domain });
    assert(res.success !== undefined, "no response");
  }
});

// ─── SUMMARY ───
console.log("\n" + "═".repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failures.length > 0) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log(`  • ${f}`));
}
console.log("═".repeat(50));
process.exit(failed > 0 ? 1 : 0);
