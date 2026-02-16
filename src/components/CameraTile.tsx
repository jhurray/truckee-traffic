import { useEffect, useMemo, useRef, useState } from 'react'
import type Hls from 'hls.js'
import type { Camera } from '../data/cameras'

type StreamState = 'idle' | 'loading' | 'ready' | 'error'

type CameraTileProps = {
  camera: Camera
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

export function CameraTile({ camera }: CameraTileProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [streamState, setStreamState] = useState<StreamState>('idle')
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  const statusLabel = useMemo(() => {
    if (streamState === 'loading') {
      return 'Connecting...'
    }

    if (streamState === 'error') {
      return 'Unable to play stream'
    }

    if (streamState === 'ready') {
      return 'Playing'
    }

    return 'Paused'
  }, [streamState])

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    if (!isStreaming) {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      video.pause()
      video.removeAttribute('src')
      video.load()
      return
    }

    const handleCanPlay = () => {
      setStreamState('ready')
      void video.play().catch(() => {
        setStreamState('error')
      })
    }

    const handleFatalError = () => {
      setStreamState('error')
    }

    video.addEventListener('canplay', handleCanPlay, { once: true })

    let cancelled = false

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
  }, [camera.streamUrl, isStreaming])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  const handleToggleStream = () => {
    setIsStreaming((current) => {
      const next = !current
      setStreamState(next ? 'loading' : 'idle')
      return next
    })
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-sm backdrop-blur transition hover:border-zinc-300 hover:shadow-lg">
      <div className="relative aspect-video bg-zinc-900">
        {isStreaming ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            controls
            playsInline
            muted={isMuted}
            poster={camera.posterUrl}
          />
        ) : (
          <>
            <img
              src={camera.posterUrl}
              alt={`${camera.name} preview`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
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
            onClick={handleToggleStream}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            {isStreaming ? 'Stop stream' : 'Start stream'}
          </button>

          <button
            type="button"
            onClick={() => setIsMuted((current) => !current)}
            disabled={!isStreaming}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-500 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        </div>

        <a
          href={camera.sourcePage}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-xs font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
        >
          Original source page
        </a>
      </div>
    </article>
  )
}
