// ============================================================
//  EDIT THIS FILE TO CONFIGURE YOUR SOLANA TOKEN
//  Buy links, live price, DexScreener chart, and wallet balance
//  all update automatically from here.
// ============================================================

export const TOKEN = {
  name: 'YUZU',
  ticker: 'YUZU',
  tagline: 'The cutest girl on Solana.',

  // Paste your Solana token mint address (CA) after launch.
  contractAddress: '',

  totalSupply: 1_000_000_000,
  buyTax: 0,
  sellTax: 0,

  links: {
    twitter: 'https://x.com/girl_yuzu_',
    telegram: 'https://t.me/',
  },

  rpc: 'https://api.mainnet-beta.solana.com',

  tokenomics: [
    { label: 'Liquidity pool (burned)', pct: 85, color: '#FF8BCB' },
    { label: 'Community & airdrops', pct: 10, color: '#A66BFF' },
    { label: 'CEX & marketing', pct: 5, color: '#72E7FF' },
  ],

  // Dark goth/streetwear VRoid model (Darkness_Shibu)
  modelUrl: '/models/darkness_shibu.vrm',
};
