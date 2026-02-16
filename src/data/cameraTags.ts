export type CameraTagGroup =
  | 'type'
  | 'priority'
  | 'region'
  | 'road'
  | 'resort'
  | 'location'
  | 'view'
  | 'provider'

type CameraTagDefinition = {
  label: string
  group: CameraTagGroup
}

export const cameraTagDefinitions = {
  traffic: { label: 'Traffic', group: 'type' },
  resort: { label: 'Ski Resort', group: 'type' },
  scenic: { label: 'Scenic', group: 'type' },
  community: { label: 'Community', group: 'type' },

  critical: { label: 'Critical', group: 'priority' },
  high_priority: { label: 'High Priority', group: 'priority' },
  normal_priority: { label: 'Normal Priority', group: 'priority' },

  truckee: { label: 'Truckee', group: 'region' },
  south_lake: { label: 'South Lake', group: 'region' },

  i80: { label: 'I-80', group: 'road' },
  hwy89: { label: 'Hwy 89', group: 'road' },
  hwy267: { label: 'Hwy 267', group: 'road' },
  highway: { label: 'Highway', group: 'road' },
  intersection: { label: 'Intersection', group: 'road' },
  summit: { label: 'Summit', group: 'road' },
  chain_control: { label: 'Chain Control', group: 'road' },
  ski_traffic: { label: 'Ski Traffic', group: 'road' },

  palisades: { label: 'Palisades', group: 'resort' },
  sugar_bowl: { label: 'Sugar Bowl', group: 'resort' },
  northstar: { label: 'Northstar', group: 'resort' },
  tahoe_donner: { label: 'Tahoe Donner', group: 'resort' },

  olympic_valley: { label: 'Olympic Valley', group: 'location' },
  tahoe_city: { label: 'Tahoe City', group: 'location' },
  donner_lake: { label: 'Donner Lake', group: 'location' },
  donner_pass_road: { label: 'Donner Pass Rd', group: 'location' },
  northwoods: { label: 'Northwoods', group: 'location' },
  airport: { label: 'Airport', group: 'location' },
  downtown: { label: 'Downtown', group: 'location' },
  kingvale: { label: 'Kingvale', group: 'location' },
  soda_springs: { label: 'Soda Springs', group: 'location' },
  castle_peak: { label: 'Castle Peak', group: 'location' },
  brockway: { label: 'Brockway', group: 'location' },
  base_area: { label: 'Base Area', group: 'location' },
  village: { label: 'Village', group: 'location' },
  local_utility: { label: 'Local Utility', group: 'location' },

  hls: { label: 'HLS', group: 'view' },
  iframe: { label: 'Embed Player', group: 'view' },
  snapshot: { label: 'Snapshot', group: 'view' },

  caltrans: { label: 'Caltrans', group: 'provider' },
  brownrice: { label: 'Brownrice', group: 'provider' },
  ozolio: { label: 'Ozolio', group: 'provider' },
  hdontap: { label: 'HDOnTap', group: 'provider' },
  sugar_bowl_page: { label: 'Sugar Bowl Page', group: 'provider' },
} as const satisfies Record<string, CameraTagDefinition>

export type CameraTag = keyof typeof cameraTagDefinitions

export const cameraTagGroupOrder: CameraTagGroup[] = [
  'type',
  'priority',
  'region',
  'road',
  'resort',
  'location',
  'view',
  'provider',
]

export const cameraTagGroupLabelMap: Record<CameraTagGroup, string> = {
  type: 'Type',
  priority: 'Priority',
  region: 'Region',
  road: 'Road',
  resort: 'Resort',
  location: 'Location',
  view: 'Feed Type',
  provider: 'Provider',
}
