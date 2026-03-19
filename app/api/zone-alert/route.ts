import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const { incident_id, title, severity, zone, reporter_email } = await request.json();

  if (!zone || zone === 'Unknown Zone') {
    return NextResponse.json({ message: 'No zone information available' });
  }

  const { data: zoneWorkers } = await supabase
    .from('worker_locations')
    .select('worker_email, worker_name')
    .eq('zone', zone)
    .eq('status', 'active')
    .neq('worker_email', reporter_email);

  if (!zoneWorkers || zoneWorkers.length === 0) {
    return NextResponse.json({ message: 'No other workers in this zone' });
  }

  await supabase.from('alerts').insert([{
    id: crypto.randomUUID(),
    title: `⚠️ Incident in your zone — ${zone}`,
    message: `${title} has been reported in ${zone}. Severity: ${severity.toUpperCase()}. Please be aware and take necessary precautions.`,
    severity: severity === 'critical' || severity === 'high' ? severity : 'high',
    sent_by: 'FieldMind Zone Alert System',
    active: true,
  }]);

  return NextResponse.json({
    success: true,
    notified: zoneWorkers.length,
    zone,
  });
}