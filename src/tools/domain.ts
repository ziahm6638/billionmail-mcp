import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerDomainTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_domains", "List domains with pagination and search", {
    keyword: z.string().optional().describe("Search keyword"),
    page: z.number().optional().default(1).describe("Page number"),
    page_size: z.number().optional().default(20).describe("Page size"),
  }, async (params) => {
    const res = await client.get("/domains/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_all_domains", "Get all domains without pagination", {}, async () => {
    const res = await client.get("/domains/all");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_domain", "Add a new domain for sending emails", {
    domain: z.string().describe("Domain name (e.g. example.com)"),
    hostname: z.string().optional().describe("Hostname for A record"),
    mailboxes: z.number().optional().default(50).describe("Max number of mailboxes"),
    quota: z.number().optional().default(10485760).describe("Domain quota in KB"),
    rate_limit: z.number().optional().default(12).describe("Emails per second rate limit"),
  }, async (params) => {
    const body: Record<string, any> = { ...params, urls: [] };
    const res = await client.post("/domains/create", body);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_domain", "Update domain settings", {
    domain: z.string().describe("Domain name"),
    hostname: z.string().optional().describe("Hostname for A record"),
    mailboxes: z.number().optional().describe("Max number of mailboxes"),
    quota: z.number().optional().describe("Domain quota in KB"),
    rate_limit: z.number().optional().describe("Emails per second rate limit"),
    active: z.number().optional().describe("Status: 1=enabled, 0=disabled"),
  }, async (params) => {
    const body: Record<string, any> = { domain: params.domain };
    if (params.hostname !== undefined) body.hostname = params.hostname;
    if (params.mailboxes !== undefined) body.mailboxes = params.mailboxes;
    if (params.quota !== undefined) body.quota = params.quota;
    if (params.rate_limit !== undefined) body.rateLimit = params.rate_limit;
    if (params.active !== undefined) body.active = params.active;
    const res = await client.post("/domains/update", body);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_domain", "Delete a domain", {
    domain: z.string().describe("Domain name to delete"),
  }, async (params) => {
    const res = await client.post("/domains/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("refresh_dns_records", "Refresh and verify DNS records for a domain (SPF, DKIM, DMARC, MX, A, PTR)", {
    domain: z.string().describe("Domain name"),
  }, async (params) => {
    const res = await client.post("/domains/fresh_dns_records", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("set_default_domain", "Set a domain as the default sender domain", {
    domain: z.string().describe("Domain name"),
  }, async (params) => {
    const res = await client.post("/domains/set_default_domain", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("set_domain_ssl", "Set SSL certificate for a domain", {
    domain: z.string().describe("Domain name"),
    certificate: z.string().describe("SSL certificate PEM"),
    key: z.string().describe("SSL private key PEM"),
  }, async (params) => {
    const res = await client.post("/domains/set_ssl", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });
}
