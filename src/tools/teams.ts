import { z } from 'zod';
import { type ToolDef, ok } from '../types.js';

const paginationParams = {
  pageCursor: z.string().optional().describe('Cursor for next page'),
  fields: z.string().optional().describe('Field selection: "all" or comma-separated field names'),
};

export const teamTools: ToolDef[] = [
  {
    name: 'pb_list_teams',
    description: 'List all teams in the ProductBoard workspace.',
    inputSchema: z.object({ ...paginationParams }),
    handler: async (args, client) => {
      return ok(await client.get('/teams', args as Record<string, string>));
    },
  },

  {
    name: 'pb_create_team',
    description: 'Create a new team in the workspace.',
    inputSchema: z.object({
      name: z.string().describe('Team name'),
      fields: z.record(z.unknown()).optional().describe('Additional team fields'),
    }),
    handler: async (args, client) => {
      const { name, fields } = args as { name: string; fields?: Record<string, unknown> };
      return ok(await client.post('/teams', { data: { fields: { name, ...fields } } }));
    },
  },

  {
    name: 'pb_get_team',
    description: 'Get a single team by ID.',
    inputSchema: z.object({
      teamId: z.string().describe('The team UUID'),
      fields: z.string().optional().describe('Field selection'),
    }),
    handler: async (args, client) => {
      const { teamId, fields } = args as { teamId: string; fields?: string };
      return ok(await client.get(`/teams/${teamId}`, fields ? { fields } : undefined));
    },
  },

  {
    name: 'pb_update_team',
    description: 'Update an existing team by ID.',
    inputSchema: z.object({
      teamId: z.string().describe('The team UUID'),
      fields: z.record(z.unknown()).describe('Fields to update (e.g. { "name": "New Name" })'),
    }),
    handler: async (args, client) => {
      const { teamId, fields } = args as { teamId: string; fields: Record<string, unknown> };
      return ok(await client.patch(`/teams/${teamId}`, { data: { fields } }));
    },
  },

  {
    name: 'pb_delete_team',
    description: 'Delete a team by ID.',
    inputSchema: z.object({ teamId: z.string().describe('The team UUID') }),
    handler: async (args, client) => {
      const { teamId } = args as { teamId: string };
      await client.delete(`/teams/${teamId}`);
      return ok({ success: true, teamId });
    },
  },

  {
    name: 'pb_list_team_members',
    description: 'List all members in a team.',
    inputSchema: z.object({
      teamId: z.string().describe('The team UUID'),
      ...paginationParams,
    }),
    handler: async (args, client) => {
      const { teamId, ...rest } = args as { teamId: string } & Record<string, string>;
      return ok(await client.get(`/teams/${teamId}/relationships`, rest));
    },
  },

  {
    name: 'pb_add_team_member',
    description: 'Add a member to a team.',
    inputSchema: z.object({
      teamId: z.string().describe('The team UUID'),
      memberId: z.string().describe('UUID of the member to add'),
    }),
    handler: async (args, client) => {
      const { teamId, memberId } = args as { teamId: string; memberId: string };
      return ok(await client.post(`/teams/${teamId}/relationships`, {
        data: { type: 'member', target: { id: memberId, type: 'member' } },
      }));
    },
  },

  {
    name: 'pb_delete_team_member',
    description: 'Remove a member from a team.',
    inputSchema: z.object({
      teamId: z.string().describe('The team UUID'),
      memberId: z.string().describe('UUID of the member to remove'),
    }),
    handler: async (args, client) => {
      const { teamId, memberId } = args as { teamId: string; memberId: string };
      await client.delete(`/teams/${teamId}/relationships/${memberId}`);
      return ok({ success: true });
    },
  },
];
