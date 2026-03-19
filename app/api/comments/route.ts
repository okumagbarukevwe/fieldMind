import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const incident_id = searchParams.get('incident_id');

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('incident_id', incident_id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data });
}

export async function POST(request: Request) {
  const { incident_id, author_email, content } = await request.json();

  const { data, error } = await supabase
    .from('comments')
    .insert([{
      id: crypto.randomUUID(),
      incident_id,
      author_email,
      content,
      created_at: new Date().toISOString(),
    }]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}