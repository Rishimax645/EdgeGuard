# Deploy EdgeGuard on your Cloudflare account

This GitHub branch is prepared for standalone Cloudflare Workers, not GitHub Pages or Vercel. The existing ChatGPT-hosted site is separate and unchanged.

## Import settings
- Repository: Rishimax645/EdgeGuard
- Production branch: main
- Worker name: edgeguard
- Root directory: /
- Build command: npm run build
- Deploy command: npm run deploy
- Node.js: 22.13 or newer

The Cloudflare Vite plugin emits the deployment config and assets. Wrangler uses its generated config automatically. wrangler.jsonc declares the DB binding with database_name edgeguard-db and lets Cloudflare provision the database. Keep that database and binding on redeploys. If Cloudflare asks to provision D1, select/create edgeguard-db and bind it as DB. Do not enable paid products for this demonstration.

## Required secrets after first deployment
Open Workers & Pages → edgeguard → Settings → Variables and Secrets.
Add these as **Secret**, not plain text:
- DASHBOARD_KEY: generate at least 32 cryptographically random characters using a password manager. This owner key controls the entire workspace. No default key exists; the API fails closed until it is configured.
- TELEGRAM_BOT_TOKEN: the bot token issued by BotFather.
- DEVICE_API_KEY: a different random key of at least 32 characters, only needed later for ESP32.

Save/deploy the secret changes. Never commit real keys or share them in screenshots.

## First use
1. Open the generated HTTPS workers.dev URL.
2. Enter DASHBOARD_KEY in the unlock form. It is kept in tab memory only, not cookies or localStorage; refresh or Lock clears it.
3. Open Settings → Database setup → Initialize database. This authenticated operation creates tables/indexes if missing without deleting records. It is idempotent and does not run on every request.
4. In Settings create the Telegram connection link, open Telegram, press Start, then Verify connection and Send test message.
5. Enable Telegram on new incidents only when you want messages. Test alerts are labelled TEST.

Use a dedicated Telegram bot without an existing webhook. Actual delivery requires your token and has not been verified by the source-code build.

## Authentication
The previous Sites identity-header trust is removed. Dashboard reads/writes use a high-entropy owner bearer key checked server-side. Device ingestion uses a distinct bearer key. No client-supplied identity header grants access. Missing/short keys fail closed. HTTPS is required. This is a single-owner demo, not a multi-user account system. Rotate keys in Cloudflare secrets if disclosed. The HTML application shell is public, but database access and changes require authentication.

## Local validation
npm ci
npm run typecheck
npm run build
npm run dev

For local use, put only test secrets in ignored .dev.vars. Initialize the local DB through Settings. Local and remote databases are separate.

## Limits and status
Camera preview is implemented. Automated helmet/glove detection needs a trained model. Hardware readings require assembled and calibrated sensors. This is an academic prototype, not a certified safety/compliance system.
Cloudflare deployment, account-specific D1 provisioning and real Telegram delivery must be verified after deployment. Free-plan resource usage must be monitored; high-frequency ingestion writes multiple records per sample.

## PPE beta v1.1
Local helmet/glove inference and warning recording are now integrated. See [PPE_MODEL.md](PPE_MODEL.md) for setup, model license, validation and limitations. Earlier camera-preview-only notes above describe the previous release. No hardware is needed for camera analysis.
