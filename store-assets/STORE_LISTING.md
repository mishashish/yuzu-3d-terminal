# Chrome Web Store Submission Kit — $YUZU Terminal v2.4

## 1. Upload Package
- **Chrome Web Store ZIP:** `store-assets/yuzu-cws-upload.zip` (`manifest.json` at archive root).
- **Website Unpacked ZIP:** `public/yuzu-chrome-extension.zip` (wrapped inside `yuzu-extension/`).

## 2. Store Listing Fields
- **Extension Name:** `$YUZU — Market Terminal, Token Scanner & Activity Tracker`
- **Short Summary (max 132 chars):**
  `3D Yuzu terminal in Popup & Side Panel: market breadth, Solana TPS, DEX & RugCheck token scanner, activity tracker & trading tools.`
- **Category:** `Productivity`
- **Language:** `English`
- **Homepage URL:** `https://yuzuha-simulator.vercel.app`
- **Privacy Policy URL:** `https://yuzuha-simulator.vercel.app/privacy.html`

## 3. Detailed Description
```text
$YUZU Terminal v2.4 is a clean obsidian browser terminal for market telemetry, on-chain token audits, local screen-time tracking, and trading utilities.

MODULES:
1. MARKET:
   - Crypto Fear & Greed Index with 7-day sparkline, 24h market breadth, and live Solana mainnet TPS.
   - Spot price table with 24h range bars and USD volumes for SOL, BTC, ETH, WIF, BONK, PEPE, and JUP.
   - Local portfolio estimator, pinned on-chain watchlist, and custom price target notifications.

2. SCANNER:
   - Automatic detection of Solana contract addresses and tickers on active web pages.
   - Instant DexScreener + RugCheck v1 audit: price, market cap, liquidity, 24h volume, buy/sell order flow, 5m/1h/6h/24h momentum, LP lock percentage, and contract risk flags.

3. ACTIVITY:
   - Strictly local screen-time breakdown across Development, Markets, Social, and Media, plus top visited domains.
   - Background focus & break timer (25m / 45m / 5m) with toolbar countdown badge.

4. TOOLS:
   - Instant SOL/USD converter, position Risk/Reward (R:R) & PnL calculator, and auto-saved local scratchpad.
   - Live AI chat with Yuzu is available directly on the web terminal.

Privacy: All browsing timers, notes, and portfolio quantities remain strictly in local browser storage.
```

## 4. Privacy Practices Tab
- **Single Purpose Description:**
  `Provides a popup and side-panel terminal combining cryptocurrency market & token analytics, local focus/screen-time tracking, and position sizing utilities.`
- **Permission Justifications:**
  - `storage`: Stores local user preferences, watchlist, price alerts, portfolio quantities, notes, focus state, and daily domain counters.
  - `alarms`: Polls public market ticker endpoints and triggers user-started focus timer completions.
  - `notifications`: Displays optional desktop alerts for price targets, large market moves, and completed focus sessions.
  - `activeTab`: Reads contract addresses on the current tab when invoked by the user to scan a token.
  - `sidePanel`: Allows docking the terminal in Chrome's native Side Panel.
  - `contextMenus`: Adds a right-click shortcut on selected text to scan a token ticker or contract address.
  - `host_permissions (okx.com, api.binance.com, api.coingecko.com, api.dexscreener.com, api.rugcheck.xyz, api.alternative.me, solana-rpc.publicnode.com, yuzuha-simulator.vercel.app)`: Fetches public market/token/RPC data and renders the 3D companion stage.
- **Data Usage Certification:** Check **"I do not collect or use user data"**.
