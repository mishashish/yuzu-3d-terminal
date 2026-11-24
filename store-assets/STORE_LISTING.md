# Chrome Web Store Submission Kit — $YUZU Crypto Companion

## 1. Upload Package
Upload this ZIP file directly in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole):
- **File:** `public/yuzu-chrome-extension.zip` (note: Chrome Web Store expects `manifest.json` at the root of the ZIP — use the script below or zip the contents of `extension/` directly, see `store-assets/yuzu-cws-upload.zip`!).

## 2. Store Listing Fields
- **Extension Name:** `$YUZU Crypto Companion — Live Pump & Dump Radar`
- **Short Summary (max 132 chars):**
  `Live 3D Yuzu crypto companion in Chrome: 24h pump & dump radar for SOL, BTC, ETH, WIF, BONK, PEPE, JUP with voice briefs & alerts.`
- **Category:** `Productivity` (or `Shopping` / `News & Weather`)
- **Language:** `English`
- **Homepage URL:** `https://yuzuha-simulator.vercel.app`
- **Privacy Policy URL:** `https://yuzuha-simulator.vercel.app/privacy.html`

## 3. Detailed Description
```text
Meet Yuzu — your living 3D Cyber Y2K crypto companion right inside Google Chrome.

KEY FEATURES:
- Live Mini 3D Companion: Watch Yuzu react to market pumps and dumps with real-time 3D animations and lip-sync inside the extension popup.
- 24h Pump & Dump Radar: Instant live prices and 24-hour % changes for SOL, BTC, ETH, WIF, BONK, PEPE, and JUP via a resilient 3-tier public feed (OKX, Binance, CoinGecko).
- Voice Market Briefs: Click VOICE BRIEF and Yuzu reads out the day's top gainer, top loser, and SOL price out loud.
- Draggable Floating Widget: Keep a sleek live SOL & top-mover pill on any webpage — drag it anywhere, click to expand all 7 coins, or toggle it off anytime.
- Big Mover Alerts: Optional desktop notifications when any tracked coin moves +/-5% or more (with a 30-minute anti-spam cooldown).
- Toolbar Badge: Live SOL 24h % badge right on your Chrome toolbar icon.
- 1-Click TradingView Charts: Click any coin row to jump straight to its live TradingView chart.

100% private: zero tracking, zero ads, zero wallet keys collected.
```

## 4. Privacy Practices Tab (Copy-Paste for Google Review)
- **Single Purpose Description:**
  `Displays live 24-hour cryptocurrency prices, market movement notifications, and an interactive 3D companion voice brief for tracked Solana and major crypto assets.`
- **Permission Justifications:**
  - `storage`: Stores user preferences (floating widget toggle, alert toggle) and caches the latest public crypto ticker data locally for instant popup rendering.
  - `alarms`: Polls public cryptocurrency ticker endpoints every 2 minutes to keep the toolbar badge and price cache up to date.
  - `notifications`: Displays optional desktop alerts when a tracked cryptocurrency moves by 5% or more over 24 hours.
  - `host_permissions (okx.com, api.binance.com, api.coingecko.com)`: Fetches public, unauthenticated 24h cryptocurrency market ticker data with automatic fallback across exchanges.
- **Data Usage Certification:** Check **"I do not collect or use user data"**.

## 5. Graphic Assets Included in `store-assets/`
- `yuzu-cws-upload.zip` — Root-level manifest ZIP ready for Chrome Web Store upload.
- `screenshot-1280x800.png` — Store screenshot (`1280×800`).
- `promo-small-440x280.png` — Small promo tile (`440×280`).
- `promo-marquee-1400x560.png` — Marquee promo tile (`1400×560`).
