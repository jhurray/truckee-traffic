# Agent Notes for truckee-traffic

## Purpose
Truckee Traffic Cams is a Vite + React dashboard that streams public HLS traffic/weather cameras for the Tahoe/Truckee area. It provides three views: stream tiles, a Leaflet map, and a multi-stream monitor wall.

## Local commands
- `npm install`
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run preview`

## Key files
- `src/App.tsx` (view mode switching, filters, stream controller state, footer metadata)
- `src/components/CameraTile.tsx` (per-camera playback via native HLS or `hls.js`)
- `src/components/CameraMap.tsx` (Leaflet map markers + lightbox launch)
- `src/components/MonitorWall.tsx` (multi-stream wall + fullscreen)
- `src/components/CameraLightbox.tsx` (focused stream player)
- `src/data/cameraModel.ts` (canonical camera and feed type definitions)
- `src/data/cameras.ts` (camera catalog data)
- `src/data/cameraCatalog.ts` (selectors and sorting/filter helpers)
- `src/index.css` (global fonts + Tailwind entry + Leaflet font overrides)

## Data maintenance
- Camera metadata lives in `src/data/cameras.ts`.
- Canonical types for camera/feed/source are in `src/data/cameraModel.ts`.
- Shared filtering/sorting helpers are in `src/data/cameraCatalog.ts`.
- Keep `id` values stable so stream state maps do not break.
- Update `health` when a stream is rechecked, and update the footer date in `src/App.tsx` to the actual verification date.
- If coordinates change, update `coordinates` and `estimated` accordingly; the map uses these values directly.
- `feed` defines how to render video. `hls` uses `playlistUrl` and `posterUrl`. `iframe` uses `embedUrl` with optional `posterUrl`. `snapshot` uses `imageUrl` and `refreshSeconds`.
- `source` tracks where the feed comes from: `provider`, `pageUrl`, `extractor`, optional `notes`.
- `category` and `priority` drive grouping and future sorting rules.

## Streaming behavior
- Playback uses native HLS on Safari and dynamically imports `hls.js` otherwise.
- Always destroy `hls.js` instances on cleanup to avoid leaks.
- Runtime status is tracked via `StreamRuntimeStatus` in `src/types/stream.ts` and should be kept in sync with playback events.
- Current UI components assume HLS feeds; adding `iframe` or `snapshot` feeds requires updating the rendering logic.

## Map behavior
- Leaflet CSS is imported in `src/main.tsx`; do not remove it.
- Markers show status colors from runtime status and camera health.
- Map tiles use OpenStreetMap; attribution must remain intact.

## UI conventions
- Tailwind CSS v4 is the primary styling tool.
- Global fonts are set in `src/index.css`; reuse `.font-mono` when needed.
- Avoid auto-starting all streams except in Monitor mode; streaming is intentionally opt-in for performance.

## Deployment
- Vercel deployment is configured via `vercel.json`.
- The build output directory is `dist`.
