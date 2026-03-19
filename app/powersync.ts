import { PowerSyncDatabase } from '@powersync/web';
import { createClient } from '@supabase/supabase-js';
import { AppSchema } from './schema';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const powerSyncUrl = process.env.NEXT_PUBLIC_POWERSYNC_URL!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const connector = {
  async fetchCredentials() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      endpoint: powerSyncUrl,
      token: session?.access_token ?? '',
    };
  },
  async uploadData(database: any) {
    const batch = await database.getCrudBatch();
    if (!batch) return;
    for (const entry of batch.crud) {
      const { table, opData, op } = entry;
      if (op === 'PUT') {
        await supabase.from(table).upsert(opData);
      } else if (op === 'PATCH') {
        await supabase.from(table).update(opData).eq('id', entry.id);
      } else if (op === 'DELETE') {
        await supabase.from(table).delete().eq('id', entry.id);
      }
    }
    await batch.complete();
  },
};

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'fieldmind.db',
  },
});