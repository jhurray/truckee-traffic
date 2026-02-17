import { useEffect, useMemo, useRef, useState } from 'react'
import type Hls from 'hls.js'
import type { Camera } from '../data/cameras'
import type { StreamRuntimeStatus } from '../types/stream'

type CameraLightboxProps = {
  camera: Camera
  onClose: () => void
  variant?: 'default' | 'full-page'
}

function getStatusLabel(runtimeStatus: StreamRuntimeStatus) {
  if (runtimeStatus === 'ready') {
    return 'Playing'
  }

  if (runtimeStatus === 'error') {
    return 'Unable to play stream'
  }

  if (runtimeStatus === 'loading' || runtimeStatus === 'idle') {
    return 'Connecting...'
  }

  return 'Connecting...'
}

export function CameraLightbox({ camera, onClose, variant = 'default' }: CameraLightboxProps) {
  const [isMuted, setIsMuted] = useState(true)
  const [runtimeStatus, setRuntimeStatus] = useState<StreamRuntimeStatus>('loading')
  const [snapshotVersion, setSnapshotVersion] = useState(() => Date.now())
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const feed = camera.feed
  const canMute = feed.kind === 'hls'
  const hlsPlaylistUrl = feed.kind === 'hls' ? feed.playlistUrl : null
  const snapshotRefreshSeconds = feed.kind === 'snapshot' ? feed.refreshSeconds : null
  const isFullPage = variant === 'full-page'

  const statusLabel = useMemo(() => getStatusLabel(runtimeStatus), [runtimeStatus])
  const snapshotStreamUrl = useMemo(() => {
    if (feed.kind !== 'snapshot') {
      return ''
    }

    const separator = feed.imageUrl.includes('?') ? '&' : '?'
    return `${feed.imageUrl}${separator}v=${snapshotVersion}`
  }, [feed, snapshotVersion])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('keydown', onEscape)
    }
  }, [onClose])

  useEffect(() => {
    if (feed.kind !== 'snapshot' || !snapshotRefreshSeconds) {
      return
    }

    setRuntimeStatus('loading')
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
      setRuntimeStatus('loading')
      return
    }

    if (!video || !hlsPlaylistUrl) {
      setRuntimeStatus('error')
      return
    }

    const handleCanPlay = () => {
      setRuntimeStatus('ready')
      void video.play().catch(() => {
        setRuntimeStatus('error')
      })
    }

    const handleFatalError = () => {
      setRuntimeStatus('error')
    }

    let cancelled = false
    video.addEventListener('canplay', handleCanPlay, { once: true })

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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  return (
    <div
      className={`fixed inset-0 z-[1000] flex bg-black/80 ${
        isFullPage ? 'items-stretch justify-stretch p-0' : 'items-center justify-center px-4 py-6 backdrop-blur-sm'
      }`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`w-full overflow-hidden bg-zinc-950 shadow-2xl ${
          isFullPage
            ? 'flex h-full max-w-none flex-col rounded-none border-0'
            : 'max-w-5xl rounded-2xl border border-zinc-700'
        }`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${camera.name} stream`}
      >
        <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              {camera.area}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-zinc-100">{camera.name}</h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-zinc-200">
              {statusLabel}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              Close
            </button>
          </div>
        </header>

        <div className={`relative bg-black ${isFullPage ? 'min-h-0 flex-1' : 'aspect-video'}`}>
          {feed.kind === 'hls' ? (
            <video
              ref={videoRef}
              className={`h-full w-full ${isFullPage ? 'object-contain' : 'object-cover'}`}
              controls
              playsInline
              muted={isMuted}
              poster={feed.posterUrl}
              autoPlay
            />
          ) : feed.kind === 'iframe' ? (
            <iframe
              src={feed.embedUrl}
              className="h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={`${camera.name} stream`}
              onLoad={() => setRuntimeStatus('ready')}
              onError={() => setRuntimeStatus('error')}
            />
          ) : (
            <img
              src={snapshotStreamUrl}
              alt={`${camera.name} live snapshot`}
              className={`h-full w-full ${isFullPage ? 'object-contain' : 'object-cover'}`}
              loading="eager"
              onLoad={() => setRuntimeStatus('ready')}
              onError={() => setRuntimeStatus('error')}
            />
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-4 py-3 sm:px-5">
          {canMute ? (
            <button
              type="button"
              onClick={() => setIsMuted((current) => !current)}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          ) : (
            <p className="text-xs text-zinc-500">
              Audio controls are managed by the upstream provider player.
            </p>
          )}
          <p className="text-xs text-zinc-500">Click outside the player or press Esc to close.</p>
        </footer>
      </div>
    </div>
  )
}
