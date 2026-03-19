import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fieldAgent } from '../../mastra/agent';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentIncidents } = await supabase
    .from('incidents')
    .select('*')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false });

  if (!recentIncidents || recentIncidents.length < 2) {
    return NextResponse.json({ message: 'Not enough data for predictions' });
  }

  const zoneGroups = recentIncidents.reduce((acc: any, incident) => {
    const zone = incident.zone || 'Unknown Zone';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(incident);
    return acc;
  }, {});

  const predictions = [];

  for (const [zone, incidents] of Object.entries(zoneGroups)) {
    const zoneIncidents = incidents as any[];
    if (zoneIncidents.length < 2) continue;

    const prompt = `You are a predictive safety analyst. Based on these recent incidents in ${zone}, predict future risks:

RECENT INCIDENTS IN ${zone}:
${zoneIncidents.map(i => `- ${i.title} (${i.severity}) on ${new Date(i.created_at).toLocaleDateString()}`).join('\n')}

Provide a prediction in this EXACT format:
RISK_LEVEL: [low/medium/high/critical]
CONFIDENCE: [number 0-100]
PREDICTION: [one sentence predicting what might happen next]
RECOMMENDED_ACTIONS: [3 specific preventive actions separated by semicolons]

Be specific and actionable.`;

    const result = await fieldAgent.generate([
      { role: 'user', content: prompt }
    ]);

    const response = result.text;

    const riskMatch = response.match(/RISK_LEVEL:\s*(\w+)/i);
    const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/i);
    const predictionMatch = response.match(/PREDICTION:\s*([^\n]+)/i);
    const actionsMatch = response.match(/RECOMMENDED_ACTIONS:\s*([^\n]+)/i);

    const prediction = {
      id: crypto.randomUUID(),
      zone,
      risk_level: riskMatch?.[1]?.toLowerCase() || 'medium',
      prediction: predictionMatch?.[1] || 'Elevated risk detected based on recent incidents',
      recommended_actions: actionsMatch?.[1] || 'Review safety procedures; Conduct inspection; Brief workers',
      confidence: parseInt(confidenceMatch?.[1] || '70'),
      active: true,
    };

    await supabase.from('predictions').upsert(prediction, { onConflict: 'zone' });
    predictions.push(prediction);

    await supabase.from('ai_logs').insert([{
      id: crypto.randomUUID(),
      prompt,
      response,
      model: 'mastra-prediction-agent',
      incident_id: null,
    }]);
  }

  return NextResponse.json({ success: true, predictions });
}

export async function GET() {
  const { data } = await supabase
    .from('predictions')
    .select('*')
    .eq('active', true)
    .order('confidence', { ascending: false });

  return NextResponse.json({ predictions: data || [] });
}