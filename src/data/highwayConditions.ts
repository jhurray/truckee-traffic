import type {
  HighwayAlert,
  HighwayAlertSeverity,
  HighwayConditionsSnapshot,
  HighwayRouteCondition,
  HighwayRouteStatus,
} from '../types/highway'

type RouteMeta = {
  routeNumber: '80' | '50'
  routeLabel: 'I-80' | 'US-50'
  corridorLabel: string
}

const routes: RouteMeta[] = [
  {
    routeNumber: '80',
    routeLabel: 'I-80',
    corridorLabel: 'Bay Area to Tahoe / Reno',
  },
  {
    routeNumber: '50',
    routeLabel: 'US-50',
    corridorLabel: 'Sacramento / Bay Area to Tahoe',
  },
]

const noRestrictionPattern = /\bno traffic restrictions are reported\b/i
const closurePattern = /\b(is|are)?\s*closed\b|\bclosure\b/i
const restrictionPattern =
  /\bchains are required\b|\bchain control\b|\bmust have.*chains\b|\bpermit loads are prohibited\b|\bbeing screened\b|\brestrictions?\b|\brequired to stop\b/i

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function stripOrdinalSuffixFromDay(value: string) {
  return value.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
}

function getSeverity(message: string): HighwayAlertSeverity | null {
  if (noRestrictionPattern.test(message)) {
    return null
  }

  if (closurePattern.test(message)) {
    return 'closure'
  }

  if (restrictionPattern.test(message)) {
    return 'restriction'
  }

  return null
}

function getDirection(message: string): HighwayAlert['direction'] {
  const hasEastbound = /\beastbound\b/i.test(message)
  const hasWestbound = /\bwestbound\b/i.test(message)

  if (hasEastbound && hasWestbound) {
    return 'both'
  }

  if (hasEastbound) {
    return 'eastbound'
  }

  if (hasWestbound) {
    return 'westbound'
  }

  return null
}

function getLocation(message: string): string | null {
  const fromToMatch = message.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?:\s+-|$)/i)
  if (fromToMatch) {
    return normalizeWhitespace(`from ${fromToMatch[1]} to ${fromToMatch[2]}`)
  }

  const atMatch = message.match(/\bat\s+(.+?)(?:\s+-|$)/i)
  if (atMatch) {
    return normalizeWhitespace(`at ${atMatch[1]}`)
  }

  const inMatch = message.match(/\bin\s+(.+?)(?:\s+-|$)/i)
  if (inMatch) {
    const location = normalizeWhitespace(`in ${inMatch[1]}`)
    if (location.length <= 120) {
      return location
    }
  }

  return null
}

function getStatusFromAlerts(alerts: HighwayAlert[]): HighwayRouteStatus {
  if (alerts.some((alert) => alert.severity === 'closure')) {
    return 'closed'
  }

  if (alerts.some((alert) => alert.severity === 'restriction')) {
    return 'restricted'
  }

  return 'open'
}

function parseReportedAt(document: Document) {
  const emNodes = Array.from(document.querySelectorAll('em'))
  const reportNode = emNodes.find((node) =>
    /latest reported as of/i.test(node.textContent ?? ''),
  )
  if (!reportNode) {
    return null
  }

  const reportText = normalizeWhitespace(reportNode.textContent ?? '')
  const match = reportText.match(/latest reported as of\s+(.+?)\./i)
  if (!match) {
    return null
  }

  return stripOrdinalSuffixFromDay(match[1])
}

function parseSectionAndMessage(text: string) {
  const sectionMatch = text.match(/^\[([^\]]+)\]\s*(.*)$/)
  if (!sectionMatch) {
    return {
      section: null,
      message: text,
    }
  }

  return {
    section: normalizeWhitespace(sectionMatch[1]),
    message: normalizeWhitespace(sectionMatch[2]),
  }
}

function parseRoadAlerts(document: Document, routeNumber: '80' | '50') {
  const headings = Array.from(document.querySelectorAll('h3'))
  const heading = headings.find((candidate) =>
    candidate.textContent?.toLowerCase().includes(routeNumber),
  )
  if (!heading) {
    return []
  }

  const alerts: HighwayAlert[] = []
  const seenMessages = new Set<string>()
  let currentNode: Element | null = heading.nextElementSibling
  let alertCounter = 0

  while (currentNode && currentNode.tagName.toLowerCase() !== 'hr') {
    if (currentNode.tagName.toLowerCase() === 'p') {
      const text = normalizeWhitespace(currentNode.textContent ?? '')
      if (text.length > 0) {
        const { section, message } = parseSectionAndMessage(text)
        const severity = getSeverity(message)
        const dedupeKey = message.toLowerCase()
        if (severity && !seenMessages.has(dedupeKey)) {
          seenMessages.add(dedupeKey)
          alertCounter += 1
          alerts.push({
            id: `${routeNumber}-${alertCounter}`,
            severity,
            message,
            section,
            direction: getDirection(message),
            location: getLocation(message),
          })
        }
      }
    }

    currentNode = currentNode.nextElementSibling
  }

  return alerts
}

function parseRouteCondition(meta: RouteMeta, html: string): HighwayRouteCondition {
  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')
  const alerts = parseRoadAlerts(document, meta.routeNumber)

  return {
    routeNumber: meta.routeNumber,
    routeLabel: meta.routeLabel,
    corridorLabel: meta.corridorLabel,
    sourceUrl: `https://roads.dot.ca.gov/roadscell.php?roadnumber=${meta.routeNumber}`,
    reportedAt: parseReportedAt(document),
    status: getStatusFromAlerts(alerts),
    alerts,
    fetchError: null,
  }
}

function createFailedRoute(meta: RouteMeta, error: unknown): HighwayRouteCondition {
  return {
    routeNumber: meta.routeNumber,
    routeLabel: meta.routeLabel,
    corridorLabel: meta.corridorLabel,
    sourceUrl: `https://roads.dot.ca.gov/roadscell.php?roadnumber=${meta.routeNumber}`,
    reportedAt: null,
    status: 'unknown',
    alerts: [],
    fetchError: error instanceof Error ? error.message : 'Unknown error',
  }
}

export async function fetchHighwayConditions(
  options?: {
    signal?: AbortSignal
  },
): Promise<HighwayConditionsSnapshot> {
  const routeResults = await Promise.all(
    routes.map(async (routeMeta) => {
      try {
        const response = await fetch(
          `/api/caltrans/roadscell.php?roadnumber=${routeMeta.routeNumber}`,
          {
            signal: options?.signal,
            cache: 'no-store',
          },
        )
        if (!response.ok) {
          throw new Error(`Caltrans request failed: ${response.status}`)
        }

        const html = await response.text()
        return parseRouteCondition(routeMeta, html)
      } catch (error: unknown) {
        return createFailedRoute(routeMeta, error)
      }
    }),
  )

  return {
    fetchedAt: new Date().toISOString(),
    routes: routeResults,
  }
}
