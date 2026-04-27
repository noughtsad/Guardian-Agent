import { deleteRecord } from '../db/store.js';

export const deleteRecordTool = {
  name: 'db_delete_record',
  description: 'Delete a record by ID from a named collection',
  inputSchema: {
    type: 'object',
    properties: {
      collection: { type: 'string', description: 'Name of the collection' },
      id: { type: 'string', description: 'Record ID to delete' },
    },
    required: ['collection', 'id'],
  },
  execute(input: { collection: string; id: string }) {
    const deleted = deleteRecord(input.collection, input.id);
    if (!deleted) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Record not found' }) }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, id: input.id }) }] };
  },
};
