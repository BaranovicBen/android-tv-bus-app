# IDSBK Kiosk – Starter

Two apps:
- `server/` – Node + Express (TypeScript) proxy and mock API
- `web/` – React + Vite (TypeScript) front-end

## Quick start
```bash
# 1) Use Node 22 LTS (or 20+)
nvm use || nvm install 22

# 2) Install deps
cd server && npm i && cd ..
cd web && npm i && cd ..

# 3) (optional) install root helper deps for one-command dev
npm i

# 4) Run both dev servers in parallel
npm run dev
# server -> http://localhost:8787
# web    -> http://localhost:5173
```

## Build for production
```
npm run build
```

## Deploy notes
- Keep the `server/` on a secure host (hides API key).
- Serve `web/` as static assets (WordPress: upload build folder or host under subpath/subdomain and embed via iframe or page template).
