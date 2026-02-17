import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchHighwayConditions } from '../data/highwayConditions'
import type {
  HighwayAlertSeverity,
  HighwayConditionsSnapshot,
  HighwayRouteCondition,
  HighwayRouteStatus,
} from '../types/highway'

type HighwayConditionsPanelProps = {
  tone?: 'light' | 'dark'
  compact?: boolean
}

const refreshIntervalMs = 120000

const statusLabelMap: Record<HighwayRouteStatus, string> = {
  open: 'Open',
  restricted: 'Restricted',
  closed: 'Closed',
  unknown: 'Unknown',
}

function summarizeDirection(route: HighwayRouteCondition, severity: HighwayAlertSeverity) {
  const directions = new Set(
    route.alerts
      .filter((alert) => alert.severity === severity)
      .map((alert) => alert.direction)
      .filter((direction) => direction !== null),
  )

  if (directions.has('both')) {
    return 'both directions'
  }

  const hasEastbound = directions.has('eastbound')
  const hasWestbound = directions.has('westbound')
  if (hasEastbound && hasWestbound) {
    return 'both directions'
  }

  if (hasEastbound) {
    return 'eastbound'
  }

  if (hasWestbound) {
    return 'westbound'
  }

  return null
}

function summarizeLocation(route: HighwayRouteCondition, severity: HighwayAlertSeverity) {
  const firstLocation = route.alerts.find((alert) => alert.severity === severity)?.location
  if (!firstLocation) {
    return null
  }

  return firstLocation.replace(/^\b(from|at|in)\b\s+/i, '')
}

function summarizeRoute(route: HighwayRouteCondition) {
  if (route.status === 'unknown') {
    return `${route.routeLabel} status unavailable`
  }

  if (route.status === 'open') {
    return `${route.routeLabel} open`
  }

  if (route.status === 'closed') {
    const directionSummary = summarizeDirection(route, 'closure')
    const locationSummary = summarizeLocation(route, 'closure')
    const directionText = directionSummary ? ` ${directionSummary}` : ''
    const locationText = locationSummary ? ` at ${locationSummary}` : ''
    return `${route.routeLabel} closed${directionText}${locationText}`
  }

  const directionSummary = summarizeDirection(route, 'restriction')
  const locationSummary = summarizeLocation(route, 'restriction')
  const directionText = directionSummary ? ` ${directionSummary}` : ''
  const locationText = locationSummary ? ` at ${locationSummary}` : ''
  return `${route.routeLabel} restricted${directionText}${locationText}`
}

function summarizeHighwayHeadline(routes: HighwayRouteCondition[]) {
  if (routes.length === 0) {
    return 'Loading route summary...'
  }

  return routes.map((route) => summarizeRoute(route)).join(' • ')
}

function formatFetchedAt(isoDateTime: string | null) {
  if (!isoDateTime) {
    return 'never'
  }

  const parsed = new Date(isoDateTime)
  if (Number.isNaN(parsed.getTime())) {
    return 'unknown'
  }

  return parsed.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getStatusTone(
  status: HighwayRouteStatus,
  tone: 'light' | 'dark',
): {
  badgeClassName: string
  borderClassName: string
} {
  if (tone === 'dark') {
    if (status === 'closed') {
      return {
        badgeClassName: 'bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/50',
        borderClassName: 'border-rose-400/40',
      }
    }

    if (status === 'restricted') {
      return {
        badgeClassName: 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/50',
        borderClassName: 'border-amber-400/40',
      }
    }

    if (status === 'open') {
      return {
        badgeClassName: 'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/50',
        borderClassName: 'border-emerald-400/40',
      }
    }

    return {
      badgeClassName: 'bg-zinc-700/70 text-zinc-200 ring-1 ring-zinc-500/70',
      borderClassName: 'border-zinc-600/80',
    }
  }

  if (status === 'closed') {
    return {
      badgeClassName: 'bg-rose-100 text-rose-700',
      borderClassName: 'border-rose-300/80',
    }
  }

  if (status === 'restricted') {
    return {
      badgeClassName: 'bg-amber-100 text-amber-800',
      borderClassName: 'border-amber-300/80',
    }
  }

  if (status === 'open') {
    return {
      badgeClassName: 'bg-emerald-100 text-emerald-800',
      borderClassName: 'border-emerald-300/80',
    }
  }

  return {
    badgeClassName: 'bg-zinc-100 text-zinc-700',
    borderClassName: 'border-zinc-300/80',
  }
}

function getSeverityLabel(severity: HighwayAlertSeverity) {
  return severity === 'closure' ? 'Closure' : 'Restriction'
}

function getSeverityBadgeClass(severity: HighwayAlertSeverity, tone: 'light' | 'dark') {
  if (tone === 'dark') {
    return severity === 'closure'
      ? 'bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/40'
      : 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/40'
  }

  return severity === 'closure'
    ? 'bg-rose-100 text-rose-700'
    : 'bg-amber-100 text-amber-800'
}

function routeSummary(route: HighwayRouteCondition) {
  if (route.status === 'open') {
    return 'No active closure or restriction currently listed by Caltrans.'
  }

  if (route.status === 'unknown') {
    return 'Live Caltrans status could not be fetched right now.'
  }

  const closureCount = route.alerts.filter((alert) => alert.severity === 'closure').length
  const restrictionCount = route.alerts.filter((alert) => alert.severity === 'restriction').length

  return `${closureCount} closure${closureCount === 1 ? '' : 's'}, ${restrictionCount} restriction${restrictionCount === 1 ? '' : 's'}`
}

export function HighwayConditionsPanel({
  tone = 'light',
  compact = false,
}: HighwayConditionsPanelProps) {
  const [snapshot, setSnapshot] = useState<HighwayConditionsSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const hasSnapshotRef = useRef(false)

  const refreshData = useCallback(async (options?: { signal?: AbortSignal }) => {
    const hasExistingData = hasSnapshotRef.current
    if (hasExistingData) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const nextSnapshot = await fetchHighwayConditions({
        signal: options?.signal,
      })
      setSnapshot(nextSnapshot)
      hasSnapshotRef.current = true
      setFetchError(null)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unable to fetch Caltrans road conditions.'
      setFetchError(errorMessage)
    } finally {
      if (hasExistingData) {
        setIsRefreshing(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refreshData({ signal: controller.signal })

    const intervalId = window.setInterval(() => {
      void refreshData()
    }, refreshIntervalMs)

    return () => {
      controller.abort()
      window.clearInterval(intervalId)
    }
  }, [refreshData])

  const routes = useMemo(() => snapshot?.routes ?? [], [snapshot])
  const lastFetchedAt = useMemo(() => formatFetchedAt(snapshot?.fetchedAt ?? null), [snapshot])
  const headlineSummary = useMemo(() => summarizeHighwayHeadline(routes), [routes])

  const sectionClassName =
    tone === 'dark'
      ? 'rounded-2xl border border-zinc-700/80 bg-zinc-950/85 p-3'
      : 'rounded-3xl border border-zinc-300/70 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-5'

  const mutedTextClassName = tone === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
  const primaryTextClassName = tone === 'dark' ? 'text-zinc-100' : 'text-zinc-900'

  return (
    <section className={sectionClassName}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p
            className={`font-mono text-[11px] uppercase tracking-[0.18em] ${
              tone === 'dark' ? 'text-cyan-200/80' : 'text-zinc-500'
            }`}
          >
            Caltrans Highway Watch
          </p>
          <p className={`text-sm ${mutedTextClassName}`}>
            I-80 and US-50 closures/restrictions, refreshed every 2 minutes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs ${mutedTextClassName}`}>Updated: {lastFetchedAt}</span>
          <button
            type="button"
            onClick={() => void refreshData()}
            disabled={isLoading || isRefreshing}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              tone === 'dark'
                ? 'border border-zinc-600 bg-zinc-900 text-zinc-200 hover:border-zinc-400 hover:text-white'
                : 'border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:text-zinc-900'
            }`}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh now'}
          </button>
        </div>
      </div>

      <p
        className={`mt-3 rounded-xl px-3 py-2 text-sm ${
          tone === 'dark'
            ? 'bg-zinc-900/80 text-zinc-200 ring-1 ring-zinc-700/80'
            : 'bg-zinc-100 text-zinc-700'
        }`}
      >
        {headlineSummary}
      </p>

      {isLoading ? (
        <p className={`mt-3 text-sm ${mutedTextClassName}`}>Loading Caltrans road conditions...</p>
      ) : null}

      {fetchError ? (
        <p className={`mt-3 text-sm ${tone === 'dark' ? 'text-rose-200' : 'text-rose-700'}`}>
          {fetchError}
        </p>
      ) : null}

      {!isLoading ? (
        <div className={`mt-3 grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {routes.map((route) => {
            const statusTone = getStatusTone(route.status, tone)
            return (
              <article
                key={route.routeNumber}
                className={`rounded-2xl border p-3 ${statusTone.borderClassName} ${
                  tone === 'dark' ? 'bg-zinc-900/70' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className={`text-lg font-semibold ${primaryTextClassName}`}>{route.routeLabel}</p>
                    <p className={`text-xs ${mutedTextClassName}`}>{route.corridorLabel}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone.badgeClassName}`}>
                    {statusLabelMap[route.status]}
                  </span>
                </div>

                <p className={`mt-2 text-xs ${mutedTextClassName}`}>
                  Caltrans report:{' '}
                  <span className={primaryTextClassName}>{route.reportedAt ?? 'not available'}</span>
                </p>

                <p className={`mt-2 text-sm ${tone === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>
                  {routeSummary(route)}
                </p>

                {!compact && route.alerts.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {route.alerts.slice(0, 4).map((alert) => (
                      <li key={alert.id} className="rounded-xl border border-zinc-500/20 p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getSeverityBadgeClass(alert.severity, tone)}`}
                          >
                            {getSeverityLabel(alert.severity)}
                          </span>
                          {alert.location ? (
                            <span className={`text-xs ${tone === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                              {alert.location}
                            </span>
                          ) : null}
                        </div>
                        <p className={`mt-1 text-sm ${tone === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>
                          {alert.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {route.fetchError ? (
                  <p className={`mt-2 text-xs ${tone === 'dark' ? 'text-rose-200' : 'text-rose-700'}`}>
                    Route fetch failed: {route.fetchError}
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}

      <p className={`mt-3 text-xs ${mutedTextClassName}`}>
        Source: California Department of Transportation road condition feed.
      </p>
    </section>
  )
}
