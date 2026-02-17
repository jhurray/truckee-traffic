import { useCallback, useMemo, useReducer, useState } from 'react'
import { CameraLightbox } from './components/CameraLightbox'
import { CameraMap } from './components/CameraMap'
import { MonitorWall } from './components/MonitorWall'
import { CameraTile } from './components/CameraTile'
import {
  areaFilterLabelMap,
  cameras,
  getCameraSearchMatchRank,
  getCameraStatusSortRank,
  getCameraTagGroups,
  getCameraTagLabel,
  isWorkingCamera,
  matchesAreaFilter,
  matchesTagFilter,
  type AreaFilter,
  type TagFilterMode,
} from './data/cameraCatalog'
import type { Camera } from './data/cameraModel'
import type { CameraTag } from './data/cameraTags'
import type { StreamRuntimeStatus } from './types/stream'

type ViewMode = 'streams' | 'map' | 'monitor'

type StreamControllerState = {
  activeById: Record<string, boolean>
  runtimeById: Record<string, StreamRuntimeStatus>
}

type StreamControllerAction =
  | { type: 'toggle_one'; cameraId: string }
  | { type: 'set_many'; cameraIds: string[]; value: boolean }
  | { type: 'runtime_update'; cameraId: string; status: StreamRuntimeStatus }

function createInitialStreamControllerState(): StreamControllerState {
  const activeById = Object.fromEntries(
    cameras.map((camera) => [camera.id, false]),
  ) as Record<string, boolean>
  const runtimeById = Object.fromEntries(
    cameras.map((camera) => [camera.id, 'idle' as StreamRuntimeStatus]),
  ) as Record<string, StreamRuntimeStatus>
  return { activeById, runtimeById }
}

function streamControllerReducer(
  state: StreamControllerState,
  action: StreamControllerAction,
): StreamControllerState {
  if (action.type === 'toggle_one') {
    const wasActive = Boolean(state.activeById[action.cameraId])
    const nextActiveById = {
      ...state.activeById,
      [action.cameraId]: !wasActive,
    }
    const nextRuntimeById: Record<string, StreamRuntimeStatus> = {
      ...state.runtimeById,
      [action.cameraId]: wasActive ? 'idle' : 'loading',
    }

    return {
      activeById: nextActiveById,
      runtimeById: nextRuntimeById,
    }
  }

  if (action.type === 'set_many') {
    const nextActiveById: Record<string, boolean> = { ...state.activeById }
    const nextRuntimeById: Record<string, StreamRuntimeStatus> = { ...state.runtimeById }

    for (const cameraId of action.cameraIds) {
      nextActiveById[cameraId] = action.value
      nextRuntimeById[cameraId] = action.value ? 'loading' : 'idle'
    }

    return {
      activeById: nextActiveById,
      runtimeById: nextRuntimeById,
    }
  }

  if (state.runtimeById[action.cameraId] === action.status) {
    return state
  }

  return {
    ...state,
    runtimeById: {
      ...state.runtimeById,
      [action.cameraId]: action.status,
    },
  }
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('streams')
  const [searchText, setSearchText] = useState('')
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all')
  const [selectedTags, setSelectedTags] = useState<CameraTag[]>([])
  const [tagFilterMode, setTagFilterMode] = useState<TagFilterMode>('all')
  const [tagSearchText, setTagSearchText] = useState('')
  const [isTagBrowserOpen, setIsTagBrowserOpen] = useState(false)
  const [sortByStatus, setSortByStatus] = useState(true)
  const [lightboxCamera, setLightboxCamera] = useState<Camera | null>(null)
  const [streamControllerState, dispatchStreamController] = useReducer(
    streamControllerReducer,
    undefined,
    createInitialStreamControllerState,
  )

  const handleToggleOne = useCallback((cameraId: string) => {
    dispatchStreamController({ type: 'toggle_one', cameraId })
  }, [])

  const handleRuntimeStatusChange = useCallback(
    (cameraId: string, status: StreamRuntimeStatus) => {
      dispatchStreamController({ type: 'runtime_update', cameraId, status })
    },
    [],
  )

  const handleOpenCameraLightbox = useCallback((camera: Camera) => {
    setLightboxCamera(camera)
  }, [])

  const handleCloseCameraLightbox = useCallback(() => {
    setLightboxCamera(null)
  }, [])

  const handleToggleTag = useCallback((tag: CameraTag) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) {
        return current.filter((activeTag) => activeTag !== tag)
      }
      return [...current, tag]
    })
  }, [])

  const handleClearTags = useCallback(() => {
    setSelectedTags([])
  }, [])

  const selectedTagSet = useMemo(() => new Set(selectedTags), [selectedTags])

  const areaFilteredCameras = useMemo(() => {
    return cameras.filter((camera) => matchesAreaFilter(camera, areaFilter))
  }, [areaFilter])

  const tagGroupOptions = useMemo(() => {
    return getCameraTagGroups(areaFilteredCameras)
  }, [areaFilteredCameras])

  const filteredTagGroupOptions = useMemo(() => {
    const query = tagSearchText.trim().toLowerCase()
    if (!query) {
      return tagGroupOptions
    }

    return tagGroupOptions
      .map((group) => ({
        ...group,
        tags: group.tags.filter((tagOption) => tagOption.label.toLowerCase().includes(query)),
      }))
      .filter((group) => group.tags.length > 0)
  }, [tagGroupOptions, tagSearchText])

  const tagFilteredCameras = useMemo(() => {
    return areaFilteredCameras.filter((camera) =>
      matchesTagFilter(camera, selectedTags, tagFilterMode),
    )
  }, [areaFilteredCameras, selectedTags, tagFilterMode])

  const filteredCameras = useMemo(() => {
    const query = searchText.trim().toLowerCase()

    return tagFilteredCameras.filter((camera) => {
      if (!query) {
        return true
      }

      return getCameraSearchMatchRank(camera, query) < 99
    })
  }, [searchText, tagFilteredCameras])

  const monitorCameras = useMemo(() => {
    return [...filteredCameras]
      .filter((camera) => isWorkingCamera(camera))
      .sort((left, right) => {
        const areaCompare = left.area.localeCompare(right.area)
        if (areaCompare !== 0) {
          return areaCompare
        }
        return left.name.localeCompare(right.name)
      })
  }, [filteredCameras])

  const sortedCameras = useMemo(() => {
    const query = searchText.trim().toLowerCase()

    return [...filteredCameras].sort((left, right) => {
      if (query) {
        const leftSearchRank = getCameraSearchMatchRank(left, query)
        const rightSearchRank = getCameraSearchMatchRank(right, query)
        if (leftSearchRank !== rightSearchRank) {
          return leftSearchRank - rightSearchRank
        }
      }

      if (sortByStatus) {
        const leftRank = getCameraStatusSortRank(left, streamControllerState.runtimeById)
        const rightRank = getCameraStatusSortRank(right, streamControllerState.runtimeById)
        if (leftRank !== rightRank) {
          return leftRank - rightRank
        }
      }

      const areaCompare = left.area.localeCompare(right.area)
      if (areaCompare !== 0) {
        return areaCompare
      }

      return left.name.localeCompare(right.name)
    })
  }, [filteredCameras, searchText, sortByStatus, streamControllerState.runtimeById])

  const cameraStats = useMemo(() => {
    return cameras.reduce(
      (stats, camera) => {
        stats[camera.health] += 1
        return stats
      },
      { live: 0, offline: 0, unverified: 0 },
    )
  }, [])

  const activeStreamCount = useMemo(() => {
    return Object.values(streamControllerState.activeById).filter(Boolean).length
  }, [streamControllerState.activeById])

  const bulkControlledCameraIds = useMemo(() => sortedCameras.map((camera) => camera.id), [sortedCameras])

  const allFilteredStreamsActive = useMemo(() => {
    if (bulkControlledCameraIds.length === 0) {
      return false
    }

    return bulkControlledCameraIds.every((cameraId) =>
      Boolean(streamControllerState.activeById[cameraId]),
    )
  }, [bulkControlledCameraIds, streamControllerState.activeById])

  const handleToggleAllStreams = () => {
    dispatchStreamController({
      type: 'set_many',
      cameraIds: bulkControlledCameraIds,
      value: !allFilteredStreamsActive,
    })
  }

  if (viewMode === 'monitor') {
    return (
      <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#1f2937_0%,_#09090b_48%,_#020617_100%)] text-zinc-100">
        <div className="relative h-full">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:28px_28px] opacity-20" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cyan-500/10 to-transparent" />

          <div className="relative z-10 flex h-full flex-col">
            <header className="border-b border-zinc-800/80 bg-zinc-950/70 px-3 py-3 backdrop-blur">
              <div className="mx-auto max-w-[1800px] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300/80">
                      Command Center
                    </p>
                    <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-100">
                      Monitor The Situation
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('streams')}
                      className="rounded-full border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-400 hover:text-white"
                    >
                      Streams
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('map')}
                      className="rounded-full border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-400 hover:text-white"
                    >
                      Map
                    </button>
                    <span className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-cyan-200">
                      live wall: {monitorCameras.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(Object.keys(areaFilterLabelMap) as AreaFilter[]).map((filterOption) => (
                    <button
                      key={filterOption}
                      type="button"
                      onClick={() => setAreaFilter(filterOption)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        areaFilter === filterOption
                          ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                          : 'border border-zinc-600 bg-zinc-900 text-zinc-300 hover:border-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {areaFilterLabelMap[filterOption]}
                    </button>
                  ))}

                  <input
                    type="search"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search camera or tag"
                    className="min-w-[220px] flex-1 rounded-full border border-zinc-600 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-cyan-400/70"
                  />

                  <button
                    type="button"
                    onClick={() => setIsTagBrowserOpen((current) => !current)}
                    className="rounded-full border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-400 hover:text-white"
                  >
                    {isTagBrowserOpen ? 'Hide filters' : 'Show filters'}
                  </button>
                </div>
              </div>
            </header>

            <div className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 gap-3 px-3 pb-3 pt-3">
              {isTagBrowserOpen ? (
                <aside className="flex h-full w-[320px] shrink-0 flex-col rounded-2xl border border-zinc-700/80 bg-zinc-950/90 p-3 shadow-2xl">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                      Tag filters
                    </p>
                    <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300">
                      {selectedTags.length} selected
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTagFilterMode('all')}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        tagFilterMode === 'all'
                          ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/50'
                          : 'border border-zinc-600 bg-zinc-900 text-zinc-300 hover:border-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      Match all
                    </button>
                    <button
                      type="button"
                      onClick={() => setTagFilterMode('any')}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        tagFilterMode === 'any'
                          ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/50'
                          : 'border border-zinc-600 bg-zinc-900 text-zinc-300 hover:border-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      Match any
                    </button>
                    {selectedTags.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleClearTags}
                        className="rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-400 hover:text-zinc-100"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  {selectedTags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className="rounded-full border border-cyan-400/50 bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/30"
                        >
                          {getCameraTagLabel(tag)} ×
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <input
                    type="search"
                    value={tagSearchText}
                    onChange={(event) => setTagSearchText(event.target.value)}
                    placeholder="Search tags..."
                    className="mt-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-cyan-400/70"
                  />

                  <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
                    {filteredTagGroupOptions.length === 0 ? (
                      <p className="text-sm text-zinc-500">No tags match that search.</p>
                    ) : (
                      filteredTagGroupOptions.map((group) => (
                        <div key={group.group}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            {group.label}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {group.tags.map((tagOption) => {
                              const isSelected = selectedTagSet.has(tagOption.tag)
                              return (
                                <button
                                  key={tagOption.tag}
                                  type="button"
                                  onClick={() => handleToggleTag(tagOption.tag)}
                                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                                    isSelected
                                      ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                                      : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100'
                                  }`}
                                >
                                  {tagOption.label} ({tagOption.count})
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </aside>
              ) : null}

              <div className="min-h-0 min-w-0 flex-1">
                <MonitorWall
                  cameras={monitorCameras}
                  immersive
                  onCameraSelect={handleOpenCameraLightbox}
                />
              </div>
            </div>
          </div>
        </div>

        {lightboxCamera ? (
          <CameraLightbox
            key={lightboxCamera.id}
            camera={lightboxCamera}
            onClose={handleCloseCameraLightbox}
            variant="full-page"
          />
        ) : null}
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2e8f0_0%,_#f8fafc_35%,_#f4f4f5_100%)] px-4 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1400px] space-y-8">
        <header className="rounded-3xl border border-zinc-300/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-zinc-500">
            Truckee Traffic Live
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-zinc-900 sm:text-4xl">
            Tahoe and Truckee camera dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            Streams are sourced from public traffic, resort, and community feeds across Caltrans,
            Brownrice, Ozolio, and HDOnTap. Start only the cameras you need to keep bandwidth and
            CPU usage manageable.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-semibold text-emerald-700">
              live: {cameraStats.live}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 font-mono text-xs font-semibold text-amber-700">
              needs recheck: {cameraStats.offline}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 font-mono text-xs font-semibold text-zinc-700">
              unverified: {cameraStats.unverified}
            </span>
            <span className="rounded-full bg-sky-100 px-3 py-1 font-mono text-xs font-semibold text-sky-700">
              streaming now: {activeStreamCount}
            </span>
          </div>
        </header>

        <section className="rounded-3xl border border-zinc-300/70 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setViewMode('streams')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                viewMode === 'streams'
                  ? 'bg-zinc-900 text-white'
                  : 'border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:text-zinc-900'
              }`}
            >
              Streams
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                viewMode === 'map'
                  ? 'bg-zinc-900 text-white'
                  : 'border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:text-zinc-900'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('monitor')}
              className="rounded-full border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-900 transition hover:border-cyan-500 hover:bg-cyan-100"
            >
              Monitor
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(areaFilterLabelMap) as AreaFilter[]).map((filterOption) => (
              <button
                key={filterOption}
                type="button"
                onClick={() => setAreaFilter(filterOption)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  areaFilter === filterOption
                    ? 'bg-zinc-900 text-white'
                    : 'border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:text-zinc-900'
                }`}
              >
                {areaFilterLabelMap[filterOption]}
              </button>
            ))}
          </div>

          <div className="mb-4 rounded-2xl border border-zinc-200 bg-white/80 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Tag filters
              </p>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                {selectedTags.length} selected
              </span>
              <button
                type="button"
                onClick={() => setIsTagBrowserOpen((current) => !current)}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-900"
              >
                {isTagBrowserOpen ? 'Hide tag list' : 'Browse tags'}
              </button>
              {selectedTags.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearTags}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-900"
                >
                  Clear tags
                </button>
              ) : null}
            </div>

            {selectedTags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className="rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-zinc-700"
                  >
                    {getCameraTagLabel(tag)} ×
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                Use Browse tags to apply one or more tags.
              </p>
            )}

            {isTagBrowserOpen ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="search"
                    value={tagSearchText}
                    onChange={(event) => setTagSearchText(event.target.value)}
                    placeholder="Search tags..."
                    className="min-w-[220px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => setTagFilterMode('all')}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      tagFilterMode === 'all'
                        ? 'bg-zinc-900 text-white'
                        : 'border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Match all
                  </button>
                  <button
                    type="button"
                    onClick={() => setTagFilterMode('any')}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      tagFilterMode === 'any'
                        ? 'bg-zinc-900 text-white'
                        : 'border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Match any
                  </button>
                </div>

                <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
                  {filteredTagGroupOptions.length === 0 ? (
                    <p className="text-sm text-zinc-500">No tags match that search.</p>
                  ) : (
                    filteredTagGroupOptions.map((group) => (
                      <div key={group.group}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          {group.label}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.tags.map((tagOption) => {
                            const isSelected = selectedTagSet.has(tagOption.tag)
                            return (
                              <button
                                key={tagOption.tag}
                                type="button"
                                onClick={() => handleToggleTag(tagOption.tag)}
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                                  isSelected
                                    ? 'border-zinc-900 bg-zinc-900 text-white'
                                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:text-zinc-900'
                                }`}
                              >
                                {tagOption.label} ({tagOption.count})
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <label
            htmlFor="camera-search"
            className="mb-2 block font-mono text-xs uppercase tracking-[0.2em] text-zinc-500"
          >
            Find camera
          </label>
          <input
            id="camera-search"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by camera name, area, or tag"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-inner outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {viewMode === 'streams' ? (
              <>
                <button
                  type="button"
                  onClick={handleToggleAllStreams}
                  disabled={bulkControlledCameraIds.length === 0}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {allFilteredStreamsActive ? 'Stop filtered streams' : 'Start filtered streams'}
                </button>
                <button
                  type="button"
                  onClick={() => setSortByStatus((current) => !current)}
                  className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-500 hover:text-zinc-900"
                >
                  {sortByStatus ? 'Sorting by status' : 'Sorting A-Z'}
                </button>
              </>
            ) : (
              <p className="text-xs text-zinc-500">Click a map marker to open its live stream.</p>
            )}
          </div>
        </section>

        {viewMode === 'map' ? (
          <CameraMap
            cameras={sortedCameras}
            runtimeStatusById={streamControllerState.runtimeById}
            onCameraSelect={handleOpenCameraLightbox}
          />
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedCameras.map((camera) => (
              <CameraTile
                key={camera.id}
                camera={camera}
                isStreaming={Boolean(streamControllerState.activeById[camera.id])}
                runtimeStatus={streamControllerState.runtimeById[camera.id]}
                onToggleStreaming={handleToggleOne}
                onRuntimeStatusChange={handleRuntimeStatusChange}
              />
            ))}
          </section>
        )}

        <footer className="pb-4 text-xs text-zinc-500">
          Last stream verification was run on February 16, 2026. A failing stream can come back
          later if the upstream provider changes hosts. Map coordinates are estimated and can be
          edited in <code>src/data/cameras.ts</code>.
        </footer>
      </div>

      {lightboxCamera ? (
        <CameraLightbox
          key={lightboxCamera.id}
          camera={lightboxCamera}
          onClose={handleCloseCameraLightbox}
        />
      ) : null}
    </main>
  )
}

export default App
