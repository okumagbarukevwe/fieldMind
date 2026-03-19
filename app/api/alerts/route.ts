import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alerts: data });
}

export async function POST(request: Request) {
  const { title, message, severity, sent_by } = await request.json();

  const { data, error } = await supabase
    .from('alerts')
    .insert([{
      id: crypto.randomUUID(),
      title,
      message,
      severity,
      sent_by,
      active: true,
    }]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();

  await supabase
    .from('alerts')
    .update({ active: false })
    .eq('id', id);

  return NextResponse.json({ success: true });
}