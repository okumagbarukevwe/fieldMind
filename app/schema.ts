import { column, Schema, Table } from '@powersync/web';
// OR: import { column, Schema, Table } from '@powersync/react-native';

const incidents = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    title: column.text,
    description: column.text,
    severity: column.text,
    worker_name: column.text,
    synced_at: column.text
  },
  { indexes: {} }
);

const ai_logs = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    prompt: column.text,
    response: column.text,
    model: column.text,
    incident_id: column.text
  },
  { indexes: {} }
);

const manuals = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    equipment_name: column.text,
    content: column.text
  },
  { indexes: {} }
);

export const AppSchema = new Schema({
  incidents,
  ai_logs,
  manuals
});

export type Database = (typeof AppSchema)['types'];

