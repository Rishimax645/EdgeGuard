# EdgeGuard — Industrial Safety Monitoring

Academic demonstration: Edge-Intelligent Industrial IoT for Occupational-Safety Monitoring and Automated Compliance Reporting.

Live website: https://edgeguard-safety-lab.yaa007.chatgpt.site

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
React, TypeScript and Vinext; Cloudflare Worker backend, D1 storage, Drizzle migrations.
This repository contains the deployed Sites application's source, including its hosting manifest and build support.
GitHub stores source. GitHub Pages cannot execute the backend or store Telegram secrets.
This is not a drop-in Vercel deployment: its Cloudflare storage and trusted Sites authentication must be adapted before migration.
Pushing here does not automatically update the current hosted Site.

## Local development
Use Node.js >=22.13.0.

```sh
npm ci
npm run build
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_striped_viper.sql
npm run dev
```

Use the URL printed by the dev server. The portable development integration provides mock sign-in for local work. Do not deploy mock authentication.
The production backend trusts the authenticated identity inserted by the Sites gateway. Another hosting platform must supply verified authentication; accepting client-supplied identity headers on an exposed origin is unsafe.
For a built local preview use `npm start`; that does not simulate production sign-in.
Build validation: `npx tsc --noEmit` and `npm run build`.

## Telegram setup
1. Create a dedicated bot with @BotFather.
2. Configure TELEGRAM_BOT_TOKEN as a secret in the hosting platform; never commit it or paste it into client code.
3. Open Settings, create the connection link, open it in Telegram and press Start.
4. Verify the connection, then send a test message.
5. Enable Telegram alerts in the demonstration rules if wanted.

The dedicated bot must have no existing webhook. Linking polls Telegram updates using a short-lived one-time code.
Notifications record Telegram API acceptance, not delivery/read receipts. Automatic retry queues are not implemented.

## Future ESP32 connection
Configure DEVICE_API_KEY securely on the server. Send HTTPS POST /api/readings with Authorization: Bearer <device-key>.
The private Sites gateway also requires its supported service authentication; the device key alone does not bypass Site access.
Payload:
```json
{"device_id":"edgeguard-01","boot_id":"boot-001","sequence":1,"temperature_c":32.4,"pressure_hpa":1012.6,"mq135_adc_mv":710,"mq2_adc_mv":650}
```
Use a new boot_id after restart and increasing sequence numbers. Sensor fields can be null for missing/faulty readings.
Confirm sensor selection, voltage conditioning, calibration and safe demo thresholds before hardware use.
Live thresholds use a five-second confirmation and five-percent reset margin. Hardware end-to-end validation remains pending.

## Source layout
- app/page.tsx and app/globals.css: dashboard.
- app/api/[...path]/route.ts: storage, alerts, Telegram and ingestion.
- db/ and drizzle/: database schema and migrations.
- worker/, scripts/, vite.config.ts: runtime/build support.
- .openai/hosting.json: existing Site deployment identity, not a credential.

Secrets, node_modules, generated builds, database state and runtime caches are excluded by .gitignore.
