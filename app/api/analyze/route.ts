import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const { incident_id, title, description } = await request.json();

  const prompt = `You are an AI assistant for field workers. Analyze this incident and respond with:
1. Severity level - respond with exactly one word: low, medium, high, or critical
2. Immediate action to take
3. Safety warnings if any

Incident title: ${title}
Description: ${description}

Start your response with "SEVERITY: low/medium/high/critical" on the first line.
Keep your response short and practical.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
  });

  const response = completion.choices[0]?.message?.content || '';

  const severityMatch = response.match(/SEVERITY:\s*(low|medium|high|critical)/i);
  const severity = severityMatch ? severityMatch[1].toLowerCase() : 'low';

  await supabase.from('incidents')
    .update({ severity })
    .eq('id', incident_id);

  await supabase.from('ai_logs').insert([{
    id: crypto.randomUUID(),
    prompt,
    response,
    model: 'llama-3.3-70b-versatile',
    incident_id,
  }]);

  return NextResponse.json({ response, severity });
}