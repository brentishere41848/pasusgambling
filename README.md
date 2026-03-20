<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

# Deploy to Wasmer

This repo now deploys to Wasmer from the project root. Do not deploy from `wasmer-api/`.

1. Build the frontend:
   `npm run build`
2. Log in to Wasmer if needed:
   `wasmer login`
3. Deploy from the repo root:
   `wasmer deploy`

Local Wasmer test:
`wasmer run . -- --port 9000`

The Wasmer package uses:
- `dist/` as the mounted static site directory
- `settings/config.toml` for the static web server config
- SPA fallback to `index.html` so client routes can refresh
