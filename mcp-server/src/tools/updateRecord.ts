import { updateRecord } from '../db/store.js';

export const updateRecordTool = {
  name: 'db_update_record',
  description: 'Update fields on a record in a named collection',
  inputSchema: {
    type: 'object',
    properties: {
      collection: { type: 'string', description: 'Name of the collection' },
      id: { type: 'string', description: 'Record ID to update' },
      patch: { type: 'object', description: 'Fields to update' },
    },
    required: ['collection', 'id', 'patch'],
  },
  execute(input: { collection: string; id: string; patch: Record<string, unknown> }) {
    const record = updateRecord(input.collection, input.id, input.patch);
    if (!record) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Record not found' }) }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] };
  },
};
