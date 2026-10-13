# Milkmate

A browser-based dashboard for a small milk delivery business. Manage customers and their subscriptions, record daily deliveries, track monthly balances, record payments, and export billing as CSV. Data is saved in this browser's local storage. The app includes sample data on first launch; use **Reset demo data** in Settings to restore it.

## Run locally

Requires Node.js 20+ and npm.

```bash
npm ci
npm run dev
```

Open the local address printed by Vite (usually `http://localhost:5173`).

## Verify

```bash
npm test
npm run build
```

The static build is written to `dist/`. Run `npm run preview` to serve it locally. No database or API credentials are required. Browser data is local to each browser and is not shared across users or devices.
