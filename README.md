# productboard-mcp

An MCP (Model Context Protocol) server that connects Claude to the [ProductBoard API v2](https://developer.productboard.com/v2.0.0/reference/introduction). Ask Claude questions about your ProductBoard workspace in plain English.

## What you can do

- **Notes** — list, search, create, update, delete feedback notes and manage their relationships to features and customers
- **Entities** — query and manage features, initiatives, objectives, components, releases, and more
- **Members & Teams** — look up members, list teams, manage team membership
- **Analytics** — retrieve member activity data
- **Jira integrations** — inspect Jira integration configs and connections
- **Webhooks** — list, create, and delete webhook subscriptions

35 tools in total, covering the full ProductBoard API v2 surface.

## Requirements

- [Claude Desktop](https://claude.ai/download)
- Node.js 18+
- A ProductBoard account on the Pro plan or higher
- A ProductBoard API token (Settings → Workspace → API Access)

## Setup

### 1. Clone and build

```bash
git clone https://github.com/jonnystewart/productboard-mcp
cd productboard-mcp
npm install
npm run build
```

### 2. Add your API token

```bash
mkdir -p ~/.config/productboard-mcp
echo "PRODUCTBOARD_API_TOKEN=your_token_here" > ~/.config/productboard-mcp/.env
```

Get your token from ProductBoard: **Settings → Workspace → API Access → Generate token**

### 3. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "productboard": {
      "command": "node",
      "args": ["/absolute/path/to/productboard-mcp/dist/server.js"]
    }
  }
}
```

Alternatively, pass the token directly in the config:

```json
{
  "mcpServers": {
    "productboard": {
      "command": "node",
      "args": ["/absolute/path/to/productboard-mcp/dist/server.js"],
      "env": {
        "PRODUCTBOARD_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

Fully quit (Cmd+Q) and relaunch. ProductBoard will appear in the connectors list.

## Example prompts

- *"List my 10 most recent ProductBoard notes and summarise them"*
- *"Show me all features in the backlog"*
- *"How many notes were created last week?"*
- *"Find all initiatives linked to our Q2 release"*
- *"List all members and which teams they belong to"*

## Development

```bash
npm run dev    # Run with live reload (no build step)
npm run build  # Compile TypeScript → dist/
npm run lint   # ESLint
```

## Notes on the API

- ProductBoard API v2 is currently in beta
- Rate limit: 50 requests/second per token
- Many field names are workspace-specific — use the `pb_list_note_configurations` and `pb_list_entity_configurations` tools to discover what's available in your workspace before creating records

## Licence

MIT
