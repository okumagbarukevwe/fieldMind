import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fieldAgent } from '../../mastra/agent';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const { incident_id, title, description, worker_name } = await request.json();

  const prompt = `Incident reported by ${worker_name}:
Title: ${title}
Description: ${description}

Please analyze and provide your triage assessment.`;

  const result = await fieldAgent.generate([
    { role: 'user', content: prompt }
  ]);

  const response = result.text;

  const severityMatch = response.match(/SEVERITY:\s*(low|medium|high|critical)/i);
  const severity = severityMatch ? severityMatch[1].toLowerCase() : 'medium';

  const emergencyMatch = response.match(/EMERGENCY_SERVICES:\s*(yes|no)/i);
  const needsEmergency = emergencyMatch ? emergencyMatch[1].toLowerCase() === 'yes' : false;

  await supabase
  .from('incidents')
  .update({ severity })
  .eq('id', incident_id);

  await supabase.from('ai_logs').insert([{
    id: crypto.randomUUID(),
    prompt,
    response,
    model: 'mastra-fieldagent-llama3.3-70b',
    incident_id,
  }]);

  return NextResponse.json({ response, severity, needsEmergency });
}