import { z } from 'zod';
import { type ToolDef, ok } from '../types.js';

// Shared pagination + fields params
const paginationParams = {
  pageCursor: z.string().optional().describe('Cursor for next page (from links.next in previous response)'),
  fields: z.string().optional().describe('Field selection: use "all" to include null values, or comma-separated field names'),
};

export const noteTools: ToolDef[] = [
  // ── Configuration ───────────────────────────────────────────────────────────

  {
    name: 'pb_list_note_configurations',
    description: 'List all note configurations for the workspace. Use this to discover available note types and their field definitions before creating notes.',
    inputSchema: z.object({ ...paginationParams }),
    handler: async (args, client) => {
      return ok(await client.get('/notes/configurations', args as Record<string, string>));
    },
  },

  {
    name: 'pb_get_note_configuration',
    description: 'Get a specific note configuration by ID.',
    inputSchema: z.object({ configurationId: z.string().describe('The note configuration ID') }),
    handler: async (args, client) => {
      const { configurationId } = args as { configurationId: string };
      return ok(await client.get(`/notes/configurations/${configurationId}`));
    },
  },

  // ── CRUD ────────────────────────────────────────────────────────────────────

  {
    name: 'pb_list_notes',
    description: 'List notes from the workspace with optional filters. Returns notes sorted by creation date (newest first).',
    inputSchema: z.object({
      archived: z.boolean().optional().describe('Filter by archived status'),
      processed: z.boolean().optional().describe('Filter by processed status'),
      'owner[email]': z.string().optional().describe('Filter notes by owner email address'),
      'source[recordId]': z.string().optional().describe('Filter by external source record ID'),
      createdFrom: z.string().optional().describe('ISO-8601 datetime: minimum creation date (inclusive)'),
      createdTo: z.string().optional().describe('ISO-8601 datetime: maximum creation date (inclusive)'),
      updatedFrom: z.string().optional().describe('ISO-8601 datetime: minimum updated date (inclusive)'),
      updatedTo: z.string().optional().describe('ISO-8601 datetime: maximum updated date (inclusive)'),
      ...paginationParams,
    }),
    handler: async (args, client) => {
      const { archived, processed, ...rest } = args as Record<string, unknown>;
      const query: Record<string, string | boolean | undefined> = { ...rest as Record<string, string | undefined> };
      if (archived !== undefined) query['archived'] = archived as boolean;
      if (processed !== undefined) query['processed'] = processed as boolean;
      return ok(await client.get('/notes', query as Record<string, string | string[] | boolean | undefined>));
    },
  },

  {
    name: 'pb_create_note',
    description: 'Create a new note (simple or conversation type). Use pb_list_note_configurations first to discover available fields for your workspace.',
    inputSchema: z.object({
      type: z.enum(['simple', 'conversation']).describe('Note type. "opportunity" cannot be created via API.'),
      fields: z.record(z.unknown()).describe('Note fields object. Must include at minimum "name" (string). Other fields depend on workspace configuration.'),
      relationships: z.array(z.object({
        type: z.enum(['customer', 'link']),
        target: z.object({
          id: z.string().describe('UUID of the related entity'),
          type: z.enum(['user', 'company', 'link']),
        }),
      })).optional().describe('Relationships to customers or product features'),
    }),
    handler: async (args, client) => {
      const { type, fields, relationships } = args as {
        type: string;
        fields: Record<string, unknown>;
        relationships?: unknown[];
      };
      const body: Record<string, unknown> = { data: { type, fields } };
      if (relationships) body['data'] = { ...(body['data'] as object), relationships };
      return ok(await client.post('/notes', body));
    },
  },

  {
    name: 'pb_get_note',
    description: 'Get a single note by ID.',
    inputSchema: z.object({
      noteId: z.string().describe('The note UUID'),
      fields: z.string().optional().describe('Field selection'),
    }),
    handler: async (args, client) => {
      const { noteId, fields } = args as { noteId: string; fields?: string };
      return ok(await client.get(`/notes/${noteId}`, fields ? { fields } : undefined));
    },
  },

  {
    name: 'pb_update_note',
    description: 'Update an existing note by ID using partial update (PATCH). Only provide the fields you want to change.',
    inputSchema: z.object({
      noteId: z.string().describe('The note UUID'),
      fields: z.record(z.unknown()).optional().describe('Fields to update'),
    }),
    handler: async (args, client) => {
      const { noteId, fields } = args as { noteId: string; fields?: Record<string, unknown> };
      return ok(await client.patch(`/notes/${noteId}`, { data: { fields } }));
    },
  },

  {
    name: 'pb_delete_note',
    description: 'Delete a note by ID.',
    inputSchema: z.object({ noteId: z.string().describe('The note UUID') }),
    handler: async (args, client) => {
      const { noteId } = args as { noteId: string };
      await client.delete(`/notes/${noteId}`);
      return ok({ success: true, noteId });
    },
  },

  {
    name: 'pb_search_notes',
    description: 'Search notes by customer IDs or linked feature IDs. Useful when filtering by a large list of IDs that would exceed URL length limits.',
    inputSchema: z.object({
      customerIds: z.array(z.string()).optional().describe('Filter by customer or company UUIDs (OR logic within this list)'),
      linkIds: z.array(z.string()).optional().describe('Filter by linked feature UUIDs (OR logic within this list)'),
      ...paginationParams,
    }),
    handler: async (args, client) => {
      const { customerIds, linkIds, pageCursor, fields } = args as {
        customerIds?: string[];
        linkIds?: string[];
        pageCursor?: string;
        fields?: string;
      };
      const body: Record<string, unknown> = {};
      if (customerIds?.length) body['customer'] = { ids: customerIds };
      if (linkIds?.length) body['link'] = { ids: linkIds };

      const url = '/notes/search' + (pageCursor || fields
        ? '?' + new URLSearchParams({ ...(pageCursor ? { pageCursor } : {}), ...(fields ? { fields } : {}) }).toString()
        : '');
      return ok(await client.post(url, body));
    },
  },

  // ── Relationships ────────────────────────────────────────────────────────────

  {
    name: 'pb_list_note_relationships',
    description: 'List all relationships for a note (linked customers, companies, features).',
    inputSchema: z.object({
      noteId: z.string().describe('The note UUID'),
      ...paginationParams,
    }),
    handler: async (args, client) => {
      const { noteId, ...rest } = args as { noteId: string } & Record<string, string>;
      return ok(await client.get(`/notes/${noteId}/relationships`, rest));
    },
  },

  {
    name: 'pb_create_note_relationship',
    description: 'Create a new relationship for a note (link to a customer or feature).',
    inputSchema: z.object({
      noteId: z.string().describe('The note UUID'),
      type: z.enum(['customer', 'link']).describe('Relationship type'),
      target: z.object({
        id: z.string().describe('UUID of the target entity'),
        type: z.enum(['user', 'company', 'link']),
      }),
    }),
    handler: async (args, client) => {
      const { noteId, type, target } = args as { noteId: string; type: string; target: object };
      return ok(await client.post(`/notes/${noteId}/relationships`, { data: { type, target } }));
    },
  },

  {
    name: 'pb_set_note_customer',
    description: 'Set (replace) the customer relationship on a note.',
    inputSchema: z.object({
      noteId: z.string().describe('The note UUID'),
      customerId: z.string().describe('UUID of the customer (user or company)'),
      customerType: z.enum(['user', 'company']),
    }),
    handler: async (args, client) => {
      const { noteId, customerId, customerType } = args as { noteId: string; customerId: string; customerType: string };
      return ok(await client.put(`/notes/${noteId}/relationships/customer`, {
        data: { target: { id: customerId, type: customerType } },
      }));
    },
  },

  {
    name: 'pb_delete_note_relationship',
    description: 'Delete a specific relationship from a note.',
    inputSchema: z.object({
      noteId: z.string().describe('The note UUID'),
      relationshipId: z.string().describe('The relationship UUID'),
    }),
    handler: async (args, client) => {
      const { noteId, relationshipId } = args as { noteId: string; relationshipId: string };
      await client.delete(`/notes/${noteId}/relationships/${relationshipId}`);
      return ok({ success: true });
    },
  },
];
