
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
 
    const dimList = dims.map(d => `- ${d.zh}（${d.en}）`).join('\n');
 
    const content = [];
 
    if (images && images.length > 0) {
      images.forEach(img => {
        content.push({ type:'image', source:{ type:'base64', media_type:img.mt, data:img.b64 }});
      });
    }
 
    content.push({ type:'text', text:`你是一位 AASI（美国单板滑雪教练协会）3级认证教练。请根据以下学员信息${images&&images.length>0?'和上传的视频截图':''}，按指定维度进行专业分析。
 
学员姓名：${name}
水平：${levelLabel}
视频描述：${desc}
改进重点：${focus||'综合提升'}
 
请严格按以下${dims.length}个维度分析，只返回纯JSON，不要有任何其他文字或markdown：
 
{
  "overall_score": <1-10的数字>,
  "overall_comment": "<一句话中文总结>",
  "dimensions": [
${dims.map(d=>`    {"key":"${d.key}","score":<1-10>,"analysis":"<2-3句中文分析，结合学员描述指出具体问题>","drill":"<1-2句具体可操作的练习建议>"}`).join(',\n')}
  ]
}`});
 
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{ role:'user', content }]
      })
    });
 
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Claude API error ' + response.status);
    }
 
    const data = await response.json();
    const raw = data.content.map(c => c.text||'').join('');
    const clean = raw.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(clean);
 
    res.status(200).json(parsed);
 
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
 
