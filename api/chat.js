export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const seed = body.seed || Math.floor(Math.random() * 100000);

    const providers = [];

    // Optional ultra-fast dedicated keys if configured in Vercel env
    if (process.env.GROQ_API_KEY) {
      providers.push({
        name: 'groq',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        payload: { model: 'llama-3.3-70b-versatile', messages, temperature: 0.9, max_tokens: 260 },
      });
    }
    if (process.env.OPENAI_API_KEY) {
      providers.push({
        name: 'openai',
        url: 'https://api.openai.com/v1/chat/completions',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        payload: { model: 'gpt-4o-mini', messages, temperature: 0.9, max_tokens: 260 },
      });
    }

    // Free zero-key cascade (fast creative models first)
    providers.push(
      {
        name: 'pollinations-openai',
        url: 'https://text.pollinations.ai/openai',
        payload: { model: 'openai', seed, messages, temperature: 0.92, max_tokens: 320 },
      },
      {
        name: 'pollinations-mistral',
        url: 'https://text.pollinations.ai/openai',
        payload: { model: 'mistral', seed, messages, temperature: 0.92, max_tokens: 280 },
      },
      {
        name: 'airforce-llama',
        url: 'https://api.airforce/v1/chat/completions',
        payload: { model: 'llama-instant', messages, temperature: 0.9, max_tokens: 280 },
      }
    );

    for (const prov of providers) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 12000);
        const r = await fetch(prov.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(prov.headers || {}) },
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
