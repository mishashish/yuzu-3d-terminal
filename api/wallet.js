const SOLANA_RPCS = [
  process.env.VITE_SOLANA_RPC,
  'https://api.mainnet-beta.solana.com',
  'https://solana-rpc.publicnode.com',
].filter(Boolean);

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

async function rpcCall(url, method, params, timeoutMs = 5500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'YuzuTerminal/2.6' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.result ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const address = String(req.query?.address || '').trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return res.status(400).json({ ok: false, error: 'Invalid Solana wallet address.' });
  }

  try {
    let solLamports = null;
    for (const rpc of SOLANA_RPCS) {
      const bal = await rpcCall(rpc, 'getBalance', [address]);
      if (bal && typeof bal.value === 'number') {
        solLamports = bal.value;
        break;
      }
    }

    let rawAccounts = [];
    for (const rpc of SOLANA_RPCS) {
      const [spl, spl22] = await Promise.all([
        rpcCall(rpc, 'getTokenAccountsByOwner', [address, { programId: TOKEN_PROGRAM }, { encoding: 'jsonParsed' }]),
        rpcCall(rpc, 'getTokenAccountsByOwner', [address, { programId: TOKEN_2022_PROGRAM }, { encoding: 'jsonParsed' }]),
      ]);
      if (Array.isArray(spl?.value) || Array.isArray(spl22?.value)) {
        rawAccounts = [...(spl?.value || []), ...(spl22?.value || [])];
        break;
      }
    }

    const byMint = new Map();
    for (const acc of rawAccounts) {
      const info = acc?.account?.data?.parsed?.info;
      const mint = info?.mint;
      const uiAmount = Number(info?.tokenAmount?.uiAmount || 0);
      const decimals = Number(info?.tokenAmount?.decimals || 0);
      if (!mint || !(uiAmount > 0) || decimals === 0) continue; // skip NFTs (decimals=0) and empty accounts
      byMint.set(mint, (byMint.get(mint) || 0) + uiAmount);
    }

    const tokens = [...byMint.entries()]
      .map(([mint, amount]) => ({ mint, amount }))
      .slice(0, 30);

    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=45');
    return res.status(200).json({
      ok: true,
      address,
      sol: solLamports != null ? solLamports / 1e9 : 0,
      tokens,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || 'Wallet RPC error') });
  }
}
