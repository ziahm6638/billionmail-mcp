# billionmail-mcp-server

MCP server for [BillionMail](https://github.com/nicnocquee/BillionMail) — manage domains, mailboxes, contacts, campaigns, templates, relays, and more via AI agents.

**88 tools** across 12 categories, covering the full BillionMail UI.

## Installation

```bash
npm install -g billionmail-mcp-server
```

## Configuration

### Environment Variables

The server requires three environment variables to connect to your BillionMail instance:

| Variable | Required | Description |
|---|---|---|
| `BILLIONMAIL_BASE_URL` | ✅ | Full URL to your BillionMail instance (e.g. `https://mail.example.com`) |
| `BILLIONMAIL_USER` | ✅ | Your BillionMail admin username |
| `BILLIONMAIL_PASSWORD` | ✅ | Your BillionMail admin password |
| `BILLIONMAIL_SAFE_PATH` | ❌ | If your instance uses a safe path URL for access control (see below) |

#### Finding your credentials

1. **`BILLIONMAIL_BASE_URL`** — This is the URL you use to access BillionMail in your browser. If you access it at `https://mail.mycompany.com`, that's your base URL. Do not include a trailing slash.

2. **`BILLIONMAIL_USER` / `BILLIONMAIL_PASSWORD`** — These are the same credentials you use to log into the BillionMail web UI. They were set during BillionMail installation (via `docker-compose.yml` or the install wizard).

3. **`BILLIONMAIL_SAFE_PATH`** (optional) — BillionMail supports a "safe path" feature that adds a secret URL segment for extra security. If your instance requires you to visit `https://mail.example.com/mysecretpath` before the UI loads, then set `BILLIONMAIL_SAFE_PATH=mysecretpath`. If you access the UI directly at the root URL, you don't need this.

#### Setting the variables

**macOS/Linux** — Add to your shell profile (`~/.zshenv`, `~/.bashrc`, etc.):

```bash
export BILLIONMAIL_BASE_URL=https://mail.example.com
export BILLIONMAIL_USER=admin
export BILLIONMAIL_PASSWORD=your-password
# Only if your instance uses a safe path:
export BILLIONMAIL_SAFE_PATH=your-safe-path
```

**Windows** — Set via System Properties → Environment Variables, or in PowerShell:

```powershell
[System.Environment]::SetEnvironmentVariable("BILLIONMAIL_BASE_URL", "https://mail.example.com", "User")
[System.Environment]::SetEnvironmentVariable("BILLIONMAIL_USER", "admin", "User")
[System.Environment]::SetEnvironmentVariable("BILLIONMAIL_PASSWORD", "your-password", "User")
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "billionmail": {
      "command": "/bin/zsh",
      "args": ["-l", "-c", "billionmail-mcp"]
    }
  }
}
```

> **Why `/bin/zsh -l -c`?** This launches a login shell so your environment variables from `~/.zshenv` are loaded. On Linux, use `/bin/bash -l -c` instead. On Windows, you can run `billionmail-mcp` directly if the env vars are set system-wide.

**Windows example:**

```json
{
  "mcpServers": {
    "billionmail": {
      "command": "billionmail-mcp"
    }
  }
}
```

### Pi (pi.dev)

Add to `~/.pi/agent/mcp.json`:

```json
{
  "mcpServers": {
    "billionmail": {
      "type": "stdio",
      "command": "/bin/zsh",
      "args": ["-l", "-c", "billionmail-mcp"]
    }
  }
}
```

### Other MCP Clients

The server uses stdio transport. Any MCP client can connect by running:

```bash
billionmail-mcp
```

The binary reads environment variables on startup, authenticates via JWT, and exposes all tools over the MCP protocol.

## Tools

### Domain (8 tools)
| Tool | Description |
|---|---|
| `list_domains` | List domains with pagination and search |
| `get_all_domains` | Get all domains |
| `create_domain` | Add a new domain |
| `update_domain` | Update domain settings |
| `delete_domain` | Delete a domain |
| `refresh_dns_records` | Verify DNS records (SPF, DKIM, DMARC, MX, A, PTR) |
| `set_default_domain` | Set default sender domain |
| `set_domain_ssl` | Set SSL certificate |

### Mailbox (7 tools)
| Tool | Description |
|---|---|
| `list_mailboxes` | List mailboxes with pagination |
| `get_all_mailboxes` | Get all mailboxes |
| `create_mailbox` | Create a mailbox |
| `batch_create_mailboxes` | Batch create mailboxes |
| `update_mailbox` | Update a mailbox |
| `delete_mailboxes` | Delete mailboxes |
| `get_all_emails` | Get all email addresses |

### Contacts (14 tools)
| Tool | Description |
|---|---|
| `list_contact_groups` | List contact groups |
| `get_all_contact_groups` | Get all groups |
| `get_group_info` | Get group details |
| `create_contact_group` | Create a group |
| `update_contact_group` | Update a group |
| `delete_contact_groups` | Delete groups |
| `import_contacts` | Import contacts into groups |
| `export_contacts` | Export contacts |
| `list_contacts` | List contacts with filtering |
| `edit_contact` | Edit a contact |
| `delete_contacts` | Delete contacts |
| `batch_tag_contacts` | Bulk tag/untag contacts |
| `get_contact_trend` | Get subscription trend data |
| `merge_contact_groups` | Merge groups |

### Email Templates (8 tools)
| Tool | Description |
|---|---|
| `list_templates` | List templates |
| `get_all_templates` | Get all templates |
| `get_template` | Get a template by ID |
| `create_template` | Create a template (HTML/Drag/AI) |
| `update_template` | Update a template |
| `delete_template` | Delete a template |
| `copy_template` | Copy a template |
| `check_email_content` | Check content for spam score |

### Send API (7 tools)
| Tool | Description |
|---|---|
| `list_send_apis` | List Send API configs |
| `create_send_api` | Create a Send API |
| `update_send_api` | Update a Send API |
| `delete_send_api` | Delete a Send API |
| `send_email_via_api` | Send a single email |
| `batch_send_email_via_api` | Send to multiple recipients |
| `get_send_api_stats` | Get Send API statistics |

### Campaigns (12 tools)
| Tool | Description |
|---|---|
| `list_campaign_tasks` | List campaign tasks |
| `get_campaign_task` | Get task details |
| `create_campaign_task` | Create a campaign |
| `update_campaign_task` | Update a campaign |
| `delete_campaign_task` | Delete a campaign |
| `pause_campaign_task` | Pause a campaign |
| `resume_campaign_task` | Resume a campaign |
| `set_campaign_speed` | Set sending concurrency |
| `send_test_email` | Send a test email |
| `get_campaign_overview` | Get campaign statistics |
| `get_campaign_logs` | Get sending logs |
| `get_campaign_provider_stats` | Get provider statistics |

### SMTP Relay (6 tools)
| Tool | Description |
|---|---|
| `list_relay_configs` | List relay configurations |
| `create_relay_config` | Create a relay (Gmail, SendGrid, AWS SES, custom) |
| `update_relay_config` | Update a relay |
| `delete_relay_config` | Delete a relay |
| `test_relay_connection` | Test SMTP connection |
| `get_unbound_domains` | Get domains without a relay |

### Overview (2 tools)
| Tool | Description |
|---|---|
| `get_overview` | Get delivery stats (delivered, opened, clicked, bounced) |
| `get_failed_list` | Get failed deliveries |

### Settings (5 tools)
| Tool | Description |
|---|---|
| `get_version` | Get BillionMail version |
| `get_system_config` | Get system configuration |
| `set_system_config_key` | Set a config key |
| `get_timezones` | Get available timezones |
| `check_domain_blacklist` | Check domain against spam blacklists |

### Tags (5 tools)
| Tool | Description |
|---|---|
| `list_tags` | List tags |
| `get_all_tags` | Get all tags |
| `create_tag` | Create a tag |
| `update_tag` | Update a tag |
| `delete_tag` | Delete a tag |

### Logs (3 tools)
| Tool | Description |
|---|---|
| `list_operation_logs` | List audit logs |
| `list_output_logs` | List system output logs |
| `get_latest_output_log` | Get latest output log |

### Mail Services (11 tools)
| Tool | Description |
|---|---|
| `list_bcc_rules` | List BCC rules |
| `add_bcc_rule` | Add a BCC rule |
| `edit_bcc_rule` | Edit a BCC rule |
| `delete_bcc_rule` | Delete a BCC rule |
| `list_mail_forwards` | List forwarding rules |
| `add_mail_forward` | Add a forward |
| `edit_mail_forward` | Edit a forward |
| `delete_mail_forward` | Delete a forward |
| `list_postfix_queue` | List mail queue |
| `flush_postfix_queue` | Force send queued mail |
| `delete_deferred_queue` | Clear stuck mail |

## Troubleshooting

### "BillionMail login failed: access denied"

This usually means the safe path hasn't been set. If your BillionMail instance requires visiting a special URL before the UI loads (e.g. `https://mail.example.com/secretpath`), set:

```bash
export BILLIONMAIL_SAFE_PATH=secretpath
```

### "fetch failed" / connection errors

- Check that `BILLIONMAIL_BASE_URL` is reachable from your machine
- If using a self-signed SSL certificate, set `NODE_TLS_REJECT_UNAUTHORIZED=0` in your environment
- Make sure the URL includes the protocol (`https://` or `http://`)

### Tools not appearing in Claude/Pi

- Restart Claude Desktop or Pi after changing `mcp.json` / `claude_desktop_config.json`
- Verify the env vars are set in the shell that launches the MCP server (use `/bin/zsh -l -c` to load your profile)

## Development

```bash
git clone https://github.com/ziahm6638/billionmail-mcp.git
cd billionmail-mcp
npm install
npm run build

# Run integration tests (requires a live BillionMail instance)
BILLIONMAIL_BASE_URL=https://mail.example.com \
BILLIONMAIL_USER=admin \
BILLIONMAIL_PASSWORD=secret \
npm test
```

## License

MIT
