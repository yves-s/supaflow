export type ListMap = Record<string, string>

export function buildListMap(fetchSubscriptionsOutput: unknown): ListMap {
  if (!Array.isArray(fetchSubscriptionsOutput)) return {}
  const map: ListMap = {}
  for (const item of fetchSubscriptionsOutput) {
    if (item && typeof item === 'object' && 'id' in item && 'name' in item) {
      map[String(item.id)] = String(item.name)
    }
  }
  return map
}

export function resolveStepName(stepName: string, listMap: ListMap): string {
  const match = stepName.match(/^unsubscribe:(\d+)$/)
  if (match) return `${listMap[match[1]] ?? match[1]} abmelden`
  if (stepName === 'fetch_subscriptions') return 'Subscriptions abrufen'
  return stepName
}
