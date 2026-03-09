import { z } from 'zod';
import { ProductBoardClient } from './client.js';

export type ToolResult = { content: Array<{ type: 'text'; text: string }> };

export type ToolDef = {
  name: string;
  description: string;
  inputSchema?: z.ZodTypeAny;
  handler: (args: unknown, client: ProductBoardClient) => Promise<ToolResult>;
};

export const ok = (data: unknown): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
});

export const err = (message: string): ToolResult => ({
  content: [{ type: 'text', text: `Error: ${message}` }],
});
