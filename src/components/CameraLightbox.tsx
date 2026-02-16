import { useEffect, useMemo, useRef, useState } from 'react'
import type Hls from 'hls.js'
import type { Camera } from '../data/cameras'
import type { StreamRuntimeStatus } from '../types/stream'

type CameraLightboxProps = {
  camera: Camera
  onClose: () => void
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

export function CameraLightbox({ camera, onClose }: CameraLightboxProps) {
  const [isMuted, setIsMuted] = useState(true)
  const [runtimeStatus, setRuntimeStatus] = useState<StreamRuntimeStatus>('loading')
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  const statusLabel = useMemo(() => getStatusLabel(runtimeStatus), [runtimeStatus])

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
    const video = videoRef.current
    if (!video) {
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
        video.src = camera.streamUrl
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
      hls.loadSource(camera.streamUrl)
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
  }, [camera.streamUrl])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
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

        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            controls
            playsInline
            muted={isMuted}
            poster={camera.posterUrl}
            autoPlay
          />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsMuted((current) => !current)}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <a
              href={camera.sourcePage}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              Source page
            </a>
          </div>
          <p className="text-xs text-zinc-500">Click outside the player or press Esc to close.</p>
        </footer>
      </div>
    </div>
  )
}
