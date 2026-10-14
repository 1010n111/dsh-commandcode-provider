/** Durable cost facts: mirrors token-meter's replacement/retry rules across v1/v2 logs. */
import type { Context } from '@deepseek-ai/cordis'
import { modelPriceTable } from './model-prices.ts'
import { COST_TOKEN_KEYS, costGroupKey, pricingKey, zeroCostTokens, type CostTokens, type CostUsageGroup, type SessionCostFacts } from './cost-facts.ts'
import { isRecord } from './wire-guards.ts'

interface CostState {
  selection: { provider: string; model: string } | null
  at: number | null
  last: { turn: number; step: number; group: CostUsageGroup } | null
  facts: SessionCostFacts
}
interface LogEvent { type: string; time: number; data: unknown }
const record = (v: unknown): Record<string, unknown> | undefined => isRecord(v) ? v : undefined
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0

function tokensOf(value: unknown): CostTokens | undefined {
  const u = record(value)
  if (!u || !finite(u.inputTokens) || !finite(u.outputTokens)) return undefined
  if (u.cacheReadTokens !== undefined && !finite(u.cacheReadTokens) || u.cacheWriteTokens !== undefined && !finite(u.cacheWriteTokens)) return undefined
  return { uncachedInputTokens: u.inputTokens, outputTokens: u.outputTokens, cacheReadTokens: u.cacheReadTokens as number ?? 0, cacheWriteTokens: u.cacheWriteTokens as number ?? 0 }
}

/** The four buckets of an already-parsed record, or undefined when one is missing. */
function costTokensOf(value: unknown): CostTokens | undefined {
  const t = record(value)
  if (!t || !COST_TOKEN_KEYS.every(k => finite(t[k]))) return undefined
  return t as unknown as CostTokens
}

/** Current v2 settlements store the last usage in their stream; v1 stores chunk events. */
function usageOf(type: string, data: Record<string, unknown>): CostTokens | undefined {
  if (type === 'assistant/chunk') {
    const chunk = record(data.chunk)
    return chunk?.type === 'usage' ? tokensOf(chunk.usage) : undefined
  }
  if (type !== 'assistant/message' && type !== 'assistant/attempt') return undefined
  const direct = tokensOf(data.usage)
  if (direct !== undefined) return direct
  if (!Array.isArray(data.stream)) return undefined
  for (let i = data.stream.length - 1; i >= 0; i--) {
    const item = record(data.stream[i])
    const chunk = item?.type === 'chunk' ? record(item.chunk) : undefined
    if (chunk?.type === 'usage') return tokensOf(chunk.usage)
  }
  return undefined
}

function parseState(value: unknown): CostState {
  const s = record(value), facts = record(s?.facts)
  if (!s || !facts || !finite(facts.pricingKey) || !Array.isArray(facts.groups)) throw new TypeError('invalid commandCodeCost state')
  const group = (v: unknown): boolean => {
    const g = record(v)
    return !!g && typeof g.provider === 'string' && typeof g.model === 'string'
      && (g.at === null || finite(g.at)) && finite(g.contextTokens) && costTokensOf(g.tokens) !== undefined
  }
  const sel = record(s.selection), last = record(s.last)
  // `summaryTokens` arrived with the compaction-summary fold. State written
  // before it carries no such key, so backfill zero instead of rejecting:
  // refusing would make every already-persisted session lose its readout on
  // upgrade. A present-but-malformed value is still an error.
  const summaryTokens = facts.summaryTokens === undefined ? zeroCostTokens() : costTokensOf(facts.summaryTokens)
  if (summaryTokens === undefined
    || !(s.selection === null || sel && typeof sel.provider === 'string' && typeof sel.model === 'string')
    || !(s.at === null || finite(s.at)) || !facts.groups.every(group)
    || !(s.last === null || last && finite(last.turn) && finite(last.step) && group(last.group))) throw new TypeError('invalid commandCodeCost state')
  return { ...(value as CostState), facts: { ...(facts as unknown as SessionCostFacts), summaryTokens } }
}

/** Optional registry uses only synchronous parse/view; no new runtime module is required. */
export function createCostProjection(table = modelPriceTable()) {
  const version = pricingKey(table)
  /** Groups that still carry tokens; a retry that replaced a group can drive one to zero. */
  const liveGroups = (groups: CostUsageGroup[]): CostUsageGroup[] =>
    groups.filter(g => COST_TOKEN_KEYS.some(k => g.tokens[k] > 0))
  /**
   * Fold one settled usage group into `groups`, first undoing the group a retry
   * supersedes. Shared by turn/step settlements and summary calls, which have
   * no turn/step of their own.
   */
  const foldGroup = (groups: CostUsageGroup[], previous: CostUsageGroup | undefined, group: CostUsageGroup, tokens: CostTokens): void => {
    // One pass over the groups replaces the two linear `find` scans; the
    // first index wins, matching `find` on duplicate keys.
    const byKey = new Map<string, number>()
    groups.forEach((g, i) => { const key = costGroupKey(g, table); if (!byKey.has(key)) byKey.set(key, i) })
    if (previous) {
      const old = byKey.get(costGroupKey(previous, table))
      if (old !== undefined) for (const k of COST_TOKEN_KEYS) groups[old]!.tokens[k] -= previous.tokens[k]
    }
    const targetIdx = byKey.get(costGroupKey(group, table))
    let target = targetIdx === undefined ? undefined : groups[targetIdx]
    if (!target) { target = { ...group, tokens: zeroCostTokens() }; groups.push(target) }
    for (const k of COST_TOKEN_KEYS) target.tokens[k] += tokens[k]
  }
  return {
    key: 'commandCodeCost', stateVersion: version,
    stateSchema: { parse: parseState },
    init: (): CostState => ({ selection: null, at: null, last: null, facts: { pricingKey: version, groups: [], summaryTokens: zeroCostTokens() } }),
    apply(state: CostState, event: LogEvent): CostState {
      const data = record(event.data)
      if (!data) return state
      if (event.type === 'request/header') {
        const config = record(record(data.header)?.config)
        return { ...state, selection: config && typeof config.provider === 'string' && typeof config.model === 'string' ? { provider: config.provider, model: config.model } : null }
      }
      if (event.type === 'step/start' || event.type === 'llm/retry-started') return { ...state, at: finite(event.time) ? event.time : null, last: null }
      // A compaction summary is the compactor's own `ctx.llm.stream()` call. It
      // is real spend, but it settles on no turn/step and emits none of the
      // `assistant/*` events the harness meter folds, so its usage exists only
      // here. Price it into `groups` AND count it in `summaryTokens`: the
      // readout subtracts the latter before checking that this projection and
      // `tokenUsage` still describe the same durable cut.
      if (event.type === 'compaction/summary') {
        const summary = tokensOf(data.usage)
        if (summary === undefined) return state
        const group: CostUsageGroup = {
          provider: typeof data.provider === 'string' ? data.provider : '',
          model: typeof data.model === 'string' ? data.model : '',
          at: finite(event.time) ? event.time : null,
          contextTokens: summary.uncachedInputTokens + summary.cacheReadTokens + summary.cacheWriteTokens,
          tokens: summary,
        }
        const groups = state.facts.groups.map(g => ({ ...g, tokens: { ...g.tokens } }))
        foldGroup(groups, undefined, group, summary)
        const summaryTokens = { ...state.facts.summaryTokens }
        for (const k of COST_TOKEN_KEYS) summaryTokens[k] += summary[k]
        return { ...state, facts: { pricingKey: version, groups: liveGroups(groups), summaryTokens } }
      }
      const tokens = usageOf(event.type, data)
      if (tokens === undefined || !finite(data.turn) || !finite(data.step)) return state
      const previous = state.last?.turn === data.turn && state.last.step === data.step ? state.last.group : undefined
      const group: CostUsageGroup = { provider: state.selection?.provider ?? '', model: state.selection?.model ?? '', at: state.at, contextTokens: tokens.uncachedInputTokens + tokens.cacheReadTokens + tokens.cacheWriteTokens, tokens }
      if (previous && JSON.stringify(previous) === JSON.stringify(group)) return state
      const groups = state.facts.groups.map(g => ({ ...g, tokens: { ...g.tokens } }))
      foldGroup(groups, previous, group, tokens)
      return { ...state, last: { turn: data.turn, step: data.step, group }, facts: { pricingKey: version, groups: liveGroups(groups), summaryTokens: state.facts.summaryTokens } }
    },
    wire: {
      view: (state: CostState) => state.facts,
      viewSchema: { parse(value: unknown): SessionCostFacts { return parseState({ selection: null, at: null, last: null, facts: value }).facts } },
    },
  }
}

export function installCostProjection(ctx: Context): void {
  ctx.inject(['sessionProjections'], c => {
    const registry = c.get('sessionProjections') as { register(definition: ReturnType<typeof createCostProjection>): () => void } | undefined
    if (typeof registry?.register === 'function') c.effect(() => registry.register(createCostProjection()), 'commandcode cost projection')
  })
}
