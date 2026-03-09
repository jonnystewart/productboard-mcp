import { z } from 'zod';
import { type ToolDef, ok } from '../types.js';

const paginationParams = {
  pageCursor: z.string().optional().describe('Cursor for next page'),
  fields: z.string().optional().describe('Field selection'),
};

export const jiraTools: ToolDef[] = [
  {
    name: 'pb_list_jira_integrations',
    description: 'List all Jira integration configurations set up in the workspace.',
    inputSchema: z.object({ ...paginationParams }),
    handler: async (args, client) => {
      return ok(await client.get('/jira-integrations', args as Record<string, string>));
    },
  },

  {
    name: 'pb_get_jira_integration',
    description: 'Get a specific Jira integration configuration by ID.',
    inputSchema: z.object({ integrationId: z.string().describe('The Jira integration ID') }),
    handler: async (args, client) => {
      const { integrationId } = args as { integrationId: string };
      return ok(await client.get(`/jira-integrations/${integrationId}`));
    },
  },

  {
    name: 'pb_list_jira_connections',
    description: 'List Jira integration connections (links between ProductBoard entities and Jira issues) for a specific integration.',
    inputSchema: z.object({
      integrationId: z.string().describe('The Jira integration ID'),
      ...paginationParams,
    }),
    handler: async (args, client) => {
      const { integrationId, ...rest } = args as { integrationId: string } & Record<string, string>;
      return ok(await client.get(`/jira-integrations/${integrationId}/connections`, rest));
    },
  },

  {
    name: 'pb_get_jira_connection',
    description: 'Get a specific Jira integration connection by ID.',
    inputSchema: z.object({
      integrationId: z.string().describe('The Jira integration ID'),
      connectionId: z.string().describe('The connection ID'),
    }),
    handler: async (args, client) => {
      const { integrationId, connectionId } = args as { integrationId: string; connectionId: string };
      return ok(await client.get(`/jira-integrations/${integrationId}/connections/${connectionId}`));
    },
  },
];
