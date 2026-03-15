export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') { res.status(405).json({error:'Method not allowed'}); return; }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) { res.status(500).json({error:'Supabase not configured'}); return; }

  const { id } = req.query;
  if (!id) { res.status(400).json({error:'Missing report id'}); return; }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${id}&select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });

    if (!response.ok) throw new Error('Failed to fetch report');
    const data = await response.json();
    if (!data || data.length === 0) { res.status(404).json({error:'Report not found'}); return; }
    res.status(200).json(data[0]);

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
