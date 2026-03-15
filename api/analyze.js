export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({error:'Method not allowed'}); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({error:'API key not configured'}); return; }

  try {
    const { name, level, desc, focus, levelLabel, dims, images } = req.body;
    const content = [];

    if (images && images.length > 0) {
      images.forEach(img => {
        content.push({ type:'image', source:{ type:'base64', media_type:img.mt, data:img.b64 }});
      });
    }

    const dimKeys = dims.map(d => d.key);

    content.push({ type:'text', text:`你是一位 AASI 3级认证单板滑雪教练。请分析以下学员信息${images&&images.length>0?'和截图':''}。

学员：${name}
水平：${levelLabel}
描述：${desc}
重点：${focus||'综合提升'}

只返回合法JSON，不含任何其他文字。注意：字符串内不能有换行符、双引号用单引号代替。

{"overall_score":7,"overall_comment":"一句话总结","dimensions":[${dimKeys.map(k=>`{"key":"${k}","score":7,"analysis":"2-3句分析","drill":"练习建议"}`).join(',')}]}`});

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:2000, messages:[{role:'user',content}] })
    });

    if (!response.ok) { const err=await response.json(); throw new Error(err.error?.message||'Claude API error '+response.status); }

    const data = await response.json();
    let raw = data.content.map(c=>c.text||'').join('');
    raw = raw.replace(/```json/g,'').replace(/```/g,'').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI返回格式错误，请重试');
    raw = jsonMatch[0];
    raw = raw.replace(/[\x00-\x1F\x7F]/g,' ');
    raw = raw.replace(/"([^"]*?)"/g,(_,p1)=>'"'+p1.replace(/\n/g,' ').replace(/\r/g,' ')+'"');

    const parsed = JSON.parse(raw);
    res.status(200).json(parsed);

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
