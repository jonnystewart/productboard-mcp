import { z } from 'zod';
import { type ToolDef, ok } from '../types.js';

const paginationParams = {
  pageCursor: z.string().optional().describe('Cursor for next page'),
  fields: z.string().optional().describe('Field selection: "all" or comma-separated field names'),
};

export const memberTools: ToolDef[] = [
  {
    name: 'pb_list_members',
    description: 'List all members in the ProductBoard workspace.',
    inputSchema: z.object({ ...paginationParams }),
    handler: async (args, client) => {
      return ok(await client.get('/members', args as Record<string, string>));
    },
  },

  {
    name: 'pb_get_member',
    description: 'Get a single workspace member by ID.',
    inputSchema: z.object({
      memberId: z.string().describe('The member UUID'),
      fields: z.string().optional().describe('Field selection'),
    }),
    handler: async (args, client) => {
      const { memberId, fields } = args as { memberId: string; fields?: string };
      return ok(await client.get(`/members/${memberId}`, fields ? { fields } : undefined));
    },
  },

  {
    name: 'pb_list_member_teams',
    description: 'List all teams that a member belongs to.',
    inputSchema: z.object({
      memberId: z.string().describe('The member UUID'),
      ...paginationParams,
    }),
    handler: async (args, client) => {
      const { memberId, ...rest } = args as { memberId: string } & Record<string, string>;
      return ok(await client.get(`/members/${memberId}/relationships`, rest));
    },
  },

  {
    name: 'pb_get_member_activity',
    description: 'Retrieve analytics data about member activity (views, note processing, insight usage, board interactions).',
    inputSchema: z.object({
      from: z.string().optional().describe('ISO-8601 datetime: start of activity window'),
      to: z.string().optional().describe('ISO-8601 datetime: end of activity window'),
      ...paginationParams,
    }),
    handler: async (args, client) => {
      const { from, to, ...rest } = args as { from?: string; to?: string } & Record<string, string>;
      return ok(await client.get('/analytics/members/activity', { from, to, ...rest } as Record<string, string>));
    },
  },
];
