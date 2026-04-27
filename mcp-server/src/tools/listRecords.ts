import { listRecords } from '../db/store.js';

export const listRecordsTool = {
  name: 'db_list_records',
  description: 'List all records in a collection with optional filter and limit',
  inputSchema: {
    type: 'object',
    properties: {
      collection: { type: 'string', description: 'Name of the collection' },
      filter: { type: 'object', description: 'Optional filter (key-value pairs to match)' },
      limit: { type: 'number', description: 'Optional max number of records to return' },
    },
    required: ['collection'],
  },
  execute(input: { collection: string; filter?: Record<string, unknown>; limit?: number }) {
    const records = listRecords(input.collection, input.filter, input.limit);
    return { content: [{ type: 'text', text: JSON.stringify(records, null, 2) }] };
  },
};
