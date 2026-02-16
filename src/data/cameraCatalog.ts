import { cameras } from './cameras'
import type { Camera } from './cameraModel'
import type { StreamRuntimeStatus } from '../types/stream'

export type AreaFilter = 'all' | 'truckee' | 'south-lake'

export const areaFilterLabelMap: Record<AreaFilter, string> = {
  all: 'All',
  truckee: 'Truckee',
  'south-lake': 'South Lake',
}

export function matchesAreaFilter(camera: Camera, areaFilter: AreaFilter) {
  if (areaFilter === 'all') {
    return true
  }

  return camera.region === areaFilter
}

export function isWorkingCamera(camera: Camera) {
  return camera.health === 'live'
}

export function getCameraStatusSortRank(
  camera: Camera,
  runtimeStatusById: Record<string, StreamRuntimeStatus>,
) {
  const runtimeStatus = runtimeStatusById[camera.id]

  if (runtimeStatus === 'error') {
    return 4
  }

  if (camera.health === 'offline') {
    return 3
  }

  if (camera.health === 'unverified') {
    return 2
  }

  if (runtimeStatus === 'loading') {
    return 1
  }

  return 0
}

export function getCameraPreviewImage(camera: Camera) {
  if (camera.feed.kind === 'snapshot') {
    return camera.feed.imageUrl
  }

  return camera.feed.posterUrl
}

export { cameras }
