import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import type { Camera } from '../data/cameras'
import type { StreamRuntimeStatus } from '../types/stream'

type CameraMapProps = {
  cameras: Camera[]
  runtimeStatusById: Record<string, StreamRuntimeStatus>
  onCameraSelect: (camera: Camera) => void
}

function getMarkerColor(camera: Camera, runtimeStatus: StreamRuntimeStatus | undefined) {
  if (runtimeStatus === 'error' || camera.health === 'offline') {
    return '#f59e0b'
  }

  if (runtimeStatus === 'ready') {
    return '#10b981'
  }

  if (runtimeStatus === 'loading') {
    return '#3b82f6'
  }

  return '#71717a'
}

function getMapCenter(cameras: Camera[]) {
  const { latTotal, lngTotal } = cameras.reduce(
    (acc, camera) => {
      acc.latTotal += camera.coordinates.lat
      acc.lngTotal += camera.coordinates.lng
      return acc
    },
    { latTotal: 0, lngTotal: 0 },
  )

  return [latTotal / cameras.length, lngTotal / cameras.length] as [number, number]
}

export function CameraMap({ cameras, runtimeStatusById, onCameraSelect }: CameraMapProps) {
  const visibleCameras = cameras.filter((camera) => Number.isFinite(camera.coordinates.lat))

  if (visibleCameras.length === 0) {
    return (
      <section className="rounded-3xl border border-zinc-300/70 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-5">
        <p className="text-sm text-zinc-500">No camera coordinates available for this filter.</p>
      </section>
    )
  }

  const mapCenter = getMapCenter(visibleCameras)

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-300/70 bg-white/85 shadow-sm backdrop-blur">
      <div className="border-b border-zinc-200 px-4 py-3 sm:px-5">
        <h2 className="text-lg font-semibold text-zinc-900">Camera Map</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Marker coordinates are best effort and can be edited in the camera catalog.
        </p>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={10}
        scrollWheelZoom
        className="h-[390px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {visibleCameras.map((camera) => {
          const runtimeStatus = runtimeStatusById[camera.id]
          const markerColor = getMarkerColor(camera, runtimeStatus)

          return (
            <CircleMarker
              key={camera.id}
              center={[camera.coordinates.lat, camera.coordinates.lng]}
              radius={8}
              pathOptions={{
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.75,
                weight: 2,
              }}
              eventHandlers={{
                click: () => onCameraSelect(camera),
              }}
            >
              <Tooltip direction="top" opacity={0.95} offset={[0, -6]}>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{camera.name}</p>
                  <p className="text-xs text-zinc-600">{camera.area}</p>
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </section>
  )
}
