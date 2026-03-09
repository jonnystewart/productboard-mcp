# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An MCP (Model Context Protocol) server that exposes ProductBoard API v2 as tools usable by Claude. Built in TypeScript using `@modelcontextprotocol/sdk`.

**API reference:** https://developer.productboard.com/v2.0.0/reference/introduction
**Base URL:** `https://api.productboard.com/v2`
**Rate limit:** 50 requests/second per token. Responses include `X-RateLimit-Remaining` and `Retry-After` headers.

## Commands

```bash
npm run build   # Compile TypeScript → dist/
npm run dev     # Run with tsx watch (no compile step, auto-restarts on save)
npm start       # Run compiled output
npm run lint    # ESLint
```

## Auth Setup

The server reads `PRODUCTBOARD_API_TOKEN` from (in order):
1. `~/.config/productboard-mcp/.env`
2. `./.env` (dev fallback)
3. Environment variable directly (e.g. set in Claude Desktop config)

Create `~/.config/productboard-mcp/.env`:
```
PRODUCTBOARD_API_TOKEN=your_token_here
```

## Adding to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "productboard": {
      "command": "node",
      "args": ["/Users/jonnystewart/DEV/ProductBoardAPIv2/dist/server.js"],
      "env": {
        "PRODUCTBOARD_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Architecture

```
src/
  server.ts          # Entry point — registers all tools, starts stdio transport
  client.ts          # ProductBoardClient — handles HTTP, auth header, query string, errors
  types.ts           # Shared ToolDef type, ok() and err() helpers
  tools/
    notes.ts         # 11 tools: pb_list_notes, pb_create_note, pb_search_notes, etc.
    entities.ts      # 11 tools: pb_list_entities, pb_create_entity, pb_search_entities, etc.
    members.ts       # 4 tools: pb_list_members, pb_get_member, pb_list_member_teams, pb_get_member_activity
    teams.ts         # 8 tools: pb_list_teams, pb_create_team, pb_add_team_member, etc.
    jira.ts          # 4 tools: pb_list_jira_integrations, pb_list_jira_connections, etc.
    webhooks.ts      # 4 tools: pb_list_webhooks, pb_create_webhook, etc.
```

All tools follow the pattern: `ToolDef` with `name`, `description`, `inputSchema` (Zod), and `handler(args, client)`.

## Key API Concepts

- **Pagination:** Cursor-based. Check `links.next` in responses; pass `pageCursor` param to get next page.
- **Configuration endpoints:** Many workspaces have custom fields. Call `pb_list_note_configurations` or `pb_list_entity_configurations` before creating entities to discover what fields are available.
- **Entity types:** `product`, `component`, `feature`, `subfeature`, `initiative`, `objective`, `keyResult`, `release`, `releaseGroup`, `company`, `user`
- **Note types:** `simple`, `conversation` (creatable via API); `opportunity` (read-only)
- **Search endpoints** (`pb_search_notes`, `pb_search_entities`) use POST — useful when filter lists are too long for URL query strings.

## Adding New Tools

1. Add `ToolDef` entries to the relevant file in `src/tools/`
2. Import and spread the array into `allTools` in `src/server.ts`
3. Run `npm run build` to verify types compile

Tool naming convention: `pb_<verb>_<resource>` (e.g. `pb_create_feature`, `pb_list_webhooks`).
