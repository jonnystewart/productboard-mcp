import { z } from 'zod';
import { type ToolDef, ok } from '../types.js';

const paginationParams = {
  pageCursor: z.string().optional().describe('Cursor for next page'),
  fields: z.string().optional().describe('Field selection'),
};

export const webhookTools: ToolDef[] = [
  {
    name: 'pb_list_webhooks',
    description: 'List all webhook subscriptions configured in the workspace.',
    inputSchema: z.object({ ...paginationParams }),
    handler: async (args, client) => {
      return ok(await client.get('/webhooks', args as Record<string, string>));
    },
  },

  {
    name: 'pb_create_webhook',
    description: 'Create a new webhook subscription to receive event notifications from ProductBoard.',
    inputSchema: z.object({
      url: z.string().url().describe('HTTPS endpoint that will receive webhook POST requests'),
      events: z.array(z.string()).describe('Array of event types to subscribe to (workspace-specific)'),
      name: z.string().optional().describe('Human-readable name for the webhook'),
      active: z.boolean().optional().describe('Whether the webhook is active (default: true)'),
    }),
    handler: async (args, client) => {
      const { url, events, name, active } = args as {
        url: string;
        events: string[];
        name?: string;
        active?: boolean;
      };
      const fields: Record<string, unknown> = { url, events };
      if (name !== undefined) fields['name'] = name;
      if (active !== undefined) fields['active'] = active;
      return ok(await client.post('/webhooks', { data: { fields } }));
    },
  },

  {
    name: 'pb_get_webhook',
    description: 'Get a specific webhook subscription by ID.',
    inputSchema: z.object({ webhookId: z.string().describe('The webhook UUID') }),
    handler: async (args, client) => {
      const { webhookId } = args as { webhookId: string };
      return ok(await client.get(`/webhooks/${webhookId}`));
    },
  },

  {
    name: 'pb_delete_webhook',
    description: 'Delete a webhook subscription by ID.',
    inputSchema: z.object({ webhookId: z.string().describe('The webhook UUID') }),
    handler: async (args, client) => {
      const { webhookId } = args as { webhookId: string };
      await client.delete(`/webhooks/${webhookId}`);
      return ok({ success: true, webhookId });
    },
  },
];
