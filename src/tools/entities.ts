import { z } from 'zod';
import { type ToolDef, ok } from '../types.js';

const ENTITY_TYPES = [
  'product', 'component', 'feature', 'subfeature',
  'initiative', 'objective', 'keyResult',
  'release', 'releaseGroup', 'company', 'user',
] as const;

const paginationParams = {
  pageCursor: z.string().optional().describe('Cursor for next page'),
  fields: z.string().optional().describe('Field selection: "all" or comma-separated field names'),
};

export const entityTools: ToolDef[] = [
  // ── Configuration ───────────────────────────────────────────────────────────

  {
    name: 'pb_list_entity_configurations',
    description: 'List entity configurations for the workspace. Use this to discover available entity types and their field definitions before creating entities.',
    inputSchema: z.object({ ...paginationParams }),
    handler: async (args, client) => {
      return ok(await client.get('/entities/configurations', args as Record<string, string>));
    },
  },

  {
    name: 'pb_get_entity_configuration',
    description: 'Get a specific entity configuration by ID.',
    inputSchema: z.object({ configurationId: z.string().describe('The entity configuration ID') }),
    handler: async (args, client) => {
      const { configurationId } = args as { configurationId: string };
      return ok(await client.get(`/entities/configurations/${configurationId}`));
    },
  },

  // ── CRUD ────────────────────────────────────────────────────────────────────

  {
    name: 'pb_list_entities',
    description: `List entities from the workspace. Filter by one or more entity types. Supported types: ${ENTITY_TYPES.join(', ')}.`,
    inputSchema: z.object({
      types: z.array(z.enum(ENTITY_TYPES)).optional().describe('Filter by entity types (e.g. ["feature", "initiative"])'),
      ...paginationParams,
    }),
    handler: async (args, client) => {
      const { types, pageCursor, fields } = args as { types?: string[]; pageCursor?: string; fields?: string };
      return ok(await client.get('/entities', {
        'type': types,
        pageCursor,
        fields,
      } as Record<string, string | string[] | boolean | undefined>));
    },
  },

  {
    name: 'pb_create_entity',
    description: 'Create a new entity (feature, initiative, objective, etc.). Use pb_list_entity_configurations first to discover available fields.',
    inputSchema: z.object({
      type: z.enum(ENTITY_TYPES).describe('Entity type to create'),
      fields: z.record(z.unknown()).describe('Entity field values. Field names and requirements depend on workspace configuration.'),
      relationships: z.record(z.unknown()).optional().describe('Relationships to other entities (e.g. parent)'),
    }),
    handler: async (args, client) => {
      const { type, fields, relationships } = args as {
        type: string;
        fields: Record<string, unknown>;
        relationships?: Record<string, unknown>;
      };
      const body: Record<string, unknown> = { data: { type, fields } };
      if (relationships) (body['data'] as Record<string, unknown>)['relationships'] = relationships;
      return ok(await client.post('/entities', body));
    },
  },

  {
    name: 'pb_get_entity',
    description: 'Get a single entity by ID.',
    inputSchema: z.object({
      entityId: z.string().describe('The entity UUID'),
      fields: z.string().optional().describe('Field selection'),
    }),
    handler: async (args, client) => {
      const { entityId, fields } = args as { entityId: string; fields?: string };
      return ok(await client.get(`/entities/${entityId}`, fields ? { fields } : undefined));
    },
  },

  {
    name: 'pb_update_entity',
    description: 'Update an existing entity by ID using partial update (PATCH). Only provide the fields you want to change.',
    inputSchema: z.object({
      entityId: z.string().describe('The entity UUID'),
      fields: z.record(z.unknown()).optional().describe('Fields to update'),
      relationships: z.record(z.unknown()).optional().describe('Relationships to update'),
    }),
    handler: async (args, client) => {
      const { entityId, fields, relationships } = args as {
        entityId: string;
        fields?: Record<string, unknown>;
        relationships?: Record<string, unknown>;
      };
      const data: Record<string, unknown> = {};
      if (fields) data['fields'] = fields;
      if (relationships) data['relationships'] = relationships;
      return ok(await client.patch(`/entities/${entityId}`, { data }));
    },
  },

  {
    name: 'pb_delete_entity',
    description: 'Delete an entity by ID.',
    inputSchema: z.object({ entityId: z.string().describe('The entity UUID') }),
    handler: async (args, client) => {
      const { entityId } = args as { entityId: string };
      await client.delete(`/entities/${entityId}`);
      return ok({ success: true, entityId });
    },
  },

  {
    name: 'pb_search_entities',
    description: 'Search entities using POST (allows larger filter payloads). Can only search within one entity type at a time. Only AND operator is supported across filter types.',
    inputSchema: z.object({
      type: z.enum(ENTITY_TYPES).describe('Entity type to search within'),
      filters: z.record(z.unknown()).optional().describe('Filter criteria (workspace-specific, discoverable via pb_list_entity_configurations)'),
      ...paginationParams,
    }),
    handler: async (args, client) => {
      const { type, filters, pageCursor, fields } = args as {
        type: string;
        filters?: Record<string, unknown>;
        pageCursor?: string;
        fields?: string;
      };
      const qs = new URLSearchParams();
      if (pageCursor) qs.set('pageCursor', pageCursor);
      if (fields) qs.set('fields', fields);
      const url = '/entities/search' + (qs.toString() ? `?${qs.toString()}` : '');
      return ok(await client.post(url, { type, ...(filters ?? {}) }));
    },
  },

  // ── Relationships ────────────────────────────────────────────────────────────

  {
    name: 'pb_list_entity_relationships',
    description: 'List relationships for an entity (parent, children, linked notes, etc.).',
    inputSchema: z.object({
      entityId: z.string().describe('The entity UUID'),
      ...paginationParams,
    }),
    handler: async (args, client) => {
      const { entityId, ...rest } = args as { entityId: string } & Record<string, string>;
      return ok(await client.get(`/entities/${entityId}/relationships`, rest));
    },
  },

  {
    name: 'pb_create_entity_relationship',
    description: 'Create a relationship between entities.',
    inputSchema: z.object({
      entityId: z.string().describe('The source entity UUID'),
      type: z.string().describe('Relationship type (workspace-specific)'),
      target: z.object({
        id: z.string().describe('UUID of the target entity'),
        type: z.string().describe('Type of the target entity'),
      }),
    }),
    handler: async (args, client) => {
      const { entityId, type, target } = args as { entityId: string; type: string; target: object };
      return ok(await client.post(`/entities/${entityId}/relationships`, { data: { type, target } }));
    },
  },

  {
    name: 'pb_set_entity_parent',
    description: 'Set (replace) the parent relationship for an entity.',
    inputSchema: z.object({
      entityId: z.string().describe('The entity UUID'),
      parentId: z.string().describe('UUID of the new parent entity'),
      parentType: z.enum(ENTITY_TYPES).describe('Type of the parent entity'),
    }),
    handler: async (args, client) => {
      const { entityId, parentId, parentType } = args as { entityId: string; parentId: string; parentType: string };
      return ok(await client.put(`/entities/${entityId}/relationships/parent`, {
        data: { target: { id: parentId, type: parentType } },
      }));
    },
  },

  {
    name: 'pb_delete_entity_relationship',
    description: 'Delete a specific relationship from an entity.',
    inputSchema: z.object({
      entityId: z.string().describe('The entity UUID'),
      relationshipId: z.string().describe('The relationship UUID'),
    }),
    handler: async (args, client) => {
      const { entityId, relationshipId } = args as { entityId: string; relationshipId: string };
      await client.delete(`/entities/${entityId}/relationships/${relationshipId}`);
      return ok({ success: true });
    },
  },
];
