export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({error:'Method not allowed'}); return; }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) { res.status(500).json({error:'Supabase not configured'}); return; }

  try {
    const { rider_name, rider_level, rider_focus, overall_score, overall_comment, dimensions, coach_notes } = req.body;

    const response = await fetch(`${supabaseUrl}/rest/v1/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ rider_name, rider_level, rider_focus, overall_score, overall_comment, dimensions, coach_notes, status:'done' })
    });

    if (!response.ok) { const err=await response.json(); throw new Error(JSON.stringify(err)); }
    const data = await response.json();
    res.status(200).json({ id: data[0].id });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
