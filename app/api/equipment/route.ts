import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fieldAgent } from '../../mastra/agent';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qr_code = searchParams.get('qr_code');
  const id = searchParams.get('id');

  if (qr_code) {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('qr_code', qr_code)
      .single();

    if (error) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });

    const { data: incidents } = await supabase
      .from('incidents')
      .select('*')
      .eq('equipment_id', data.id)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({ equipment: data, incidents: incidents || [] });
  }

  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .order('health_score', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ equipment: data });
}

export async function PATCH(request: Request) {
  const { equipment_id } = await request.json();

  const { data: incidents } = await supabase
    .from('incidents')
    .select('*')
    .eq('equipment_id', equipment_id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', equipment_id)
    .single();

  if (!incidents || !equipment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let healthScore = 100;
  for (const incident of incidents) {
    if (incident.severity === 'critical') healthScore -= 25;
    else if (incident.severity === 'high') healthScore -= 15;
    else if (incident.severity === 'medium') healthScore -= 8;
    else healthScore -= 3;
    if (incident.status === 'resolved') healthScore += 5;
  }
  healthScore = Math.max(0, Math.min(100, healthScore));

  const healthStatus = healthScore >= 80 ? 'good' : healthScore >= 50 ? 'warning' : 'critical';

  const prompt = `You are an equipment safety AI. Analyze this equipment's health:

Equipment: ${equipment.name}
Location: ${equipment.location}
Health Score: ${healthScore}/100
Status: ${healthStatus}
Recent incidents: ${incidents.length}

Recent incidents:
${incidents.map(i => `- ${i.title} (${i.severity})`).join('\n')}

In 2 sentences, tell workers if this equipment is safe to use and what precautions to take.`;

  const result = await fieldAgent.generate([
    { role: 'user', content: prompt }
  ]);

  const aiRecommendation = result.text;

  await supabase
    .from('equipment')
    .update({
      health_score: healthScore,
      health_status: healthStatus,
    })
    .eq('id', equipment_id);

  await supabase.from('ai_logs').insert([{
    id: crypto.randomUUID(),
    prompt,
    response: aiRecommendation,
    model: 'mastra-equipment-health',
    incident_id: null,
  }]);

  return NextResponse.json({ healthScore, healthStatus, aiRecommendation });
}