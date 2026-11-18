# EdgeGuard — Cloudflare deployment

See [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) for the current deployment and secret setup instructions.

## Features
- Responsive dashboard with overview, monitoring, incidents, history, reports, devices and settings.
- Browser webcam preview, device selection and fullscreen. Frames are not uploaded or recorded.
- Simulated readings for MAX31855 temperature, BMP280 atmospheric pressure, MQ135 and MQ2 relative signals.
- Incident acknowledgement, demo resolution, CSV/JSON exports and printable reports.
- Server-side Telegram account linking and test/incident messages.
- Authenticated ESP32 ingestion endpoint prepared for later hardware integration.

## Current limitations
Camera preview is implemented; automatic helmet/cap and glove inference is NOT installed. A trained model and validation are still required.
Telegram requires a dedicated bot token and recipient linking; delivery has not been tested with the owner's credentials.
Sensor values are demonstration data until real hardware is connected. MQ signals are not calibrated gas concentrations. BMP280 measures atmospheric pressure, not pipe pressure.
This prototype is not a certified safety system or a compliance certification tool.

## Stack and hosting
React, TypeScript and Vinext with Cloudflare Workers and D1. The standalone configuration is in wrangler.jsonc. See CLOUDFLARE_SETUP.md for build settings, authentication, initialization, Telegram and local development.

GitHub stores this source; Cloudflare hosts the application. The previous ChatGPT-hosted website remains separate. Deployment is not confirmed by a source upload.

## Source layout
- app/page.tsx and app/globals.css: dashboard.
- app/api/[...path]/route.ts: storage, alerts, Telegram and ingestion.
- db/ and drizzle/: database schema and migrations.
- worker/, scripts/, vite.config.ts: runtime/build support.
- .openai/hosting.json: existing Site deployment identity, not a credential.

Secrets, node_modules, generated builds, database state and runtime caches are excluded by .gitignore.
