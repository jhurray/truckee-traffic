import { useEffect, useMemo, useRef, useState } from 'react'
import type Hls from 'hls.js'
import type { Camera } from '../data/cameras'
import type { StreamRuntimeStatus } from '../types/stream'

type CameraTileProps = {
  camera: Camera
  isStreaming: boolean
  runtimeStatus: StreamRuntimeStatus
  onToggleStreaming: (cameraId: string) => void
  onRuntimeStatusChange: (cameraId: string, status: StreamRuntimeStatus) => void
}

const healthStyleMap: Record<Camera['health'], string> = {
  live: 'border-emerald-400/70 bg-emerald-100 text-emerald-700',
  offline: 'border-amber-400/80 bg-amber-100 text-amber-700',
  unverified: 'border-zinc-300 bg-zinc-100 text-zinc-700',
}

const healthLabelMap: Record<Camera['health'], string> = {
  live: 'Verified live',
  offline: 'Last check failed',
  unverified: 'Not checked',
}

export function CameraTile({
  camera,
  isStreaming,
  runtimeStatus,
  onToggleStreaming,
  onRuntimeStatusChange,
}: CameraTileProps) {
  const [isMuted, setIsMuted] = useState(true)
  const [snapshotVersion, setSnapshotVersion] = useState(() => Date.now())
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const feed = camera.feed
  const hlsPlaylistUrl = feed.kind === 'hls' ? feed.playlistUrl : null
  const snapshotRefreshSeconds = feed.kind === 'snapshot' ? feed.refreshSeconds : null
  const canMute = feed.kind === 'hls'

  const statusLabel = useMemo(() => {
    if (!isStreaming) {
      return 'Paused'
    }

    if (runtimeStatus === 'loading' || runtimeStatus === 'idle') {
      return 'Connecting...'
    }

    if (runtimeStatus === 'error') {
      return 'Unable to play stream'
    }

    if (runtimeStatus === 'ready') {
      return 'Playing'
    }

    return 'Paused'
  }, [isStreaming, runtimeStatus])

  const previewImageUrl = useMemo(() => {
    if (feed.kind === 'snapshot') {
      return feed.imageUrl
    }

    return feed.posterUrl
  }, [feed])

  const snapshotStreamUrl = useMemo(() => {
    if (feed.kind !== 'snapshot') {
      return ''
    }

    const separator = feed.imageUrl.includes('?') ? '&' : '?'
    return `${feed.imageUrl}${separator}v=${snapshotVersion}`
  }, [feed, snapshotVersion])

  useEffect(() => {
    if (!isStreaming || feed.kind !== 'snapshot' || !snapshotRefreshSeconds) {
      return
    }

    setSnapshotVersion(Date.now())
    const interval = window.setInterval(() => {
      setSnapshotVersion(Date.now())
    }, snapshotRefreshSeconds * 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [feed.kind, isStreaming, snapshotRefreshSeconds])

  useEffect(() => {
    const video = videoRef.current

    if (!isStreaming) {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      if (video) {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }

      onRuntimeStatusChange(camera.id, 'idle')
      return
    }

    if (feed.kind === 'iframe' || feed.kind === 'snapshot') {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      if (video) {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }

      onRuntimeStatusChange(camera.id, 'loading')
      return
    }

    if (!video || !hlsPlaylistUrl) {
      onRuntimeStatusChange(camera.id, 'error')
      return
    }

    const handleCanPlay = () => {
      onRuntimeStatusChange(camera.id, 'ready')
      void video.play().catch(() => {
        onRuntimeStatusChange(camera.id, 'error')
      })
    }

    const handleFatalError = () => {
      onRuntimeStatusChange(camera.id, 'error')
    }

    onRuntimeStatusChange(camera.id, 'loading')
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
  }, [camera.id, feed.kind, hlsPlaylistUrl, isStreaming, onRuntimeStatusChange])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-sm backdrop-blur transition hover:border-zinc-300 hover:shadow-lg">
      <div className="relative aspect-video bg-zinc-900">
        {isStreaming ? (
          feed.kind === 'hls' ? (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              controls
              playsInline
              muted={isMuted}
              poster={feed.posterUrl}
            />
          ) : feed.kind === 'iframe' ? (
            <iframe
              src={feed.embedUrl}
              className="h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={`${camera.name} stream`}
              onLoad={() => onRuntimeStatusChange(camera.id, 'ready')}
              onError={() => onRuntimeStatusChange(camera.id, 'error')}
            />
          ) : (
            <img
              src={snapshotStreamUrl}
              alt={`${camera.name} live snapshot`}
              className="h-full w-full object-cover"
              loading="eager"
              onLoad={() => onRuntimeStatusChange(camera.id, 'ready')}
              onError={() => onRuntimeStatusChange(camera.id, 'error')}
            />
          )
        ) : (
          <>
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt={`${camera.name} preview`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-xs text-zinc-300">
                Preview unavailable
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-black/20" />
          </>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide ${healthStyleMap[camera.health]}`}
          >
            {healthLabelMap[camera.health]}
          </span>
          <span className="rounded-full border border-white/35 bg-black/35 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-white">
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{camera.area}</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">{camera.name}</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onToggleStreaming(camera.id)}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            {isStreaming ? 'Stop stream' : 'Start stream'}
          </button>

          <button
            type="button"
            onClick={() => setIsMuted((current) => !current)}
            disabled={!isStreaming || !canMute}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-500 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {canMute ? (isMuted ? 'Unmute' : 'Mute') : 'Audio in provider player'}
          </button>
        </div>

      </div>
    </article>
  )
}
