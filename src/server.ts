import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { ProductBoardClient } from './client.js';
import { type ToolDef, err } from './types.js';
import { noteTools } from './tools/notes.js';
import { entityTools } from './tools/entities.js';
import { memberTools } from './tools/members.js';
import { teamTools } from './tools/teams.js';
import { jiraTools } from './tools/jira.js';
import { webhookTools } from './tools/webhooks.js';

// ── Environment loading ──────────────────────────────────────────────────────

const loadEnvironment = () => {
  const paths = [
    join(homedir(), '.config', 'productboard-mcp', '.env'),
    join(process.cwd(), '.env'),
  ];

  for (const p of paths) {
    if (existsSync(p)) {
      dotenv.config({ path: p });
      console.error(`Loaded environment from: ${p}`);
      return;
    }
  }

  // Allow token via env var directly (e.g. set in Claude Desktop config)
  if (process.env.PRODUCTBOARD_API_TOKEN) return;

  console.error('No .env file found. Set PRODUCTBOARD_API_TOKEN in the environment or create ~/.config/productboard-mcp/.env');
};

loadEnvironment();

const token = process.env.PRODUCTBOARD_API_TOKEN;
if (!token) {
  console.error('PRODUCTBOARD_API_TOKEN is not set. Exiting.');
  process.exit(1);
}

// ── Server setup ─────────────────────────────────────────────────────────────

const client = new ProductBoardClient(token);

const server = new Server(
  { name: 'productboard-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

// All tools registered in one flat list
const allTools: ToolDef[] = [
  ...noteTools,
  ...entityTools,
  ...memberTools,
  ...teamTools,
  ...jiraTools,
  ...webhookTools,
];

// ── List tools handler ────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema
      ? zodToJsonSchema(t.inputSchema, { $refStrategy: 'none' })
      : { type: 'object', properties: {} },
  })),
}));

// ── Call tool handler ─────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = allTools.find((t) => t.name === name);

  if (!tool) {
    return err(`Unknown tool: ${name}`);
  }

  try {
    return await tool.handler(args ?? {}, client);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(message);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('ProductBoard MCP server running on stdio');
