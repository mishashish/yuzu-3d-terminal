export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const seed = body.seed || Math.floor(Math.random() * 100000);

    const providers = [
      {
        name: 'pollinations',
        url: 'https://text.pollinations.ai/openai',
        payload: { model: 'openai', seed, messages, temperature: 0.85, max_tokens: 750 },
      },
      {
        name: 'airforce-llama',
        url: 'https://api.airforce/v1/chat/completions',
        payload: { model: 'llama-instant', messages, temperature: 0.85, max_tokens: 350 },
      },
      {
        name: 'airforce-ministral',
        url: 'https://api.airforce/v1/chat/completions',
        payload: { model: 'ministral-14b-latest', messages, temperature: 0.85, max_tokens: 350 },
      },
    ];

    for (const prov of providers) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 14000);
        const r = await fetch(prov.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify(prov.payload),
        });
        clearTimeout(timer);
        if (r.ok) {
          const j = await r.json();
          const content = j?.choices?.[0]?.message?.content;
          if (content && content.trim().length > 0) {
            res.status(200).json({ content: content.trim(), provider: prov.name });
            return;
          }
        }
      } catch {}
    }

    res.status(503).json({ error: 'All free LLM providers temporarily rate-limited' });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}
