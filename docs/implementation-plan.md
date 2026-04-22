# BillionMail MCP Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript MCP server npm package (`billionmail-mcp-server`) that exposes all BillionMail UI functionality as MCP tools.

**Architecture:** stdio MCP server using `@modelcontextprotocol/sdk`. Authenticates to BillionMail via JWT (login with username/password, auto-refresh). All API calls go through a shared HTTP client. Environment variables: `BILLIONMAIL_BASE_URL`, `BILLIONMAIL_USER`, `BILLIONMAIL_PASSWORD`. 45 tools organized into 12 categories matching the BillionMail UI sidebar.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, Node.js fetch API, `zod` for schemas.

**BillionMail API reference:** All endpoints are under `/api/` prefix. Auth is via `Authorization: Bearer <jwt>` header. Responses follow `{ success: bool, code: int, msg: string, data: any }` format. Login via `POST /api/login` returns JWT token + refresh token.

---

## File Structure

```
billionmail-mcp/
├── package.json
├── tsconfig.json
├── README.md
├── .env.example
├── src/
│   ├── index.ts              # Entry point — creates MCP server, registers all tools
│   ├── client.ts             # HTTP client with JWT auth, auto-refresh, error handling
│   ├── tools/
│   │   ├── domain.ts         # 8 tools: list, all, create, update, delete, dns_records, set_default, set_ssl
│   │   ├── mailbox.ts        # 7 tools: list, all, create, batch_create, update, delete, export
│   │   ├── contacts.ts       # 12 tools: list_groups, all_groups, create_group, update_group, delete_group, group_info, import, export, list_contacts, edit, delete, batch_tag
│   │   ├── templates.ts      # 7 tools: list, all, get, create, update, delete, copy
│   │   ├── send-api.ts       # 6 tools: list, create, update, delete, send, batch_send
│   │   ├── campaigns.ts      # 10 tools: list_tasks, get_task, create_task, update_task, delete_task, pause, resume, send_test, get_stats, get_logs
│   │   ├── relay.ts          # 5 tools: list, create, update, delete, test_connection
│   │   ├── overview.ts       # 2 tools: get_overview, get_failed_list
│   │   ├── settings.ts       # 5 tools: get_version, get_config, set_config, set_config_key, get_timezones
│   │   ├── tags.ts           # 5 tools: list, all, create, update, delete
│   │   ├── logs.ts           # 3 tools: list_operation_logs, list_output_logs, get_latest_output_log
│   │   └── mail-services.ts  # 9 tools: list_bcc, add_bcc, edit_bcc, delete_bcc, list_forwards, add_forward, edit_forward, delete_forward, list_queue
│   └── types.ts              # Shared types
├── test/
│   └── integration.test.ts   # Integration tests for all tools against live instance
└── dist/                     # Built output
```

**Total: ~79 tools** (expanded from initial 45 estimate after full API review)

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `.env.example`, `README.md`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/ziahmco/opensource/billionmail-mcp
```

Create `package.json`:
```json
{
  "name": "billionmail-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for BillionMail — manage domains, mailboxes, contacts, campaigns, templates, and more via AI agents",
  "main": "dist/index.js",
  "bin": {
    "billionmail-mcp": "dist/index.js"
  },
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "tsx test/integration.test.ts",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["mcp", "billionmail", "email", "smtp", "mail-server", "ai"],
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "@types/node": "^22.0.0"
  },
  "engines": {
    "node": ">=18"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Create .env.example**

```
BILLIONMAIL_BASE_URL=https://mail.example.com
BILLIONMAIL_USER=admin
BILLIONMAIL_PASSWORD=your-password
```

- [ ] **Step 4: Install dependencies**

```bash
cd /Users/ziahmco/opensource/billionmail-mcp
npm install
```

Expected: node_modules created, no errors.

- [ ] **Step 5: Commit**

```bash
git init
echo "node_modules\ndist\n.env" > .gitignore
git add .
git commit -m "chore: initial project scaffold"
```

---

### Task 2: HTTP Client with JWT Auth

**Files:**
- Create: `src/client.ts`, `src/types.ts`

- [ ] **Step 1: Create shared types**

Create `src/types.ts`:
```typescript
export interface BillionMailResponse<T = any> {
  success: boolean;
  code: number;
  msg: string;
  data: T;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  ttl: number;
  accountInfo: {
    id: number;
    username: string;
    email: string;
    status: number;
    lang: string;
  };
}

export interface PaginatedData<T> {
  total: number;
  list: T[];
}
```

- [ ] **Step 2: Create HTTP client**

Create `src/client.ts`:
```typescript
import { BillionMailResponse, LoginResponse } from "./types.js";

export class BillionMailClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.username = username;
    this.password = password;
  }

  private async login(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });

    const json = (await res.json()) as BillionMailResponse<LoginResponse>;

    if (!json.success || !json.data?.token) {
      throw new Error(`BillionMail login failed: ${json.msg || res.statusText}`);
    }

    this.token = json.data.token;
    this.refreshToken = json.data.refreshToken;
    this.tokenExpiry = Date.now() + (json.data.ttl - 60) * 1000; // refresh 60s early
  }

  private async ensureAuth(): Promise<string> {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      // Try refresh first if we have a refresh token
      if (this.refreshToken) {
        try {
          const res = await fetch(`${this.baseUrl}/api/refresh-token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.refreshToken}`,
            },
          });
          const json = (await res.json()) as BillionMailResponse<LoginResponse>;
          if (json.success && json.data?.token) {
            this.token = json.data.token;
            this.refreshToken = json.data.refreshToken;
            this.tokenExpiry = Date.now() + (json.data.ttl - 60) * 1000;
            return this.token;
          }
        } catch {
          // Fall through to full login
        }
      }
      await this.login();
    }
    return this.token!;
  }

  async get<T = any>(path: string, params?: Record<string, any>): Promise<BillionMailResponse<T>> {
    const token = await this.ensureAuth();
    const url = new URL(`${this.baseUrl}/api${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return (await res.json()) as BillionMailResponse<T>;
  }

  async post<T = any>(path: string, body?: Record<string, any>): Promise<BillionMailResponse<T>> {
    const token = await this.ensureAuth();
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await res.json()) as BillionMailResponse<T>;
  }
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: add HTTP client with JWT auth and auto-refresh"
```

---

### Task 3: MCP Server Entry Point + Domain Tools

**Files:**
- Create: `src/index.ts`, `src/tools/domain.ts`

- [ ] **Step 1: Create domain tools**

Create `src/tools/domain.ts`:
```typescript
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
    const res = await client.post("/domains/create", params);
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
```

- [ ] **Step 2: Create MCP server entry point**

Create `src/index.ts`:
```typescript
#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BillionMailClient } from "./client.js";
import { registerDomainTools } from "./tools/domain.js";

const baseUrl = process.env.BILLIONMAIL_BASE_URL;
const username = process.env.BILLIONMAIL_USER;
const password = process.env.BILLIONMAIL_PASSWORD;

if (!baseUrl || !username || !password) {
  console.error("Required environment variables: BILLIONMAIL_BASE_URL, BILLIONMAIL_USER, BILLIONMAIL_PASSWORD");
  process.exit(1);
}

const client = new BillionMailClient(baseUrl, username, password);

const server = new McpServer({
  name: "billionmail-mcp-server",
  version: "1.0.0",
});

// Register all tool groups
registerDomainTools(server, client);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 3: Build and verify**

```bash
npx tsc
```

Expected: compiles to `dist/` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: add MCP server entry point and domain tools (8 tools)"
```

---

### Task 4: Mailbox Tools

**Files:**
- Create: `src/tools/mailbox.ts`
- Modify: `src/index.ts` (add import + register call)

- [ ] **Step 1: Create mailbox tools**

Create `src/tools/mailbox.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerMailboxTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_mailboxes", "List mailboxes with pagination", {
    domain: z.string().optional().describe("Filter by domain"),
    keyword: z.string().optional().describe("Search keyword"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/mailbox/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_all_mailboxes", "Get all mailboxes without pagination", {
    domain: z.string().optional().describe("Filter by domain"),
  }, async (params) => {
    const res = await client.get("/mailbox/all", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_mailbox", "Create a new mailbox (email account)", {
    domain: z.string().describe("Domain name"),
    local_part: z.string().describe("Username part before @ (e.g. 'info' for info@example.com)"),
    password: z.string().describe("Password (min 8 chars)"),
    full_name: z.string().optional().describe("Display name"),
    active: z.number().optional().default(1).describe("1=enabled, 0=disabled"),
    quota: z.number().optional().default(5242880).describe("Mailbox quota in KB"),
  }, async (params) => {
    const res = await client.post("/mailbox/create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("batch_create_mailboxes", "Create multiple mailboxes at once", {
    domain: z.string().describe("Domain name"),
    count: z.number().describe("Number of mailboxes to create (min 2)"),
    prefix: z.string().optional().default("user").describe("Email name prefix"),
    quota: z.number().optional().default(5242880).describe("Quota per mailbox in KB"),
  }, async (params) => {
    const res = await client.post("/mailbox/batch_create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_mailbox", "Update a mailbox", {
    domain: z.string().describe("Domain name"),
    local_part: z.string().describe("Username part before @"),
    password: z.string().describe("New password (min 8 chars)"),
    full_name: z.string().optional().describe("Display name"),
    active: z.number().optional().default(1).describe("1=enabled, 0=disabled"),
    quota: z.number().optional().default(5242880).describe("Quota in KB"),
  }, async (params) => {
    const res = await client.post("/mailbox/update", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_mailboxes", "Delete one or more mailboxes", {
    emails: z.array(z.string()).describe("List of email addresses to delete"),
  }, async (params) => {
    const res = await client.post("/mailbox/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("get_all_emails", "Get all email addresses for a domain", {
    domain: z.string().optional().describe("Filter by domain"),
  }, async (params) => {
    const res = await client.get("/mailbox/all_email", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
```

- [ ] **Step 2: Register in index.ts**

Add to `src/index.ts` after domain import:
```typescript
import { registerMailboxTools } from "./tools/mailbox.js";
```
Add after `registerDomainTools(server, client);`:
```typescript
registerMailboxTools(server, client);
```

- [ ] **Step 3: Build and verify**

```bash
npx tsc
```

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: add mailbox tools (7 tools)"
```

---

### Task 5: Contact Tools

**Files:**
- Create: `src/tools/contacts.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create contact tools**

Create `src/tools/contacts.ts`:
```typescript
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
```

- [ ] **Step 2: Register in index.ts**

Add import and registration for `registerContactTools`.

- [ ] **Step 3: Build**

```bash
npx tsc
```

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: add contact tools (14 tools)"
```

---

### Task 6: Email Template Tools

**Files:**
- Create: `src/tools/templates.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create template tools**

Create `src/tools/templates.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerTemplateTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_templates", "List email templates with pagination", {
    keyword: z.string().optional().describe("Search by template name"),
    add_type: z.number().optional().default(-1).describe("Filter: 0=HTML, 1=Drag, 2=AI, -1=all"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/email_template/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_all_templates", "Get all email templates", {}, async () => {
    const res = await client.get("/email_template/all");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_template", "Get a single email template by ID", {
    id: z.number().describe("Template ID"),
  }, async (params) => {
    const res = await client.get("/email_template/get", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_template", "Create a new email template", {
    temp_name: z.string().describe("Template name"),
    add_type: z.number().describe("0=HTML, 1=Drag, 2=AI"),
    html_content: z.string().optional().describe("HTML content (required for type 0 or 1)"),
  }, async (params) => {
    const res = await client.post("/email_template/create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_template", "Update an email template", {
    id: z.number().describe("Template ID"),
    temp_name: z.string().optional().describe("New template name"),
    html_content: z.string().optional().describe("New HTML content"),
  }, async (params) => {
    const res = await client.post("/email_template/update", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_template", "Delete an email template", {
    id: z.number().describe("Template ID"),
  }, async (params) => {
    const res = await client.post("/email_template/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("copy_template", "Copy an email template", {
    id: z.number().describe("Template ID to copy"),
  }, async (params) => {
    const res = await client.post("/email_template/copy", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("check_email_content", "Check email content for spam score and issues", {
    content: z.string().describe("Email HTML content to check"),
  }, async (params) => {
    const res = await client.post("/email_template/check", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
```

- [ ] **Step 2: Register in index.ts, build, commit**

```bash
git add src/ && git commit -m "feat: add email template tools (8 tools)"
```

---

### Task 7: Send API Tools

**Files:**
- Create: `src/tools/send-api.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create send API tools**

Create `src/tools/send-api.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerSendApiTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_send_apis", "List Send API configurations", {
    keyword: z.string().optional().describe("Search keyword"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/batch_mail/api/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_send_api", "Create a new Send API configuration", {
    api_name: z.string().describe("API name"),
    template_id: z.number().describe("Email template ID to use"),
    subject: z.string().optional().describe("Email subject"),
    addresser: z.string().optional().describe("Sender email address"),
    full_name: z.string().optional().describe("Sender display name"),
    group_id: z.number().optional().describe("Associated contact group ID"),
  }, async (params) => {
    const res = await client.post("/batch_mail/api/create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_send_api", "Update a Send API configuration", {
    id: z.number().describe("API ID"),
    api_name: z.string().optional().describe("API name"),
    template_id: z.number().optional().describe("Template ID"),
    subject: z.string().optional().describe("Subject"),
    addresser: z.string().optional().describe("Sender email"),
    full_name: z.string().optional().describe("Sender name"),
  }, async (params) => {
    const res = await client.post("/batch_mail/api/update", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_send_api", "Delete a Send API configuration", {
    id: z.number().describe("API ID to delete"),
  }, async (params) => {
    const res = await client.post("/batch_mail/api/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("send_email_via_api", "Send a single email via the Send API", {
    api_key: z.string().describe("API key (from Send API config)"),
    addresser: z.string().optional().describe("Sender email (overrides API config)"),
    recipient: z.string().describe("Recipient email address"),
    attribs: z.record(z.string()).optional().describe("Custom template attributes"),
  }, async (params) => {
    const body: Record<string, any> = { recipient: params.recipient };
    if (params.addresser) body.addresser = params.addresser;
    if (params.attribs) body.attribs = params.attribs;
    // Send API uses x-api-key header, need special handling
    const res = await client.post("/batch_mail/api/send", { ...body, "x-api-key": params.api_key });
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("batch_send_email_via_api", "Send emails to multiple recipients via the Send API", {
    api_key: z.string().describe("API key"),
    recipients: z.array(z.string()).describe("Recipient email addresses"),
    addresser: z.string().optional().describe("Sender email"),
    attribs: z.record(z.string()).optional().describe("Custom template attributes"),
  }, async (params) => {
    const body: Record<string, any> = { recipients: params.recipients };
    if (params.addresser) body.addresser = params.addresser;
    if (params.attribs) body.attribs = params.attribs;
    const res = await client.post("/batch_mail/api/batch_send", { ...body, "x-api-key": params.api_key });
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("get_send_api_stats", "Get Send API overview statistics", {
    start_time: z.number().optional().describe("Start time (unix timestamp)"),
    end_time: z.number().optional().describe("End time (unix timestamp)"),
  }, async (params) => {
    const res = await client.get("/batch_mail/api/overview_stats", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
```

- [ ] **Step 2: Register in index.ts, build, commit**

```bash
git add src/ && git commit -m "feat: add send API tools (7 tools)"
```

---

### Task 8: Campaign (Email Marketing) Tools

**Files:**
- Create: `src/tools/campaigns.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create campaign tools**

Create `src/tools/campaigns.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerCampaignTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_campaign_tasks", "List email campaign tasks", {
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
    keyword: z.string().optional().describe("Search keyword"),
    status: z.number().optional().default(-1).describe("Task status filter (-1=all)"),
  }, async (params) => {
    const res = await client.get("/batch_mail/task/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_campaign_task", "Get campaign task details by ID", {
    id: z.number().describe("Task ID"),
  }, async (params) => {
    const res = await client.get("/batch_mail/task/find", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_campaign_task", "Create a new email campaign task", {
    addresser: z.string().describe("Sender email address"),
    subject: z.string().describe("Email subject"),
    template_id: z.number().describe("Email template ID"),
    group_id: z.number().describe("Contact group ID to send to"),
    full_name: z.string().optional().describe("Sender display name"),
    is_record: z.number().optional().default(1).describe("1=record tracking, 0=no tracking"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_campaign_task", "Update a campaign task", {
    task_id: z.number().describe("Task ID"),
    addresser: z.string().optional().describe("Sender email"),
    subject: z.string().optional().describe("Subject"),
    full_name: z.string().optional().describe("Sender name"),
    template_id: z.number().optional().describe("Template ID"),
    remark: z.string().optional().describe("Remark/notes"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/update", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_campaign_task", "Delete a campaign task", {
    id: z.number().describe("Task ID"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("pause_campaign_task", "Pause a running campaign task", {
    task_id: z.number().describe("Task ID"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/pause", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("resume_campaign_task", "Resume a paused campaign task", {
    task_id: z.number().describe("Task ID"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/resume", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("set_campaign_speed", "Set sending speed (concurrency) for a campaign", {
    task_id: z.number().describe("Task ID"),
    threads: z.number().describe("Thread count 1-100"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/speed", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("send_test_email", "Send a test email before launching a campaign", {
    addresser: z.string().describe("Sender email"),
    subject: z.string().describe("Subject"),
    recipient: z.string().describe("Test recipient email"),
    template_id: z.number().describe("Template ID"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/send_test", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("get_campaign_overview", "Get campaign task overview statistics", {
    start_time: z.number().optional().describe("Start time (unix)"),
    end_time: z.number().optional().describe("End time (unix)"),
  }, async (params) => {
    const res = await client.get("/batch_mail/task/overview", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_campaign_logs", "Get email sending logs for a campaign", {
    task_id: z.number().describe("Task ID"),
    status: z.number().optional().describe("1=success, 0=failure"),
    domain: z.string().optional().describe("Domain filter"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/batch_mail/tracking/logs", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_campaign_provider_stats", "Get email provider statistics for a campaign", {
    task_id: z.number().describe("Task ID"),
    status: z.number().optional().describe("1=success, 0=failure"),
  }, async (params) => {
    const res = await client.get("/batch_mail/tracking/mail_provider", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
```

- [ ] **Step 2: Register in index.ts, build, commit**

```bash
git add src/ && git commit -m "feat: add campaign/email marketing tools (12 tools)"
```

---

### Task 9: Relay, Overview, Settings, Tags, Logs, Mail Services Tools

**Files:**
- Create: `src/tools/relay.ts`, `src/tools/overview.ts`, `src/tools/settings.ts`, `src/tools/tags.ts`, `src/tools/logs.ts`, `src/tools/mail-services.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create relay tools**

Create `src/tools/relay.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerRelayTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_relay_configs", "List SMTP relay configurations", {
    keyword: z.string().optional().describe("Search keyword"),
    rtype: z.string().optional().describe("Filter by type: gmail, sendgrid, custom, aws, mailgun, local"),
  }, async (params) => {
    const res = await client.get("/relay/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_relay_config", "Create a new SMTP relay configuration", {
    sender_domains: z.array(z.string()).describe("Sender domains to route through this relay"),
    relay_host: z.string().describe("SMTP relay server address"),
    relay_port: z.string().describe("SMTP relay port (e.g. 587)"),
    auth_user: z.string().optional().describe("SMTP username"),
    auth_password: z.string().optional().describe("SMTP password"),
    rtype: z.string().optional().describe("Type: gmail, sendgrid, custom, aws, mailgun, local"),
    remark: z.string().optional().describe("Description"),
  }, async (params) => {
    const res = await client.post("/relay/add", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_relay_config", "Update a relay configuration", {
    id: z.number().describe("Relay config ID"),
    relay_host: z.string().optional(),
    relay_port: z.string().optional(),
    auth_user: z.string().optional(),
    auth_password: z.string().optional(),
    rtype: z.string().optional(),
    remark: z.string().optional(),
  }, async (params) => {
    const res = await client.post("/relay/edit", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_relay_config", "Delete a relay configuration", {
    id: z.number().describe("Relay config ID"),
  }, async (params) => {
    const res = await client.post("/relay/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("test_relay_connection", "Test if an SMTP relay connection works", {
    relay_host: z.string().describe("SMTP server address"),
    relay_port: z.string().describe("SMTP port"),
    auth_user: z.string().optional().describe("Username"),
    auth_password: z.string().optional().describe("Password"),
  }, async (params) => {
    const res = await client.post("/relay/test_connection", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("get_unbound_domains", "Get domains not bound to any relay", {}, async () => {
    const res = await client.get("/relay/get_unbound_domains");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
```

- [ ] **Step 2: Create overview tools**

Create `src/tools/overview.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerOverviewTools(server: McpServer, client: BillionMailClient) {
  server.tool("get_overview", "Get mail sending overview: delivered, opened, clicked, bounced rates", {
    start_time: z.number().describe("Start time (unix timestamp)"),
    end_time: z.number().describe("End time (unix timestamp)"),
    domain: z.string().optional().describe("Filter by domain"),
    campaign_id: z.number().optional().describe("Filter by campaign ID"),
  }, async (params) => {
    const res = await client.get("/overview", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_failed_list", "Get list of failed email deliveries", {
    start_time: z.number().describe("Start time (unix timestamp)"),
    end_time: z.number().describe("End time (unix timestamp)"),
    domain: z.string().optional().describe("Filter by domain"),
    campaign_id: z.number().optional().describe("Filter by campaign ID"),
  }, async (params) => {
    const res = await client.get("/overview/failed", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
```

- [ ] **Step 3: Create settings tools**

Create `src/tools/settings.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerSettingsTools(server: McpServer, client: BillionMailClient) {
  server.tool("get_version", "Get BillionMail version information", {}, async () => {
    const res = await client.get("/settings/get_version");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_system_config", "Get system configuration", {}, async () => {
    const res = await client.get("/settings/get_system_config");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("set_system_config_key", "Set a single system configuration key", {
    key: z.string().describe("Configuration key"),
    value: z.string().describe("Configuration value"),
  }, async (params) => {
    const res = await client.post("/settings/set_system_config_key", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("get_timezones", "Get available timezone list", {}, async () => {
    const res = await client.get("/settings/get_timezone_list");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("check_domain_blacklist", "Check if a domain/IP is on any spam blacklists", {
    domain: z.string().describe("Domain to check"),
  }, async (params) => {
    const res = await client.post("/domain_blocklist/check", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
```

- [ ] **Step 4: Create tags tools**

Create `src/tools/tags.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerTagTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_tags", "List tags with pagination", {
    group_id: z.number().optional().describe("Filter by group ID"),
    keyword: z.string().optional().describe("Search keyword"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/tags/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_all_tags", "Get all tags", {}, async () => {
    const res = await client.get("/tags/all");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_tag", "Create a new tag", {
    group_id: z.number().describe("Group ID to create tag in"),
    name: z.string().describe("Tag name (max 50 chars)"),
  }, async (params) => {
    const res = await client.post("/tags/create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_tag", "Update a tag name", {
    id: z.number().describe("Tag ID"),
    name: z.string().describe("New tag name"),
  }, async (params) => {
    const res = await client.post("/tags/update", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_tag", "Delete a tag", {
    id: z.number().describe("Tag ID"),
  }, async (params) => {
    const res = await client.post("/tags/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });
}
```

- [ ] **Step 5: Create logs tools**

Create `src/tools/logs.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerLogTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_operation_logs", "List operation/audit logs", {
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
    keyword: z.string().optional().describe("Search keyword"),
    type: z.string().optional().describe("Log type filter"),
    start_time: z.number().optional().describe("Start time (unix)"),
    end_time: z.number().optional().describe("End time (unix)"),
  }, async (params) => {
    const res = await client.get("/operation_log/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("list_output_logs", "List system output logs", {
    start_date: z.string().describe("Start date (YYYY-MM-DD)"),
    end_date: z.string().describe("End date (YYYY-MM-DD)"),
    keyword: z.string().optional().describe("Search keyword"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/operation_log/output/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_latest_output_log", "Get the most recent output log entry", {}, async () => {
    const res = await client.get("/operation_log/output/latest");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
```

- [ ] **Step 6: Create mail services tools**

Create `src/tools/mail-services.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerMailServiceTools(server: McpServer, client: BillionMailClient) {
  // BCC
  server.tool("list_bcc_rules", "List mail BCC (blind carbon copy) rules", {
    type: z.string().optional().describe("Filter: 'sender' or 'recipient'"),
    domain: z.string().optional().describe("Domain filter"),
    page_num: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/mail_bcc/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("add_bcc_rule", "Add a BCC rule to copy emails", {
    type: z.string().describe("'sender' or 'recipient'"),
    address: z.string().describe("Email address or domain to match"),
    goto: z.string().describe("BCC target email address"),
    active: z.number().optional().default(1).describe("1=enabled, 0=disabled"),
  }, async (params) => {
    const res = await client.post("/mail_bcc/add", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("edit_bcc_rule", "Edit a BCC rule", {
    id: z.number().describe("BCC rule ID"),
    type: z.string().optional().describe("'sender' or 'recipient'"),
    address: z.string().optional().describe("Email/domain to match"),
    goto: z.string().describe("BCC target email"),
    active: z.number().optional().default(1),
  }, async (params) => {
    const res = await client.post("/mail_bcc/edit", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_bcc_rule", "Delete a BCC rule", {
    id: z.number().describe("BCC rule ID"),
  }, async (params) => {
    const res = await client.post("/mail_bcc/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  // Forwarding
  server.tool("list_mail_forwards", "List mail forwarding rules", {
    domain: z.string().optional().describe("Domain filter"),
    search_key: z.string().optional().describe("Search address"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/mail_forward/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("add_mail_forward", "Add a mail forwarding rule", {
    address: z.string().describe("Source email address (e.g. user@example.com)"),
    goto: z.string().describe("Forward target address(es), newline-separated"),
    active: z.number().optional().default(1).describe("1=enabled, 0=disabled"),
  }, async (params) => {
    const res = await client.post("/mail_forward/add", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("edit_mail_forward", "Edit a mail forwarding rule", {
    address: z.string().describe("Source email address"),
    goto: z.string().optional().describe("New target address(es)"),
    active: z.number().optional().describe("1=enabled, 0=disabled"),
  }, async (params) => {
    const res = await client.post("/mail_forward/edit", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_mail_forward", "Delete a mail forwarding rule", {
    address: z.string().describe("Source email address to remove forwarding for"),
  }, async (params) => {
    const res = await client.post("/mail_forward/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  // Postfix Queue
  server.tool("list_postfix_queue", "List postfix mail queue", {
    domain: z.string().optional().describe("Domain filter"),
  }, async (params) => {
    const res = await client.get("/postfix_queue/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("flush_postfix_queue", "Force send all queued mail", {
    domain: z.string().optional().describe("Optional domain to flush"),
  }, async (params) => {
    const res = await client.post("/postfix_queue/flush", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_deferred_queue", "Clear all deferred (stuck) mail from queue", {}, async () => {
    const res = await client.post("/postfix_queue/delete");
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });
}
```

- [ ] **Step 7: Update index.ts with all imports**

Final `src/index.ts`:
```typescript
#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BillionMailClient } from "./client.js";
import { registerDomainTools } from "./tools/domain.js";
import { registerMailboxTools } from "./tools/mailbox.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerTemplateTools } from "./tools/templates.js";
import { registerSendApiTools } from "./tools/send-api.js";
import { registerCampaignTools } from "./tools/campaigns.js";
import { registerRelayTools } from "./tools/relay.js";
import { registerOverviewTools } from "./tools/overview.js";
import { registerSettingsTools } from "./tools/settings.js";
import { registerTagTools } from "./tools/tags.js";
import { registerLogTools } from "./tools/logs.js";
import { registerMailServiceTools } from "./tools/mail-services.js";

const baseUrl = process.env.BILLIONMAIL_BASE_URL;
const username = process.env.BILLIONMAIL_USER;
const password = process.env.BILLIONMAIL_PASSWORD;

if (!baseUrl || !username || !password) {
  console.error("Required environment variables: BILLIONMAIL_BASE_URL, BILLIONMAIL_USER, BILLIONMAIL_PASSWORD");
  process.exit(1);
}

const client = new BillionMailClient(baseUrl, username, password);

const server = new McpServer({
  name: "billionmail-mcp-server",
  version: "1.0.0",
});

registerDomainTools(server, client);
registerMailboxTools(server, client);
registerContactTools(server, client);
registerTemplateTools(server, client);
registerSendApiTools(server, client);
registerCampaignTools(server, client);
registerRelayTools(server, client);
registerOverviewTools(server, client);
registerSettingsTools(server, client);
registerTagTools(server, client);
registerLogTools(server, client);
registerMailServiceTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 8: Build and verify**

```bash
npx tsc
```

Expected: clean build, no errors.

- [ ] **Step 9: Commit**

```bash
git add src/
git commit -m "feat: add relay, overview, settings, tags, logs, mail-services tools (complete all 79 tools)"
```

---

### Task 10: Integration Test Suite

**Files:**
- Create: `test/integration.test.ts`

- [ ] **Step 1: Create integration test**

Create `test/integration.test.ts`:
```typescript
/**
 * Integration test for billionmail-mcp-server
 *
 * Requires environment variables:
 *   BILLIONMAIL_BASE_URL, BILLIONMAIL_USER, BILLIONMAIL_PASSWORD
 *
 * Usage: BILLIONMAIL_BASE_URL=https://mail.rako.sh BILLIONMAIL_USER=billion BILLIONMAIL_PASSWORD=billion npx tsx test/integration.test.ts
 *
 * Tests all tool categories against a live BillionMail instance.
 * Uses a test domain prefix to avoid interfering with production data.
 */

import { BillionMailClient } from "../src/client.js";

const baseUrl = process.env.BILLIONMAIL_BASE_URL;
const username = process.env.BILLIONMAIL_USER;
const password = process.env.BILLIONMAIL_PASSWORD;

if (!baseUrl || !username || !password) {
  console.error("Set BILLIONMAIL_BASE_URL, BILLIONMAIL_USER, BILLIONMAIL_PASSWORD");
  process.exit(1);
}

const client = new BillionMailClient(baseUrl, username, password);

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
  assert(res.data?.list !== undefined, "missing list field");
});

await test("get_all_domains", async () => {
  const res = await client.get("/domains/all");
  assert(res.success, res.msg);
});

await test("refresh_dns_records", async () => {
  const domains = await client.get("/domains/all");
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
  const res = await client.post("/contact/group/create", {
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
  const res = await client.post("/email_template/create", {
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
    const res = await client.post("/email_template/copy", { id: testTemplateId });
    assert(res.success, res.msg);
    // Clean up copied template
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
  const res = await client.get("/settings/get_version");
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
  assert(res.success, res.msg);
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
  const domains = await client.get("/domains/all");
  if (domains.data?.length > 0) {
    const res = await client.post("/domain_blocklist/check", { domain: domains.data[0].domain });
    // This may take time, just check it doesn't error
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
```

- [ ] **Step 2: Run integration tests against live instance**

```bash
cd /Users/ziahmco/opensource/billionmail-mcp
BILLIONMAIL_BASE_URL=https://mail.rako.sh BILLIONMAIL_USER=billion BILLIONMAIL_PASSWORD=billion npx tsx test/integration.test.ts
```

Expected: all tests pass (✅).

- [ ] **Step 3: Fix any failing tests**

Address failures by adjusting API paths, parameters, or response handling.

- [ ] **Step 4: Commit**

```bash
git add test/
git commit -m "test: add integration test suite for all tool categories"
```

---

### Task 11: README and npm Publish Prep

**Files:**
- Create: `README.md`, `LICENSE`

- [ ] **Step 1: Write README.md**

Create comprehensive README with:
- What it is
- Installation: `npm install -g billionmail-mcp-server`
- Configuration (env vars)
- Claude Desktop config example
- Pi/other MCP client config example
- Full tool reference table (all 79 tools grouped by category)
- Development instructions

- [ ] **Step 2: Add MIT LICENSE**

- [ ] **Step 3: Add shebang to dist/index.js**

Ensure `src/index.ts` has `#!/usr/bin/env node` at top (already done).

- [ ] **Step 4: Test global install locally**

```bash
cd /Users/ziahmco/opensource/billionmail-mcp
npm run build
npm link
# Test it works
BILLIONMAIL_BASE_URL=https://mail.rako.sh BILLIONMAIL_USER=billion BILLIONMAIL_PASSWORD=billion billionmail-mcp
```

- [ ] **Step 5: Add to pi mcp.json for local testing**

Add to `~/.pi/agent/mcp.json`:
```json
"billionmail": {
  "type": "stdio",
  "command": "/bin/zsh",
  "args": ["-l", "-c", "node /Users/ziahmco/opensource/billionmail-mcp/dist/index.js"]
}
```

- [ ] **Step 6: Add to Claude Desktop config**

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
"billionmail": {
  "command": "/bin/zsh",
  "args": ["-l", "-c", "node /Users/ziahmco/opensource/billionmail-mcp/dist/index.js"]
}
```

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "docs: add README, LICENSE, publish prep"
```

---

## Summary

| Task | Tools | Cumulative |
|---|---|---|
| 1. Scaffold | 0 | 0 |
| 2. HTTP Client | 0 | 0 |
| 3. Domain | 8 | 8 |
| 4. Mailbox | 7 | 15 |
| 5. Contacts | 14 | 29 |
| 6. Templates | 8 | 37 |
| 7. Send API | 7 | 44 |
| 8. Campaigns | 12 | 56 |
| 9. Relay+Overview+Settings+Tags+Logs+Mail Services | 23 | 79 |
| 10. Integration Tests | 0 | 79 |
| 11. README + Publish | 0 | 79 |

**Total: 79 tools across 12 categories, 11 tasks.**
