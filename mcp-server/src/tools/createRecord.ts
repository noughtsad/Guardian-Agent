import { createRecord } from '../db/store.js';

export const createRecordTool = {
  name: 'db_create_record',
  description: 'Insert a record into a named collection',
  inputSchema: {
    type: 'object',
    properties: {
      collection: { type: 'string', description: 'Name of the collection' },
      data: { type: 'object', description: 'Record data to insert' },
    },
    required: ['collection', 'data'],
  },
  execute(input: { collection: string; data: Record<string, unknown> }) {
    const record = createRecord(input.collection, input.data);
    return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] };
  },
};
