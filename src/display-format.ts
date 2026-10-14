/** Shared, dependency-free formatting for Host commands and browser surfaces. */

export function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`
}

export function formatMoneyExact(value: number): string {
  return `$${value.toFixed(4)}`
}

export function formatTokensCompact(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return String(value)
}

/** The input is already in percent units; callers add the percent sign. */
export function formatSuccessRate(value: number): string {
  return String(Number(value.toFixed(2)))
}

/** One window's fill ratio in [0, 1]; zero when uncapped. */
export function windowRatio(used: number, cap: number): number {
  if (cap <= 0) return 0
  return Math.max(0, Math.min(1, used / cap))
}

/** Local date-time, with the empty state chosen by the caller. */
export function formatResetAt(ms: number): string {
  return ms <= 0 ? '' : new Date(ms).toLocaleString()
}

/** 只有官方汇总与订阅共同确认同一起点，才展示完整账期；旧宿主和部分响应保持未知。 */
export function formatUsageBillingPeriod(usageStart: number | undefined, planStart: number | undefined, planEnd: number | undefined): string {
  if (usageStart === undefined || planStart !== usageStart || planEnd === undefined || usageStart <= 0 || planEnd <= usageStart) return ''
  const start = new Date(usageStart)
  const end = new Date(planEnd)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return ''
  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`
}
