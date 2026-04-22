import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerContactTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_contact_groups", "List contact groups with pagination", {
    keyword: z.string().optional().describe("Search keyword"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/contact/group/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_all_contact_groups", "Get all contact groups without pagination", {
    keyword: z.string().optional().describe("Search keyword"),
  }, async (params) => {
    const res = await client.get("/contact/group/all", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_group_info", "Get detailed info about a contact group", {
    group_id: z.number().describe("Group ID"),
  }, async (params) => {
    const res = await client.get("/contact/group/info", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_contact_group", "Create a new contact group", {
    name: z.string().describe("Group name"),
    description: z.string().optional().describe("Group description"),
    create_type: z.number().optional().default(1).describe("1=group only, 2=group+import, 3=import into existing"),
  }, async (params) => {
    const res = await client.post("/contact/group/create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_contact_group", "Update a contact group", {
    group_id: z.number().describe("Group ID"),
    name: z.string().optional().describe("New name"),
    description: z.string().optional().describe("New description"),
  }, async (params) => {
    const res = await client.post("/contact/group/update", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_contact_groups", "Delete one or more contact groups", {
    group_ids: z.array(z.number()).describe("Group IDs to delete"),
  }, async (params) => {
    const res = await client.post("/contact/group/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("import_contacts", "Import contacts into groups from pasted content", {
    group_ids: z.array(z.number()).describe("Group IDs to import into"),
    contacts: z.string().describe("Contact emails, one per line. Optional format: email,status"),
    import_type: z.number().optional().default(2).describe("1=file upload, 2=paste content"),
    default_active: z.number().optional().default(1).describe("1=subscribed, 0=unsubscribed"),
  }, async (params) => {
    const res = await client.post("/contact/group/import", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("export_contacts", "Export contacts from groups", {
    group_ids: z.array(z.number()).describe("Group IDs to export"),
    export_type: z.number().optional().default(1).describe("1=merged, 2=separate"),
    format: z.string().optional().default("csv").describe("csv, excel, or txt"),
  }, async (params) => {
    const res = await client.post("/contact/group/export", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("list_contacts", "List contacts with filtering", {
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
    group_id: z.number().optional().describe("Filter by group ID"),
    keyword: z.string().optional().describe("Search email"),
    status: z.number().optional().default(1).describe("1=subscribed, 0=unsubscribed"),
  }, async (params) => {
    const res = await client.get("/contact/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("edit_contact", "Edit a contact's properties", {
    emails: z.string().describe("Email address(es)"),
    active: z.number().optional().describe("1=subscribed, 0=unsubscribed"),
    group_ids: z.array(z.number()).optional().describe("New group IDs"),
    attribs: z.string().optional().describe("Custom attributes JSON"),
  }, async (params) => {
    const res = await client.post("/contact/edit", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_contacts", "Delete contacts by email", {
    emails: z.array(z.string()).describe("Email addresses to delete"),
    status: z.number().optional().default(1).describe("Status to delete: 1=subscribed, 0=unsubscribed"),
  }, async (params) => {
    const res = await client.post("/contact/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("batch_tag_contacts", "Add or remove tags from contacts in bulk", {
    ids: z.array(z.number()).describe("Contact IDs"),
    tag_ids: z.array(z.number()).describe("Tag IDs"),
    action: z.number().describe("1=add tag, 2=remove tag"),
  }, async (params) => {
    const res = await client.post("/contact/batch_tags_opt", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("get_contact_trend", "Get contact subscription trend data", {
    group_id: z.number().optional().describe("Group ID"),
    time_interval: z.number().optional().default(30).describe("7, 30, 90, 180, 365, or 0 for all"),
  }, async (params) => {
    const res = await client.get("/contact/trend", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("merge_contact_groups", "Merge contacts from source groups into a target group", {
    source_groups: z.array(z.number()).describe("Source group IDs"),
    target_group: z.number().describe("Target group ID"),
  }, async (params) => {
    const res = await client.post("/contact/group/merge_contacts", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });
}
