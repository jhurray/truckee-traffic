import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type Hls from 'hls.js'
import type { Camera } from '../data/cameras'

type MonitorWallProps = {
  cameras: Camera[]
  immersive?: boolean
  onCameraSelect?: (camera: Camera) => void
}

type MonitorStatus = 'loading' | 'ready' | 'error'

type GridLayout = {
  cols: number
  rows: number
}

function getMonitorStatusLabel(status: MonitorStatus) {
  if (status === 'ready') {
    return 'Live'
  }

  if (status === 'error') {
    return 'Error'
  }

  return 'Connecting'
}

function getMonitorStatusTone(status: MonitorStatus) {
  if (status === 'ready') {
    return 'border-cyan-400/35 bg-cyan-500/20 text-cyan-100'
  }

  if (status === 'error') {
    return 'border-rose-400/45 bg-rose-500/20 text-rose-100'
  }

  return 'border-amber-300/50 bg-amber-500/20 text-amber-100'
}

function calculateBestLayout(
  cameraCount: number,
  containerWidth: number,
  containerHeight: number,
  gapPixels: number,
): GridLayout {
  if (cameraCount <= 1) {
    return { cols: 1, rows: 1 }
  }

  const videoAspect = 16 / 9
  let bestLayout: GridLayout = { cols: 1, rows: cameraCount }
  let bestArea = 0

  for (let cols = 1; cols <= cameraCount; cols += 1) {
    const rows = Math.ceil(cameraCount / cols)
    const widthWithGaps = containerWidth - (cols - 1) * gapPixels
    const heightWithGaps = containerHeight - (rows - 1) * gapPixels
    if (widthWithGaps <= 0 || heightWithGaps <= 0) {
      continue
    }

    const slotWidth = widthWithGaps / cols
    const slotHeight = heightWithGaps / rows
    const videoHeight = Math.min(slotHeight, slotWidth / videoAspect)
    const videoWidth = videoHeight * videoAspect
    const videoArea = videoWidth * videoHeight

    if (videoArea > bestArea) {
      bestArea = videoArea
      bestLayout = { cols, rows }
    }
  }

  return bestLayout
}

type MonitorFeedTileProps = {
  camera: Camera
  onCameraSelect?: (camera: Camera) => void
}

function MonitorFeedTile({ camera, onCameraSelect }: MonitorFeedTileProps) {
  const [status, setStatus] = useState<MonitorStatus>('loading')
  const [snapshotVersion, setSnapshotVersion] = useState(() => Date.now())
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const isSelectable = Boolean(onCameraSelect)
  const feed = camera.feed
  const hlsPlaylistUrl = feed.kind === 'hls' ? feed.playlistUrl : null
  const snapshotRefreshSeconds = feed.kind === 'snapshot' ? feed.refreshSeconds : null
  const snapshotStreamUrl = useMemo(() => {
    if (feed.kind !== 'snapshot') {
      return ''
    }

    const separator = feed.imageUrl.includes('?') ? '&' : '?'
    return `${feed.imageUrl}${separator}v=${snapshotVersion}`
  }, [feed, snapshotVersion])

  useEffect(() => {
    if (feed.kind !== 'snapshot' || !snapshotRefreshSeconds) {
      return
    }

    setStatus('loading')
    setSnapshotVersion(Date.now())
    const interval = window.setInterval(() => {
      setSnapshotVersion(Date.now())
    }, snapshotRefreshSeconds * 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [feed.kind, snapshotRefreshSeconds])

  useEffect(() => {
    const video = videoRef.current
    if (feed.kind !== 'hls') {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      if (video) {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }

      setStatus('loading')
      return
    }

    if (!video || !hlsPlaylistUrl) {
      setStatus('error')
      return
    }

    const handleCanPlay = () => {
      setStatus('ready')
      void video.play().catch(() => {
        setStatus('error')
      })
    }

    const handleFatalError = () => {
      setStatus('error')
    }

    setStatus('loading')
    video.addEventListener('canplay', handleCanPlay, { once: true })
    let cancelled = false

    const startPlayback = async () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsPlaylistUrl
        video.load()
        return
      }

      const hlsModule = await import('hls.js')
      if (cancelled) {
        return
      }

      const HlsPlayer = hlsModule.default
      if (!HlsPlayer.isSupported()) {
        handleFatalError()
        return
      }

      const hls = new HlsPlayer({
        maxBufferLength: 20,
        maxMaxBufferLength: 40,
      })

      hlsRef.current = hls
      hls.loadSource(hlsPlaylistUrl)
      hls.attachMedia(video)
      hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          handleFatalError()
        }
      })
    }

    void startPlayback()

    return () => {
      cancelled = true
      video.removeEventListener('canplay', handleCanPlay)
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [feed.kind, hlsPlaylistUrl])

  const handleSelect = () => {
    onCameraSelect?.(camera)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelect()
    }
  }

  return (
    <article
      className={`group relative overflow-hidden rounded-lg border border-zinc-700 bg-black ${
        isSelectable ? 'cursor-zoom-in' : ''
      }`}
      onClick={isSelectable ? handleSelect : undefined}
      onKeyDown={isSelectable ? handleKeyDown : undefined}
      role={isSelectable ? 'button' : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      aria-label={isSelectable ? `Open ${camera.name}` : undefined}
    >
      {feed.kind === 'hls' ? (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          autoPlay
          poster={feed.posterUrl}
        />
      ) : feed.kind === 'iframe' ? (
        <iframe
          src={feed.embedUrl}
          className={`h-full w-full ${isSelectable ? 'pointer-events-none' : ''}`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={`${camera.name} stream`}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
        />
      ) : (
        <img
          src={snapshotStreamUrl}
          alt={`${camera.name} live snapshot`}
          className="h-full w-full object-cover"
          loading="eager"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
        />
      )}

      {isSelectable ? (
        <div className="pointer-events-none absolute inset-0 border border-cyan-300/0 transition group-hover:border-cyan-300/45 group-focus-visible:border-cyan-300/65" />
      ) : null}

      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-2 py-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-300">
              {camera.area}
            </p>
            <p className="text-xs font-semibold text-zinc-100">{camera.name}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {isSelectable ? (
            <span className="rounded-full border border-cyan-300/35 bg-cyan-500/20 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-cyan-100">
                Open
              </span>
            ) : null}
            <span
              className={`rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${getMonitorStatusTone(status)}`}
            >
              {getMonitorStatusLabel(status)}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

export function MonitorWall({ cameras, immersive = false, onCameraSelect }: MonitorWallProps) {
  const wallRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [layout, setLayout] = useState<GridLayout>({ cols: 1, rows: 1 })
  const gapPixels = 8

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === wallRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    const gridNode = gridRef.current
    if (!gridNode) {
      return
    }

    const updateLayout = () => {
      const rect = gridNode.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) {
        return
      }

      setLayout(calculateBestLayout(cameras.length, rect.width, rect.height, gapPixels))
    }

    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(gridNode)
    window.addEventListener('resize', updateLayout)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateLayout)
    }
  }, [cameras.length])

  const handleToggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === wallRef.current) {
        await document.exitFullscreen()
        return
      }

      await wallRef.current?.requestFullscreen()
    } catch {
      // noop: browser may deny fullscreen if not user-initiated
    }
  }

  const tileStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
      gap: `${gapPixels}px`,
    }),
    [layout.cols, layout.rows],
  )

  if (cameras.length === 0) {
    return (
      <section
        className={`p-5 ${
          immersive
            ? 'h-full rounded-2xl border border-zinc-700/80 bg-zinc-950/95 shadow-2xl'
            : 'rounded-3xl border border-zinc-300/70 bg-white/85 shadow-sm backdrop-blur'
        }`}
      >
        <h2 className={`text-lg font-semibold ${immersive ? 'text-zinc-100' : 'text-zinc-900'}`}>
          Monitor The Situation
        </h2>
        <p className={`mt-2 text-sm ${immersive ? 'text-zinc-400' : 'text-zinc-500'}`}>
          No working cameras for this area filter right now.
        </p>
      </section>
    )
  }

  const containerClass = isFullscreen
    ? 'h-screen border-0 bg-zinc-950 px-3 py-3'
    : immersive
      ? 'h-full rounded-2xl border border-zinc-700/80 bg-zinc-950/95 p-3 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.8)]'
      : 'h-[74vh] rounded-3xl border border-zinc-300/70 bg-zinc-950/95 p-3'

  return (
    <section ref={wallRef} className={`overflow-hidden border ${containerClass}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Monitor The Situation</h2>
          <p className="mt-1 text-xs text-zinc-400">
            {cameras.length} working cameras streaming continuously in command-center mode.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleFullscreen}
          className="rounded-full border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-400 hover:text-white"
        >
          {isFullscreen ? 'Exit fullscreen' : immersive ? 'Browser fullscreen' : 'Fullscreen wall'}
        </button>
      </div>

      <div ref={gridRef} className="grid min-h-0 h-[calc(100%-56px)]" style={tileStyle}>
        {cameras.map((camera) => (
          <MonitorFeedTile key={camera.id} camera={camera} onCameraSelect={onCameraSelect} />
        ))}
      </div>
    </section>
  )
}
