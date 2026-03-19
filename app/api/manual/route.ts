import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const { question } = await request.json();

  const { data: manuals } = await supabase
    .from('manuals')
    .select('equipment_name, content');

  const context = manuals?.map(m =>
    `Equipment: ${m.equipment_name}\nInfo: ${m.content}`
  ).join('\n\n');

  const prompt = `You are an expert field operations assistant with deep knowledge of industrial equipment safety and operations. A field worker is asking you a question and needs a clear, actionable answer.

EQUIPMENT MANUALS:
${context}

WORKER QUESTION: ${question}

Instructions:
- Give a direct, practical answer
- If the answer involves safety, highlight it clearly with ⚠️
- Include specific numbers, measurements, or steps where relevant
- If the information is not in the manuals, say so clearly
- Format your answer clearly with sections if needed
- End with a safety reminder if relevant`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are an expert industrial safety and operations assistant. Always prioritize worker safety in your answers.'
      },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
  });

  const answer = completion.choices[0]?.message?.content || '';

  await supabase.from('ai_logs').insert([{
    id: crypto.randomUUID(),
    prompt,
    response: answer,
    model: 'llama-3.3-70b-versatile-manual-expert',
    incident_id: null,
  }]);

  return NextResponse.json({ answer });
}