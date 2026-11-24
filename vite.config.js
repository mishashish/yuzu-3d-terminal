import { defineConfig } from 'vite';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const EDGE_TTS_PY =
  'C:\\Users\\yoiso\\.gemini\\antigravity\\brain\\5c992820-6917-4652-bfca-2a1a4ca5230b\\scratch\\.venv\\Scripts\\python.exe';

function yuzuBackendPlugin() {
  return {
    name: 'yuzu-backend-middleware',
    configureServer(server) {
      // 1. Natural Neural Voice TTS (/api/tts -> ru-RU-SvetlanaNeural / en-US-AriaNeural)
      server.middlewares.use('/api/tts', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost');
          const text = (url.searchParams.get('text') || '').trim().slice(0, 420);
          if (!text) {
            res.statusCode = 400;
            res.end('Missing text');
            return;
          }
          const isRu = /[а-яё]/i.test(text);
          const voice = isRu ? 'ru-RU-SvetlanaNeural' : 'en-US-AriaNeural';
          const tmpFile = path.join(os.tmpdir(), `yuzu_tts_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);

          const pyCode = [
            'import asyncio, sys, edge_tts',
            'async def main():',
            '    c = edge_tts.Communicate(sys.argv[1], sys.argv[2], rate="+6%", pitch="+4Hz")',
            '    await c.save(sys.argv[3])',
            'asyncio.run(main())',
          ].join('\n');

          await new Promise((resolve, reject) => {
            const p = spawn(EDGE_TTS_PY, ['-c', pyCode, text, voice, tmpFile], { windowsHide: true });
            p.on('error', reject);
            p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`edge-tts exit ${code}`))));
          });

          const buf = fs.readFileSync(tmpFile);
          fs.unlink(tmpFile, () => {});
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'no-store');
          res.end(buf);
        } catch (err) {
          res.statusCode = 500;
          res.end(String(err?.message || err));
        }
      });

      // 2. Multi-provider Live AI Chat (/api/chat) — cascades across free providers so chat stays alive!
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        try {
          const chunks = [];
          for await (const ch of req) chunks.push(ch);
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          const messages = Array.isArray(body.messages) ? body.messages : [];
          const seed = body.seed || Math.floor(Math.random() * 100000);

          const providers = [
            {
              name: 'pollinations',
              url: 'https://text.pollinations.ai/openai',
              headers: { 'Content-Type': 'application/json' },
              payload: { model: 'openai', seed, messages, temperature: 0.85, max_tokens: 750 },
            },
            {
              name: 'airforce-llama',
              url: 'https://api.airforce/v1/chat/completions',
              headers: { 'Content-Type': 'application/json' },
              payload: { model: 'llama-instant', messages, temperature: 0.85, max_tokens: 350 },
            },
            {
              name: 'airforce-ministral',
              url: 'https://api.airforce/v1/chat/completions',
              headers: { 'Content-Type': 'application/json' },
              payload: { model: 'ministral-14b-latest', messages, temperature: 0.85, max_tokens: 350 },
            },
          ];

          for (const prov of providers) {
            try {
              const ctrl = new AbortController();
              const timer = setTimeout(() => ctrl.abort(), 16000);
              const r = await fetch(prov.url, {
                method: 'POST',
                headers: prov.headers,
                signal: ctrl.signal,
                body: JSON.stringify(prov.payload),
              });
              clearTimeout(timer);
              if (r.ok) {
                const j = await r.json();
                const content = j?.choices?.[0]?.message?.content;
                if (content && content.trim().length > 0) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ content: content.trim(), provider: prov.name }));
                  return;
                }
              }
            } catch {}
          }

          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'All free LLM providers temporarily rate-limited' }));
        } catch (err) {
          res.statusCode = 500;
          res.end(String(err?.message || err));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [yuzuBackendPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three', '@pixiv/three-vrm'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/ai': {
        target: 'https://text.pollinations.ai',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/ai/, ''),
      },
      '/api/crypto': {
        target: 'https://api.binance.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/crypto/, '/api/v3/ticker/24hr'),
      },
    },
  },
});
