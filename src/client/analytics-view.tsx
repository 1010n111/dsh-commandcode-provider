/** 只展示数字快照；筛选提交后才查询，页签、展开与模型筛选不触发历史读取。 */
import { useEffect, useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { AnalyticsMetrics, AnalyticsQuery, AnalyticsScenario } from '../analytics-wire.ts'
import { parseAnalyticsQuery } from '../analytics-wire.ts'
import type { AnalyticsState } from './analytics.ts'
import type { AnalyticsKey } from './analytics-copy.ts'

export interface AnalyticsViewProps {
  useCommandCodeAnalytics<T>(selector: (state: AnalyticsState) => T): T
  refreshAnalytics(query?: AnalyticsQuery): void
  text(key: AnalyticsKey): string
}
type Text = AnalyticsViewProps['text']
function localDate(time: number): string {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** 日期按用户本地日历展开为半开区间；截止日包括当日全部时间，夏令时不固定加 24 小时。 */
export function dateRange(from: string, to: string): AnalyticsQuery {
  const start = new Date(`${from}T00:00:00`), end = new Date(`${to}T00:00:00`)
  if (localDate(start.getTime()) !== from || localDate(end.getTime()) !== to) throw new TypeError('无效日期')
  end.setDate(end.getDate() + 1)
  return parseAnalyticsQuery({ mode: 'range', from: start.getTime(), to: end.getTime() })
}
const money = (n: number) => `$${n.toFixed(4)}`
const digits = (n: number) => n.toLocaleString()
const meanSeconds = (ms: number, samples: number, text: Text) => samples ? `${(ms / samples / 1000).toFixed(2)} ${text('analysisSeconds')}` : text('analysisMissing')
const speed = (m: AnalyticsMetrics, text: Text) => m.decodeSamples && m.decodeMs ? `${(m.decodeTokens * 1000 / m.decodeMs).toFixed(1)} ${text('analysisSpeedUnit')}` : text('analysisMissing')
function effortName(effort: string, text: Text): string {
  const keys: Record<string, AnalyticsKey> = { none: 'effortNone', low: 'effortLow', medium: 'effortMedium', high: 'effortHigh', xhigh: 'effortXhigh', max: 'effortMax' }
  return keys[effort] ? text(keys[effort]!) : effort
}
function Chevron() {
  return <svg className="ccp-analysisChevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
}
function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <span className="ccp-analysisMetric"><span className="ccp-analysisLabel">{label}</span><span className="ccp-analysisValue">{value}</span>{sub ? <span className="ccp-analysisSub">{sub}</span> : null}</span>
}
function DetailGroup({ title, values, text }: { title: AnalyticsKey; values: Array<[AnalyticsKey, string]>; text: Text }) {
  return <div className="ccp-analysisDetailGroup"><h4 className="ccp-analysisDetailTitle">{text(title)}</h4><dl className="ccp-analysisFacts">{values.map(([key, value]) => <div className="ccp-analysisFact" key={key}><dt className="ccp-analysisLabel">{text(key)}</dt><dd className="ccp-analysisFactValue">{value}</dd></div>)}</dl></div>
}
/** 样本为零时词元仍为未知；汇总和单模型复用相同口径，展开只改变展示。 */
function MetricsDetails({ m, text }: { m: AnalyticsMetrics; text: Text }) {
  const tokens = m.tokens, tokenValue = (n: number) => m.usageSamples ? digits(n) : text('analysisMissing')
  return <div className="ccp-analysisDetails">
    <DetailGroup title="analysisTokens" text={text} values={[
      ['analysisInput', tokenValue(tokens.uncachedInputTokens)], ['analysisOutput', tokenValue(tokens.outputTokens)],
      ['analysisCacheRead', tokenValue(tokens.cacheReadTokens)], ['analysisCacheWrite', tokenValue(tokens.cacheWriteTokens)],
    ]} />
    <DetailGroup title="analysisOutcome" text={text} values={[
      ['analysisCompleted', digits(m.completed)], ['analysisFailed', digits(m.failed)], ['analysisRetries', digits(m.retries)],
      ['analysisCancelled', digits(m.cancelled)], ['analysisUnknown', digits(m.unknown)],
    ]} />
    <DetailGroup title="analysisSamples" text={text} values={[
      ['analysisUsageSamples', digits(m.usageSamples)], ['analysisPriced', digits(m.pricedRequests)], ['analysisTimed', digits(m.latencySamples)],
      ['analysisFirstTokenSamples', digits(m.ttftSamples)], ['analysisDecodeSamples', digits(m.decodeSamples)],
    ]} />
    <DetailGroup title="analysisSessionCost" text={text} values={[
      ['analysisSessionCount', digits(m.sessions)], ['analysisRequests', digits(m.requests)],
      ['analysisAverage', m.sessions && m.pricedRequests ? money(m.cost / m.sessions) : text('analysisMissing')], ['analysisSpeed', speed(m, text)],
    ]} />
  </div>
}
function ModelRow({ m, text }: { m: AnalyticsMetrics & { id: string }; text: Text }) {
  return <details className="ccp-analysisModelRow"><summary className="ccp-analysisModelSummary">
    <span className="ccp-analysisIdentity"><span className="ccp-analysisModelName">{m.id}</span><span className="ccp-analysisSub">{text('analysisRequests')} {digits(m.requests)} · {text('analysisSessionCount')} {digits(m.sessions)}</span></span>
    <Metric label={text('analysisCost')} value={m.pricedRequests ? money(m.cost) : text('analysisMissing')} sub={`${text('analysisPriced')} ${m.pricedRequests}/${m.requests}`} />
    <Metric label={text('analysisResponse')} value={meanSeconds(m.latencyMs, m.latencySamples, text)} />
    <Metric label={text('analysisFirstToken')} value={meanSeconds(m.ttftMs, m.ttftSamples, text)} />
    <Metric label={text('analysisSpeed')} value={speed(m, text)} />
    <Chevron />
  </summary><MetricsDetails m={m} text={text} /></details>
}
function ScenarioRow({ m, text }: { m: AnalyticsScenario; text: Text }) {
  return <details className="ccp-analysisModelRow"><summary className="ccp-analysisScenarioSummary">
    <span className="ccp-analysisIdentity"><span className="ccp-analysisModelName">{m.name}</span><span className="ccp-analysisSub">{m.id}</span></span>
    <Metric label={text('analysisCost')} value={m.pricedRequests ? money(m.cost) : text('analysisMissing')} sub={`${text('analysisPriced')} ${m.pricedRequests}/${m.pricedRequests + m.excludedRequests + m.unknownRequests}`} />
    <Metric label={text('analysisContext')} value={m.contextWindow === null ? text('analysisMissing') : digits(m.contextWindow)} />
    <span className="ccp-analysisCapability">{text(m.images ? 'analysisImages' : 'analysisTextOnly')}</span><Chevron />
  </summary><div className="ccp-analysisDetails ccp-analysisScenarioDetails">
    <DetailGroup title="analysisSamples" text={text} values={[
      ['analysisPriced', digits(m.pricedRequests)], ['analysisExcluded', digits(m.excludedRequests)], ['analysisUnknownPrice', digits(m.unknownRequests)],
    ]} />
    <DetailGroup title="analysisCapabilities" text={text} values={[
      ['analysisEfforts', m.efforts.length ? m.efforts.map(e => effortName(e, text)).join(', ') : text('analysisNoEfforts')],
    ]} />
  </div></details>
}
export function AnalyticsView(props: AnalyticsViewProps) {
  const { text } = props, state = props.useCommandCodeAnalytics(s => s), report = state.report
  const [mode, setMode] = useState<'recent' | 'range'>(report?.query.mode ?? 'recent')
  const [limit, setLimit] = useState(report?.query.mode === 'recent' ? String(report.query.limit) : '20')
  const [from, setFrom] = useState(localDate(report?.query.mode === 'range' ? report.query.from : Date.now() - 29 * 86400000))
  const [to, setTo] = useState(localDate(report?.query.mode === 'range' ? report.query.to - 1 : Date.now()))
  const [invalid, setInvalid] = useState(false), [filter, setFilter] = useState('')
  const [page, setPage] = useState<'history' | 'simulation'>('history'), id = useId()
  const refresh = props.refreshAnalytics
  useEffect(() => { if (state.status === 'idle') refresh() }, [state.status, refresh])
  const busy = state.status === 'loading'
  const apply = () => {
    try {
      const query = mode === 'recent' ? parseAnalyticsQuery({ mode, limit: Number(limit) }) : dateRange(from, to)
      setInvalid(false); refresh(query)
    } catch { setInvalid(true) }
  }
  // 页签遵循键盘导航；只切换本地展示，不重读会话或丢弃筛选草稿。
  const navigateTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 'history' : event.key === 'End' ? 'simulation' : page === 'history' ? 'simulation' : 'history'
    setPage(next)
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-page="${next}"]`)?.focus()
  }
  const scenarios = report?.scenarios.filter(m => `${m.id} ${m.name}`.toLowerCase().includes(filter.trim().toLowerCase())) ?? []
  const m = report?.totals
  return <section className="ccp-analysis" aria-label={text('analyticsNav')} aria-busy={busy}>
    <form className="ccp-analysisFilters" noValidate onSubmit={e => { e.preventDefault(); if (!busy) apply() }}>
      <label className="ccp-analysisField ccp-analysisScopeField">{text('analysisScope')}<span className="ccp-analysisSelectShell"><select className="ccp-analysisInput ccp-analysisSelect" value={mode} disabled={busy} onChange={e => setMode(e.target.value as 'recent' | 'range')}><option value="recent">{text('analysisRecent')}</option><option value="range">{text('analysisRange')}</option></select><Chevron /></span></label>
      {mode === 'recent' ? <label className="ccp-analysisField">{text('analysisLimit')}<input className="ccp-analysisInput" type="number" min="1" max="100" required value={limit} disabled={busy} onChange={e => setLimit(e.target.value)} /></label> : <>
        <label className="ccp-analysisField">{text('analysisFrom')}<input className="ccp-analysisInput" type="date" required value={from} disabled={busy} onChange={e => setFrom(e.target.value)} /></label>
        <label className="ccp-analysisField">{text('analysisTo')}<input className="ccp-analysisInput" type="date" required value={to} disabled={busy} onChange={e => setTo(e.target.value)} /></label>
      </>}
      <button className="ccp-analysisApply" type="submit" disabled={busy}>{text('analysisApply')}</button>
    </form>
    {invalid ? <p className="ccp-analysisMessage ccp-analysisError" role="alert">{text('analysisInvalid')}</p> : null}
    {busy ? <p className="ccp-analysisMessage" role="status">{text('analysisLoading')}</p> : null}
    {state.error ? <p className="ccp-analysisMessage ccp-analysisError" role="alert">{state.error}</p> : null}
    {report?.status === 'unavailable' ? <p className="ccp-analysisMessage" role="status">{text('analysisUnavailable')}</p> : null}
    {report?.status === 'ready' && m ? <>
      <div className="ccp-analysisScope"><span>{text('analysisScope')}: {report.query.mode === 'recent' ? `${text('analysisRecent')} ${report.query.limit}` : `${localDate(report.query.from)} — ${localDate(report.query.to - 1)}`}</span><span>{text('analysisScanned')} {report.scannedSessions} · {text('analysisMatched')} {report.matchedSessions} · {text('analysisUnreadable')} {report.unreadableSessions} · {text('analysisSkipped')} {report.skippedSessions}</span></div>
      <div className="ccp-analysisOverview" role="group" aria-label={text('analysisOverview')}>
        <Metric label={text('analysisCost')} value={m.pricedRequests ? money(m.cost) : text('analysisMissing')} sub={`${text('analysisPriced')} ${m.pricedRequests}/${m.requests}`} />
        <Metric label={text('analysisRequests')} value={digits(m.requests)} sub={`${text('analysisSessionCount')} ${digits(m.sessions)}`} />
        <Metric label={text('analysisResponse')} value={meanSeconds(m.latencyMs, m.latencySamples, text)} sub={`${text('analysisTimed')} ${digits(m.latencySamples)}`} />
        <Metric label={text('analysisFirstToken')} value={meanSeconds(m.ttftMs, m.ttftSamples, text)} sub={`${text('analysisFirstTokenSamples')} ${digits(m.ttftSamples)}`} />
      </div>
      <p className="ccp-analysisNote">{text('analysisShortBasis')}</p>
      {report.truncated || report.unreadableSessions > 0 || report.skippedSessions > 0 ? <p className="ccp-analysisMessage ccp-analysisWarning" role="status">{text('analysisPartial')}</p> : null}
      {m.pricedRequests < m.requests ? <p className="ccp-analysisMessage ccp-analysisWarning" role="status">{text('analysisUnpriced')}</p> : null}
      <div className="ccp-analysisTabs" role="tablist" aria-label={text('analysisSections')} onKeyDown={navigateTab}>
        {(['history', 'simulation'] as const).map(tab => <button className="ccp-analysisTab" key={tab} id={`${id}-${tab}-tab`} data-page={tab} type="button" role="tab" aria-selected={page === tab} aria-controls={`${id}-${tab}`} tabIndex={page === tab ? 0 : -1} onClick={() => setPage(tab)}>{text(tab === 'history' ? 'analysisHistory' : 'analysisSimulation')}</button>)}
      </div>
      <section className="ccp-analysisPanel" id={`${id}-history`} role="tabpanel" aria-labelledby={`${id}-history-tab`} tabIndex={0} hidden={page !== 'history'}>
        <div className="ccp-analysisSectionHead"><h3 className="ccp-analysisHeading">{text('analysisByModel')}</h3><p className="ccp-analysisNote">{text('analysisModelHint')}</p></div>
        {m.requests === 0 ? <p className="ccp-analysisEmpty">{text('analysisEmpty')}</p> : <div className="ccp-analysisModels">{report.models.map(model => <ModelRow key={model.id} m={model} text={text} />)}</div>}
        <details className="ccp-analysisAggregate"><summary className="ccp-analysisDisclosure"><Chevron />{text('analysisDetails')}</summary><MetricsDetails m={m} text={text} /></details>
        <div className="ccp-analysisMonthly"><span>{text('analysisMonthly')}</span><strong className="ccp-analysisMonthlyValue">{report.monthlyEstimate === null || report.truncated || report.unreadableSessions || report.skippedSessions ? text('analysisMissing') : money(report.monthlyEstimate)}</strong><p className="ccp-analysisNote">{text('analysisMonthlyHint')}</p></div>
      </section>
      <section className="ccp-analysisPanel" id={`${id}-simulation`} role="tabpanel" aria-labelledby={`${id}-simulation-tab`} tabIndex={0} hidden={page !== 'simulation'}>
        <p className="ccp-analysisAssumption">{text('analysisAssumption')}</p>
        {report.catalogUnavailable ? <p className="ccp-analysisMessage ccp-analysisWarning" role="status">{text('analysisCatalog')}</p> : null}
        <label className="ccp-analysisField ccp-analysisSearch">{text('analysisSearch')}<input className="ccp-analysisInput" type="search" placeholder={text('analysisSearchPlaceholder')} value={filter} onChange={e => setFilter(e.target.value)} /></label>
        {m.requests === 0 ? <p className="ccp-analysisEmpty">{text('analysisEmpty')}</p> : scenarios.length ? <div className="ccp-analysisModels">{scenarios.map(model => <ScenarioRow key={model.id} m={model} text={text} />)}</div> : !report.catalogUnavailable ? <p className="ccp-analysisEmpty" role="status">{text('analysisNoMatches')}</p> : null}
      </section>
      <details className="ccp-analysisRules"><summary className="ccp-analysisDisclosure"><Chevron />{text('analysisRules')}</summary><div className="ccp-analysisRulesBody"><p>{text('analysisBasis')}</p><p>{text('analysisCoverageHint')}</p></div></details>
    </> : null}
  </section>
}
