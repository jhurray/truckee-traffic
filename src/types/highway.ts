export type HighwayAlertSeverity = 'closure' | 'restriction'

export type HighwayRouteStatus = 'open' | 'restricted' | 'closed' | 'unknown'

export type HighwayAlert = {
  id: string
  severity: HighwayAlertSeverity
  message: string
  section: string | null
  direction: 'eastbound' | 'westbound' | 'both' | null
  location: string | null
}

export type HighwayRouteCondition = {
  routeNumber: '80' | '50'
  routeLabel: 'I-80' | 'US-50'
  corridorLabel: string
  sourceUrl: string
  reportedAt: string | null
  status: HighwayRouteStatus
  alerts: HighwayAlert[]
  fetchError: string | null
}

export type HighwayConditionsSnapshot = {
  fetchedAt: string
  routes: HighwayRouteCondition[]
}
