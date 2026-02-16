import { useMemo, useState } from 'react'
import { CameraTile } from './components/CameraTile'
import { cameras } from './data/cameras'

function App() {
  const [searchText, setSearchText] = useState('')

  const filteredCameras = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    if (!query) {
      return cameras
    }

    return cameras.filter((camera) => {
      const haystack = `${camera.name} ${camera.area}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [searchText])

  const cameraStats = useMemo(() => {
    return cameras.reduce(
      (stats, camera) => {
        stats[camera.health] += 1
        return stats
      },
      { live: 0, offline: 0, unverified: 0 },
    )
  }, [])

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
            Streams are sourced from public Brownrice HLS endpoints used by tahoeweathercam.
            Start only the cameras you need to keep bandwidth and CPU usage manageable.
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
          </div>
        </header>

        <section className="rounded-3xl border border-zinc-300/70 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-5">
          <label htmlFor="camera-search" className="mb-2 block font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
            Find camera
          </label>
          <input
            id="camera-search"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by location or camera name"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-inner outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
          />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCameras.map((camera) => (
            <CameraTile key={camera.id} camera={camera} />
          ))}
        </section>

        <footer className="pb-4 text-xs text-zinc-500">
          Last stream verification was run on February 16, 2026. A failing stream can come back
          later if the upstream provider changes hosts.
        </footer>
      </div>
    </main>
  )
}

export default App
