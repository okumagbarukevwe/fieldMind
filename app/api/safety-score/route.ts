import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fieldAgent } from '../../mastra/agent';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function calculateScore(incidents: any[]) {
  let score = 100;

  for (const incident of incidents) {
    if (incident.severity === 'critical') score -= 20;
    else if (incident.severity === 'high') score -= 10;
    else if (incident.severity === 'medium') score -= 5;
    else if (incident.severity === 'low') score -= 2;

    if (incident.status === 'resolved') score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function getGrade(score: number) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export async function POST(request: Request) {
  const { worker_email, worker_name } = await request.json();

  const { data: incidents } = await supabase
    .from('incidents')
    .select('*')
    .eq('worker_email', worker_email);

  const allIncidents = incidents || [];
  const score = calculateScore(allIncidents);
  const grade = getGrade(score);

  const prompt = `Analyze this worker's safety record and provide a brief safety assessment:

Worker: ${worker_name}
Safety Score: ${score}/100 (Grade: ${grade})
Total Incidents: ${allIncidents.length}
Critical Incidents: ${allIncidents.filter(i => i.severity === 'critical').length}
High Incidents: ${allIncidents.filter(i => i.severity === 'high').length}
Resolved Incidents: ${allIncidents.filter(i => i.status === 'resolved').length}

Provide:
1. A brief assessment (2-3 sentences)
2. One key strength
3. One area to improve
Keep it constructive and encouraging.`;

  const result = await fieldAgent.generate([
    { role: 'user', content: prompt }
  ]);

  const assessment = result.text;

  await supabase.from('safety_scores').upsert({
    worker_email,
    worker_name,
    score,
    grade,
    total_incidents: allIncidents.length,
    critical_incidents: allIncidents.filter(i => i.severity === 'critical').length,
    resolved_incidents: allIncidents.filter(i => i.status === 'resolved').length,
    last_updated: new Date().toISOString(),
  }, { onConflict: 'worker_email' });

  await supabase.from('ai_logs').insert([{
    id: crypto.randomUUID(),
    prompt,
    response: assessment,
    model: 'mastra-safety-score',
    incident_id: null,
  }]);

  return NextResponse.json({ score, grade, assessment });
}

export async function GET() {
  const { data } = await supabase
    .from('safety_scores')
    .select('*')
    .order('score', { ascending: false });

  return NextResponse.json({ scores: data || [] });
}