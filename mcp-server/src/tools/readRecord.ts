import { readRecord } from '../db/store.js';

export const readRecordTool = {
  name: 'db_read_record',
  description: 'Fetch a record by ID from a named collection',
  inputSchema: {
    type: 'object',
    properties: {
      collection: { type: 'string', description: 'Name of the collection' },
      id: { type: 'string', description: 'Record ID to fetch' },
    },
    required: ['collection', 'id'],
  },
  execute(input: { collection: string; id: string }) {
    const record = readRecord(input.collection, input.id);
    if (!record) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Record not found' }) }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] };
  },
};
