import { cameras } from './cameras'
import {
  cameraTagDefinitions,
  cameraTagGroupLabelMap,
  cameraTagGroupOrder,
  type CameraTag,
  type CameraTagGroup,
} from './cameraTags'
import type { Camera } from './cameraModel'
import type { StreamRuntimeStatus } from '../types/stream'

export type AreaFilter = 'all' | 'truckee' | 'south-lake'
export type TagFilterMode = 'all' | 'any'

export type CameraTagOption = {
  tag: CameraTag
  label: string
  count: number
}

export type CameraTagGroupOptions = {
  group: CameraTagGroup
  label: string
  tags: CameraTagOption[]
}

export const areaFilterLabelMap: Record<AreaFilter, string> = {
  all: 'All',
  truckee: 'Truckee',
  'south-lake': 'South Lake',
}

const categoryTagMap: Record<Camera['category'], CameraTag> = {
  traffic: 'traffic',
  resort: 'resort',
  scenic: 'scenic',
  community: 'community',
}

const priorityTagMap: Record<Camera['priority'], CameraTag> = {
  critical: 'critical',
  high: 'high_priority',
  normal: 'normal_priority',
}

const feedKindTagMap: Record<Camera['feed']['kind'], CameraTag> = {
  hls: 'hls',
  iframe: 'iframe',
  snapshot: 'snapshot',
}

const providerTagMap: Record<string, CameraTag | undefined> = {
  caltrans: 'caltrans',
  brownrice: 'brownrice',
  ozolio: 'ozolio',
  hdontap: 'hdontap',
  sugarbowl: 'sugar_bowl_page',
}

export function matchesAreaFilter(camera: Camera, areaFilter: AreaFilter) {
  if (areaFilter === 'all') {
    return true
  }

  return camera.region === areaFilter
}

function uniqueTags(tags: CameraTag[]) {
  return [...new Set(tags)]
}

export function getCameraFilterTags(camera: Camera): CameraTag[] {
  const derivedTags: CameraTag[] = [
    categoryTagMap[camera.category],
    priorityTagMap[camera.priority],
    feedKindTagMap[camera.feed.kind],
  ]

  const providerTag = providerTagMap[camera.source.provider]
  if (providerTag) {
    derivedTags.push(providerTag)
  }

  if (camera.region === 'truckee') {
    derivedTags.push('truckee')
  }

  if (camera.region === 'south-lake') {
    derivedTags.push('south_lake')
  }

  return uniqueTags([...camera.tags, ...derivedTags])
}

export function getCameraTagLabel(tag: CameraTag) {
  return cameraTagDefinitions[tag].label
}

export function getCameraTagCounts(cameraList: Camera[]): Record<CameraTag, number> {
  const allTags = Object.keys(cameraTagDefinitions) as CameraTag[]
  const counts = Object.fromEntries(allTags.map((tag) => [tag, 0])) as Record<CameraTag, number>

  for (const camera of cameraList) {
    const tags = getCameraFilterTags(camera)
    for (const tag of tags) {
      counts[tag] += 1
    }
  }

  return counts
}

export function getCameraTagGroups(cameraList: Camera[]): CameraTagGroupOptions[] {
  const tagCounts = getCameraTagCounts(cameraList)
  const allTags = Object.keys(cameraTagDefinitions) as CameraTag[]

  return cameraTagGroupOrder
    .map((group) => {
      const tags = allTags
        .filter((tag) => cameraTagDefinitions[tag].group === group)
        .map((tag) => ({
          tag,
          label: getCameraTagLabel(tag),
          count: tagCounts[tag],
        }))

      return {
        group,
        label: cameraTagGroupLabelMap[group],
        tags,
      }
    })
    .filter((group) => group.tags.some((tag) => tag.count > 0))
}

export function matchesTagFilter(
  camera: Camera,
  selectedTags: CameraTag[],
  tagFilterMode: TagFilterMode,
) {
  if (selectedTags.length === 0) {
    return true
  }

  const cameraTagSet = new Set(getCameraFilterTags(camera))
  if (tagFilterMode === 'any') {
    return selectedTags.some((tag) => cameraTagSet.has(tag))
  }

  return selectedTags.every((tag) => cameraTagSet.has(tag))
}

export function getCameraSearchHaystack(camera: Camera) {
  const tagText = getCameraFilterTags(camera)
    .map((tag) => getCameraTagLabel(tag))
    .join(' ')

  return `${camera.name} ${camera.area} ${tagText}`.toLowerCase()
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
