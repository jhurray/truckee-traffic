export type CameraHealth = 'live' | 'offline' | 'unverified'
export type CameraRegion = 'truckee' | 'south-lake' | 'other'
export type CameraCategory = 'traffic' | 'resort' | 'scenic' | 'community'
export type CameraPriority = 'critical' | 'high' | 'normal'

export type CameraCoordinates = {
  lat: number
  lng: number
  estimated: boolean
}

export type HlsFeed = {
  kind: 'hls'
  playlistUrl: string
  posterUrl: string
}

export type IframeFeed = {
  kind: 'iframe'
  embedUrl: string
  posterUrl?: string
}

export type SnapshotFeed = {
  kind: 'snapshot'
  imageUrl: string
  refreshSeconds: number
}

export type CameraFeed = HlsFeed | IframeFeed | SnapshotFeed

export type CameraSource = {
  provider: string
  pageUrl: string
  extractor: string
  notes?: string
}

export type Camera = {
  id: string
  name: string
  area: string
  region: CameraRegion
  category: CameraCategory
  priority: CameraPriority
  health: CameraHealth
  coordinates: CameraCoordinates
  feed: CameraFeed
  source: CameraSource
}
