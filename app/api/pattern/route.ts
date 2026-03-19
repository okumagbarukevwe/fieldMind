import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fieldAgent } from '../../mastra/agent';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
  const { data: incidents } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!incidents || incidents.length < 3) {
    return NextResponse.json({ message: 'Not enough incidents for pattern analysis' });
  }

  const summary = incidents.map(i =>
    `- ${i.title} (${i.severity}) in ${i.zone || 'Unknown zone'} on ${new Date(i.created_at).toLocaleDateString()}`
  ).join('\n');

  const prompt = `You are a field operations risk analyst. Analyze these recent incidents and identify patterns, risks, and recommendations:

RECENT INCIDENTS:
${summary}

Provide:
1. Key patterns you notice
2. Highest risk areas or categories
3. Recommended preventive actions
4. Overall risk level (low/medium/high/critical)

Be concise and actionable.`;

  const result = await fieldAgent.generate([
    { role: 'user', content: prompt }
  ]);

  const content = result.text;

  await supabase.from('reports').insert([{
    id: crypto.randomUUID(),
    title: `Pattern Analysis Report — ${new Date().toLocaleDateString()}`,
    content,
    incident_count: incidents.length,
    report_type: 'pattern_analysis',
  }]);

  await supabase.from('ai_logs').insert([{
    id: crypto.randomUUID(),
    prompt,
    response: content,
    model: 'mastra-pattern-analysis',
    incident_id: null,
  }]);

  return NextResponse.json({ success: true, content });
}