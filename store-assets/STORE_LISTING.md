# Chrome Web Store Submission Kit — $YUZU Companion v2.2

## 1. Upload Package
Upload this ZIP file directly in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole):
- **File:** `store-assets/yuzu-cws-upload.zip` (`manifest.json` at the root of the ZIP).
- **Direct Site Download Bundle:** `public/yuzu-chrome-extension.zip` (wrapped inside `yuzu-extension/` folder for easy unpacked install).

## 2. Store Listing Fields
- **Extension Name:** `$YUZU Companion — Crypto Analytics, Token Scanner & Focus Hub`
- **Short Summary (max 132 chars):**
  `3D Yuzu in Popup & Side Panel: Solana TPS & macro radar, CA RugCheck scanner, watchlist, screen-time analytics, Pomodoro & AI.`
- **Category:** `Productivity`
- **Language:** `English`
- **Homepage URL:** `https://yuzuha-simulator.vercel.app`
- **Privacy Policy URL:** `https://yuzuha-simulator.vercel.app/privacy.html`

## 3. Detailed Description
```text
Meet Yuzu v2.2 — your living 3D Cyber Y2K companion in Chrome Popup & Side Panel for crypto macro analytics, on-chain token audits, daily focus, and AI assistance.

KEY CAPABILITIES:
1. SIDE PANEL + POPUP + FLOATING WIDGET:
   - Click "SIDE ◫" to dock 3D Yuzu permanently alongside X/Twitter, DexScreener, or your workspace.
   - Right-click any highlighted ticker, CA, or tweet -> "Scan with $YUZU" or "Ask Yuzu AI".

2. PULSE (Macro, Solana TPS, Portfolio & Custom Watchlist):
   - Live Crypto Fear & Greed Index with 7-day sparkline, Solana Mainnet real-time TPS, market breadth, and 24h USD volume.
   - Local "My Bags" portfolio estimator (100% private, zero wallet connection required).
   - Pin any on-chain DEX token to your live watchlist and set custom >= / <= $ Price Target Alerts.

3. SCAN CA (On-Chain Token Scanner & Auto-Detector):
   - Auto-detects Solana contract addresses (CAs) and $TICKERS on X/Twitter and web pages.
   - 1-click DexScreener + RugCheck v1 audit: Price, MCap, Liquidity, 24h Vol, Vol/MCap ratio, Buy vs Sell pressure bar, 5m/1h/6h/24h momentum, LP lock %, and risk flags.

4. FOCUS (Private Browser Screen-Time Analytics & Pomodoro):
   - 100% local daily screen-time breakdown across Work/Dev, Crypto/Charts, Social/CT, and Media + Top 5 domains.
   - Background Pomodoro Focus & Break timer (25m / 45m / 5m) with toolbar badge countdown and session streaks.

5. AI & TOOLS (Multi-Language Copilot, PnL Sizer & Scratchpad):
   - 1-click Summarize Active Tab, Draft X Reply, Macro Take, and Roast My Day (replies in EN/RU/UA matching your prompt).
   - Instant SOL <-> USD converter, Position ROI/PnL sizer, and auto-saved Quick Alpha Scratchpad.

100% private: zero tracking, zero ads, zero wallet keys collected.
```

## 4. Privacy Practices Tab (Copy-Paste for Google Review)
- **Single Purpose Description:**
  `Provides a popup and side-panel 3D companion combining cryptocurrency market & token analytics, local focus/screen-time tracking, and active-tab AI summarization.`
- **Permission Justifications:**
  - `storage`: Stores user preferences, pinned watchlist, price alerts, local portfolio counts, scratchpad notes, Pomodoro state, and local daily domain screen-time counters.
  - `alarms`: Polls public market ticker endpoints and triggers user-started Pomodoro focus timer completions.
  - `notifications`: Displays optional desktop alerts for price targets, big market moves, and completed Pomodoro focus sessions.
  - `activeTab`: Reads visible text or contract addresses on the current tab only when invoked by the user to summarize a page or scan a detected token CA.
  - `sidePanel`: Allows docking the companion UI in Chrome's native Side Panel when clicked by the user.
  - `contextMenus`: Adds right-click shortcuts on highlighted text to scan a token ticker/CA or explain selected text in the companion.
  - `host_permissions (okx.com, api.binance.com, api.coingecko.com, api.dexscreener.com, api.rugcheck.xyz, api.alternative.me, solana-rpc.publicnode.com, yuzuha-simulator.vercel.app)`: Fetches public market/token/Solana RPC analytics and renders the 3D Yuzu companion & AI chat endpoint.
- **Data Usage Certification:** Check **"I do not collect or use user data"**.
