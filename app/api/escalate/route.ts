import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: staleIncidents } = await supabase
    .from('incidents')
    .select('*')
    .eq('status', 'open')
    .eq('escalated', false)
    .neq('severity', 'critical')
    .lt('created_at', tenMinutesAgo);

  if (!staleIncidents || staleIncidents.length === 0) {
    return NextResponse.json({ message: 'No incidents to escalate' });
  }

  let escalated = 0;

  for (const incident of staleIncidents) {
    await supabase
      .from('incidents')
      .update({ severity: 'critical', escalated: true })
      .eq('id', incident.id);

    await supabase.from('alerts').insert([{
      id: crypto.randomUUID(),
      title: 'Incident Auto-Escalated',
      message: `"${incident.title}" has been open for over 10 minutes and escalated to CRITICAL`,
      severity: 'critical',
      sent_by: 'Mastra Auto-Escalation Agent',
      active: true,
    }]);

    await supabase.from('ai_logs').insert([{
      id: crypto.randomUUID(),
      prompt: `Auto-escalation check for incident: ${incident.title}`,
      response: `Incident escalated to critical after being open for more than 10 minutes`,
      model: 'mastra-escalation-agent',
      incident_id: incident.id,
    }]);

    escalated++;
  }

  return NextResponse.json({ success: true, escalated });
}