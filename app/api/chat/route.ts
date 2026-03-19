import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const { message, history, worker_email, session_id } = await request.json();

  const { data: manuals } = await supabase
    .from('manuals')
    .select('equipment_name, content');

  const { data: recentIncidents } = await supabase
    .from('incidents')
    .select('title, severity, status, created_at')
    .eq('worker_email', worker_email)
    .order('created_at', { ascending: false })
    .limit(5);

  const context = `
EQUIPMENT MANUALS:
${manuals?.map(m => `${m.equipment_name}: ${m.content}`).join('\n')}

WORKER'S RECENT INCIDENTS:
${recentIncidents?.map(i => `- ${i.title} (${i.severity}) - ${i.status}`).join('\n') || 'No recent incidents'}
`;

  const messages = [
    {
      role: 'system' as const,
      content: `You are FieldMind AI — a smart, friendly assistant for field workers in industrial environments. 
You have access to equipment manuals and the worker's incident history.
Help workers with safety questions, equipment issues, incident reporting guidance, and general field operations.
Be concise, practical, and always prioritize safety.
Context about this worker:
${context}`
    },
    ...history.map((h: any) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: message }
  ];

  const completion = await groq.chat.completions.create({
    messages,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 500,
  });

  const response = completion.choices[0]?.message?.content || '';

  await supabase.from('chats').insert([
    {
      id: crypto.randomUUID(),
      worker_email,
      role: 'user',
      content: message,
      session_id,
      synced: true,
    },
    {
      id: crypto.randomUUID(),
      worker_email,
      role: 'assistant',
      content: response,
      session_id,
      synced: true,
    }
  ]);

  return NextResponse.json({ response });
}