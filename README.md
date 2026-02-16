# Truckee Traffic Cams

Multi-camera dashboard for Tahoe/Truckee traffic, resort, and local weather/scenic cams.

## Features
- Stream tiles with per-camera start/stop, status badges, and mute toggles.
- Map view with Leaflet markers and lightbox playback.
- Monitor wall that streams all working cameras with fullscreen support.
- Multi-provider feed support: `hls`, `iframe`, and `snapshot`.
- Area filters (`All`, `Truckee`, `South Lake`) and status-priority sorting.

## Stack
- Vite + React + TypeScript
- Tailwind CSS v4
- `hls.js` for browser HLS playback (native HLS on Safari)
- Leaflet + React-Leaflet for map rendering

## Local development

```bash
npm install
npm run dev
```

Local app URL: `http://localhost:5173`

## Scripts
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run preview`

## Data source and maintenance

Camera metadata is in `src/data/cameras.ts`.
Shared camera model types are in `src/data/cameraModel.ts`.
Catalog helper/selectors are in `src/data/cameraCatalog.ts`.

- `feed` describes how each camera is rendered. `hls` uses `playlistUrl` and `posterUrl`. `iframe` uses `embedUrl` with optional `posterUrl`. `snapshot` uses `imageUrl` and `refreshSeconds`.
- `source` tracks the origin of the feed: `provider`, `pageUrl`, `extractor`, optional `notes`
- `health`: last known check state
- `coordinates`: map location and whether it is estimated
- `category` and `priority`: classification for sorting/grouping

Current catalog includes:
- Traffic corridor cameras (I-80, Hwy 89, Hwy 267)
- Resort cameras (Palisades, Sugar Bowl, Northstar, Tahoe Donner)
- Local scenic/utility cameras (Truckee airport, Donner Lake Village, Downtown Truckee)
- Community cameras from TahoeWeatherCam-origin Brownrice feeds

When you re-check streams, update `health` in `src/data/cameras.ts` and the footer date in `src/App.tsx`.

## Vercel deployment

### Option A: CLI

```bash
vercel
```

### Option B: GitHub integration

1. Import your GitHub repo in Vercel.
2. Framework preset: `Vite`.
3. Build command: `npm run build`.
4. Output directory: `dist`.

`vercel.json` is already included with these defaults.
