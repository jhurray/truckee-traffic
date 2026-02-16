# Truckee Traffic Cams

Multi-camera dashboard for Tahoe/Truckee traffic and weather cams, using the public HLS streams exposed through Brownrice player embeds.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- `hls.js` for browser HLS playback

## Local development

```bash
npm install
npm run dev
```

Local app URL: `http://localhost:5173`

## Build and quality checks

```bash
npm run lint
npm run build
```

## Data source

Camera metadata is in `src/data/cameras.ts`.

- `streamUrl`: direct HLS manifest (`.m3u8`)
- `posterUrl`: snapshot thumbnail
- `sourcePage`: original TahoeWeatherCam page
- `health`: last known check state

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
