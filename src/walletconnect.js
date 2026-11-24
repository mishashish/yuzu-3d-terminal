/**
 * Reown AppKit (WalletConnect v2) integration for $YUZU:
 * Supports WalletConnect QR Code, MetaMask, Phantom, Solflare, Coinbase, Trust, Binance, SafePal & 160+ wallets.
 */

const PROJECT_ID = '60ef4162bcef461906bf22792e431c25';

let modal = null;
let modalPromise = null;
const listeners = new Set();

function emitState(state) {
  for (const fn of listeners) {
    try { fn(state); } catch {}
  }
}

async function getModal() {
  if (!modalPromise) {
    modalPromise = Promise.all([
      import('@reown/appkit'),
      import('@reown/appkit-adapter-ethers'),
      import('@reown/appkit-adapter-solana'),
      import('@reown/appkit/networks'),
    ])
      .then(([appkit, ethersAdapter, solanaAdapter, networks]) => {
        const adapters = [
          new ethersAdapter.EthersAdapter(),
          new solanaAdapter.SolanaAdapter(),
        ];
        modal = appkit.createAppKit({
          adapters,
          networks: [networks.solana, networks.mainnet],
          defaultNetwork: networks.solana,
          projectId: PROJECT_ID,
          metadata: {
            name: '$YUZU Terminal',
            description: 'Interactive 3D Cyber Y2K AI Companion on Solana',
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.png`],
          },
          features: { analytics: false, email: false, socials: [] },
          themeMode: 'dark',
          themeVariables: {
            '--w3m-accent': '#ff8bcb',
            '--w3m-border-radius-master': '3px',
          },
        });

        const syncState = () => {
          const isConnected = !!modal.getIsConnectedState();
          const solAddr = modal.getAddress?.('solana') || null;
          const evmAddr = modal.getAddress?.('eip155') || null;
          const address = solAddr || evmAddr || null;
          const namespace = solAddr ? 'solana' : evmAddr ? 'eip155' : null;
          const provider = isConnected ? modal.getWalletProvider?.() : null;
          emitState({ isConnected: isConnected && !!address, address, namespace, provider });
        };

        return modal.ready().then(() => {
          modal.subscribeAccount?.(syncState, 'solana');
          modal.subscribeAccount?.(syncState, 'eip155');
          modal.subscribeNetwork?.(syncState);
          modal.subscribeProviders?.(syncState);
          syncState();
          return modal;
        });
      })
      .catch((err) => {
        modalPromise = null;
        throw err;
      });
  }
  return modalPromise;
}

export const yuzuWallet = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async open() {
    const app = await getModal();
    await app.open({
      view: app.getIsConnectedState() ? 'Account' : 'Connect',
    });
  },
  async restore() {
    try { await getModal(); } catch {}
  },
  async disconnect() {
    if (!modal) return;
    try { await modal.disconnect(); } catch {}
  },
};
