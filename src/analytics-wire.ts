/** 模型分析的只读契约；只传数字和模型能力，不传会话正文、标题、路径或密钥。 */
import type { InvocationDescriptor, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import { makeBoundaryValidator, makeRemoteDescriptor, makeStrictCodec, REMOTE_PACKAGE } from './wire-shared.ts'
import type { CostTokens } from './cost-facts.ts'

export type AnalyticsQuery = { mode: 'recent'; limit: number } | { mode: 'range'; from: number; to: number }
export interface AnalyticsMetrics {
  sessions: number; requests: number; completed: number; failed: number; cancelled: number; unknown: number; retries: number
  usageSamples: number; pricedRequests: number; cost: number; tokens: CostTokens
  latencySamples: number; latencyMs: number; ttftSamples: number; ttftMs: number; decodeSamples: number; decodeMs: number; decodeTokens: number
}
export interface AnalyticsModel extends AnalyticsMetrics { id: string }
export interface AnalyticsScenario {
  id: string; name: string; contextWindow: number | null; images: boolean; efforts: string[]
  cost: number; pricedRequests: number; excludedRequests: number; unknownRequests: number
}
export interface AnalyticsReport {
  generatedAt: number; pricingKey: number; query: AnalyticsQuery
  status: 'ready' | 'unavailable'
  scannedSessions: number; matchedSessions: number; unreadableSessions: number; skippedSessions: number; truncated: boolean; catalogUnavailable: boolean
  totals: AnalyticsMetrics; models: AnalyticsModel[]; scenarios: AnalyticsScenario[]
  monthlyEstimate: number | null
}
const g = makeBoundaryValidator('commandcode/analytics')
const nonnegative = (s: Record<string, unknown>, k: string): number => {
  const n = g.numberField(s, k, k)
  return n >= 0 ? n : g.reject(k)
}
const count = (s: Record<string, unknown>, k: string): number => {
  const n = nonnegative(s, k)
  return Number.isSafeInteger(n) ? n : g.reject(k)
}
export function parseAnalyticsQuery(value: unknown): AnalyticsQuery {
  const s = g.record(value, 'query')
  if (s.mode === 'recent') {
    const limit = count(s, 'limit')
    if (limit < 1 || limit > 100) return g.reject('limit')
    return { mode: 'recent', limit }
  }
  if (s.mode !== 'range') return g.reject('mode')
  const from = count(s, 'from'), to = count(s, 'to')
  if (to <= from || to - from > 366 * 86400000 || to > 8640000000000000) return g.reject('range')
  return { mode: 'range', from, to }
}
const counts = ['sessions', 'requests', 'completed', 'failed', 'cancelled', 'unknown', 'retries', 'usageSamples', 'pricedRequests', 'latencySamples', 'ttftSamples', 'decodeSamples'] as const
const quantities = ['cost', 'latencyMs', 'ttftMs', 'decodeMs', 'decodeTokens'] as const
const tokenKeys = ['uncachedInputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens'] as const
function metrics(value: unknown): AnalyticsMetrics {
  const s = g.record(value, 'metrics'), result = {} as AnalyticsMetrics
  for (const k of counts) result[k] = count(s, k)
  for (const k of quantities) result[k] = nonnegative(s, k)
  const tokens = g.record(s.tokens, 'tokens')
  result.tokens = Object.fromEntries(tokenKeys.map(k => [k, nonnegative(tokens, k)])) as unknown as CostTokens
  if (result.completed + result.failed + result.cancelled + result.unknown !== result.requests
    || result.pricedRequests > result.usageSamples || result.usageSamples > result.requests
    || result.retries > result.requests || result.ttftSamples > result.requests || result.latencySamples > result.requests || result.decodeSamples > result.requests) return g.reject('coverage')
  return result
}
const nullable = (s: Record<string, unknown>, k: string): number | null => s[k] === null ? null : nonnegative(s, k)
export function parseAnalyticsReport(value: unknown): AnalyticsReport {
  const s = g.record(value, 'report')
  if (s.status !== 'ready' && s.status !== 'unavailable') return g.reject('status')
  if (!Array.isArray(s.models) || !Array.isArray(s.scenarios) || s.models.length > 1000 || s.scenarios.length > 1000) return g.reject('models')
  return {
    generatedAt: count(s, 'generatedAt'), pricingKey: count(s, 'pricingKey'), query: parseAnalyticsQuery(s.query), status: s.status,
    scannedSessions: count(s, 'scannedSessions'), matchedSessions: count(s, 'matchedSessions'), unreadableSessions: count(s, 'unreadableSessions'), skippedSessions: count(s, 'skippedSessions'),
    truncated: g.booleanField(s, 'truncated', 'truncated'), catalogUnavailable: g.booleanField(s, 'catalogUnavailable', 'catalogUnavailable'),
    totals: metrics(s.totals), monthlyEstimate: nullable(s, 'monthlyEstimate'),
    models: s.models.map(value => { const m = g.record(value, 'model'); return { ...metrics(m), id: g.stringField(m, 'id', 'id') } }),
    scenarios: s.scenarios.map(value => {
      const m = g.record(value, 'scenario')
      if (!Array.isArray(m.efforts) || !m.efforts.every(v => typeof v === 'string')) return g.reject('efforts')
      return { id: g.stringField(m, 'id', 'id'), name: g.stringField(m, 'name', 'name'), contextWindow: nullable(m, 'contextWindow'), images: g.booleanField(m, 'images', 'images'), efforts: m.efforts as string[], cost: nonnegative(m, 'cost'), pricedRequests: count(m, 'pricedRequests'), excludedRequests: count(m, 'excludedRequests'), unknownRequests: count(m, 'unknownRequests') }
    }),
  }
}
export const ANALYTICS_DESCRIPTOR: InvocationDescriptor = {
  ...makeRemoteDescriptor('commandcode/analytics', 'analytics', `${REMOTE_PACKAGE}#AnalyticsReport`, { parse: parseAnalyticsReport }),
  parameters: [{ name: 'query', wire: 'query', source: 'json' as const, codec: makeStrictCodec(`${REMOTE_PACKAGE}#AnalyticsQuery`, { parse: parseAnalyticsQuery }) }],
}
export const ANALYTICS_REMOTE_CONTRIBUTION: TypertRemoteContribution = { package: REMOTE_PACKAGE, descriptors: [ANALYTICS_DESCRIPTOR] }
