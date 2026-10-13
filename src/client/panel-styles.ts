/**
 * Stylesheet for the Command Code plans & quota panel (the sidebar footer card
 * and the dashboard it opens).
 *
 * Returned as a string, not injected here, so importing this module has no DOM
 * side effect: `./index.ts` installs it once under {@link PANEL_CSS_ID} and
 * removes it when the fiber unwinds.
 *
 * These rules are GLOBAL CSS, so containment is a contract (issue #48): every
 * selector is qualified by one of our own `ccp-` classes except the sidebar
 * anchor below, which carries its justification in place. `tests/styles.test.ts`
 * audits both stylesheets against the real foreign class stems. Colours are
 * harness theme aliases with neutral fallbacks; the `ccp-` prefix keeps these
 * clear of the settings page's `cc-` set.
 *
 * @module dsh-commandcode-provider/client/panel-styles
 */

/**
 * Stylesheet id — the `data-plugin-css` value that makes injection idempotent.
 *
 * The prefix must match this package's real name and the settings-page sheet's
 * (`PAGE_CSS_ID`); the two ids must also stay DISTINCT, since they key two
 * separate style tags and a shared id would make the second injection a no-op.
 */
export const PANEL_CSS_ID = '@mars-sea/dsh-commandcode-provider/CommandCodePanel.module.css'

/** The panel stylesheet. */
export const PANEL_CSS = `
/* ------------------------------------------------- sidebar footer card */
/* The shell renders this list ABOVE the Settings seat, so the card is the
   sidebar's bottom-most content, and supplies no chrome: the entry IS the
   button. Deliberately quiet — a surface beside Settings should read as part of
   the column — with one hover step and a hairline border.

   The shell's container is a flex ROW whose occupants each declare a full-width
   line and shrink-proof flex, so as a row it would overflow the column: this
   card cannot shrink and the neighbouring chip would absorb the overflow and
   collapse to nothing. The first rule is that fix, and THE ANCHOR IS
   LOAD-BEARING (issue #48): "footerActions" is not a stem this shell owns alone
   — dsh-client-ui-user-questions renders the ask-user-question dialog's button
   row as Mbwy4a_footerActions, and the unanchored rule stacked THAT row's
   side-by-side buttons on every page. "footArea" is declared by
   dsh-client-ui-sidebar alone (audited across every client bundle of the
   0.1.6-alpha.1 engine, and against our own cc-/ccp- names, which collide with
   no engine class). The DESCENDANT combinator survives a wrapper element
   appearing between the two, so a restructured shell degrades to its own row
   rather than losing the fix. tests/styles.test.ts pins both halves. */
[class*="_footArea"] [class*="_footerActions"]{flex-direction:column}
.ccp-foot{box-sizing:border-box;flex:0 0 auto;width:100%;min-width:0;font:inherit;color:var(--dsw-alias-label-secondary);text-align:left;cursor:pointer;background:0 0;border:1px solid transparent;border-radius:10px;flex-direction:column;gap:6px;margin:0 0 4px;padding:8px;display:flex}
.ccp-foot:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2)}
.ccp-foot:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.ccp-footTop{align-items:center;gap:8px;min-width:0;display:flex}
.ccp-footName{white-space:nowrap;text-overflow:ellipsis;color:var(--dsw-alias-label-primary);min-width:0;overflow:hidden;font-size:13px;font-weight:500;line-height:20px}
/* One block per quota window: a head line carrying the window's own spend and
   limit, then the FULL-WIDTH bar under it. Stacking the two lets the card show
   the dollar figures — the reason this surface exists — without squeezing the
   bar into what is left beside them. Mirrors the dashboard's window block. */
.ccp-footRow{flex-direction:column;gap:4px;min-width:0;display:flex}
.ccp-footHead{align-items:baseline;gap:8px;min-width:0;display:flex}
.ccp-footLabel{flex:1;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px}
.ccp-footAmount{flex:none;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px;font-variant-numeric:tabular-nums;white-space:nowrap}
/* The card's markup must stay PHRASING content — it renders inside the shell's
   own button — so these bars are spans, which makes display:block load-bearing:
   an inline box ignores width outright, so the fill would collapse to 0x0 and
   the bar would show no usage. */
.ccp-footBar{display:block;background:var(--dsw-alias-bg-layer-2);border-radius:999px;height:5px;overflow:hidden}
.ccp-footFill{display:block;background:var(--dsw-alias-brand-primary);border-radius:999px;height:100%;transition:width .3s ease}
.ccp-footFillWarn{background:var(--dsw-alias-state-error-primary)}
.ccp-footPct{flex:none;width:34px;color:var(--dsw-alias-label-secondary);text-align:right;font-size:12px;line-height:16px;font-variant-numeric:tabular-nums}

/* The 56px rail: one icon button on the shell's own 36px rail cell, so the
   collapsed column keeps a single 18px glyph like its siblings. */
.ccp-railButton{box-sizing:border-box;width:36px;height:36px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:1px solid transparent;border-radius:8px;flex:none;justify-content:center;align-items:center;margin:0 0 4px;padding:0;display:inline-flex}
.ccp-railButton:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.ccp-railButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}

/* The ring glyph, sized entirely by its own width/height attribute, so the
   footer row, the rail button and the dashboard can each ask for their own. */
.ccp-glyph{flex:none;justify-content:center;align-items:center;display:inline-flex;color:var(--dsw-alias-brand-primary)}

/* ------------------------------------------------------------ dashboard */
.ccp-main{background:var(--dsw-alias-bg-layer-1);width:100%;height:100%;overflow:auto;display:block}
.ccp-mainInner{max-width:760px;margin:0 auto;padding:24px 20px 40px;flex-direction:column;gap:14px;display:flex;color:var(--dsw-alias-label-primary)}
.ccp-header{align-items:center;gap:10px;display:flex;flex-wrap:wrap}
.ccp-headerText{flex-direction:column;gap:2px;display:flex;min-width:0}
.ccp-title{margin:0;font-size:18px;font-weight:600;line-height:1.4}
.ccp-subtitle{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}
.ccp-spacer{flex:1}
.ccp-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;font-variant-numeric:tabular-nums}
/* 关闭图标沿用原语义与按钮尺寸，线性 SVG 随宿主文字颜色变化。 */
.ccp-close{min-width:28px;justify-content:center;padding-left:0;padding-right:0}
.ccp-hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}

.ccp-notice{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;padding:12px 14px;flex-direction:column;gap:4px;display:flex}
.ccp-noticeError{border-color:var(--dsw-alias-state-error-primary)}
.ccp-noticeTitle{margin:0;font-size:13px;font-weight:600;line-height:1.5}
.ccp-noticeError .ccp-noticeTitle{color:var(--dsw-alias-state-error-primary)}
.ccp-noticeHint{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.55}
.ccp-noticeDetail{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;word-break:break-word}

.ccp-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:14px;padding:16px 18px;flex-direction:column;gap:16px;display:flex}
.ccp-cardHead{align-items:center;gap:10px;display:flex;flex-wrap:wrap}
.ccp-avatar{flex:none;width:28px;height:28px;color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-module-platform);border-radius:50%;justify-content:center;align-items:center;font-size:12px;font-weight:600;line-height:1;display:inline-flex}
.ccp-cardIdentity{flex-direction:column;gap:1px;min-width:0;display:flex}
.ccp-cardTitle{font-size:13px;font-weight:600;line-height:1.4}
.ccp-cardOwner{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px}
.ccp-block{flex-direction:column;gap:8px;display:flex}
.ccp-blockTitle{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:600;line-height:1.5;text-transform:uppercase;letter-spacing:.04em}
.ccp-planRow{align-items:center;gap:8px;display:flex;flex-wrap:wrap}
.ccp-fieldLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}
.ccp-planName{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:1.5}

/* The monthly credits and the usage totals share one grid. */
.ccp-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
.ccp-tile{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:8px;padding:8px 10px;flex-direction:column;gap:2px;display:flex;min-width:0}
.ccp-tileLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}
.ccp-tileValue{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4;font-variant-numeric:tabular-nums}
.ccp-tileSub{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Quota bars: the monthly bar and the two windows. */
.ccp-windows{flex-direction:column;gap:14px;display:flex}
.ccp-window{flex-direction:column;gap:6px;display:flex}
.ccp-windowHead{align-items:baseline;gap:8px;display:flex}
.ccp-windowLabel{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:1.5}
.ccp-windowValue{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5;font-variant-numeric:tabular-nums;white-space:nowrap}
.ccp-windowPct{color:var(--dsw-alias-label-primary);min-width:38px;text-align:right;font-size:12px;font-weight:600;line-height:1.5;font-variant-numeric:tabular-nums}
.ccp-warnTag{white-space:nowrap;background:var(--dsw-alias-state-warn-tertiary,var(--dsw-alias-bg-module-platform));color:var(--dsw-alias-state-warn-primary,var(--dsw-alias-label-secondary));border-radius:999px;padding:0 8px;font-size:12px;font-weight:600;line-height:17px}
.ccp-bar{overflow:hidden;background:var(--dsw-alias-bg-layer-1);border-radius:999px;height:8px}
.ccp-barFill{background:var(--dsw-alias-brand-primary);border-radius:999px;height:100%;transition:width .3s ease}
.ccp-barFillWarn{background:var(--dsw-alias-state-error-primary)}
.ccp-windowReset{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}

.ccp-badge{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-brand-primary);border-radius:999px;padding:1px 8px;font-size:12px;font-weight:600;line-height:17px}
.ccp-badgeError{background:transparent;color:var(--dsw-alias-state-error-primary)}
.ccp-badgeWarn{background:var(--dsw-alias-state-warn-tertiary,var(--dsw-alias-bg-module-platform));color:var(--dsw-alias-state-warn-primary,var(--dsw-alias-label-secondary))}
.ccp-badgeMuted{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:12px;font-weight:500;line-height:17px;max-width:220px;overflow:hidden;text-overflow:ellipsis}

/* Account switch: plain buttons, like the settings page's usage carousel. */
.ccp-tabs{flex-wrap:wrap;gap:6px;display:flex}
.ccp-tab{align-items:center;font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:2px 10px;font-size:12px;line-height:18px;display:inline-flex;gap:6px}
.ccp-tab:hover:not(.ccp-tabActive){color:var(--dsw-alias-label-primary)}
.ccp-tabActive{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}

@media (prefers-reduced-motion:reduce){.ccp-footFill,.ccp-barFill{transition:none}}
/* 分析页使用独立宽度与私有选择器；数字总览和明细不影响原额度面板。 */
.ccp-mainInnerAnalysis{max-width:1040px}
.ccp-analysis{font-size:14px;line-height:1.6;min-width:0;color:var(--dsw-alias-label-primary)}
.ccp-analysisFilters{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:10px 0 18px}
.ccp-analysisField{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary);min-width:0}
.ccp-analysisFilters .ccp-analysisField{min-width:136px}
.ccp-analysisFilters .ccp-analysisScopeField{flex:0 1 180px}
/* 明确边框盒高度与行高，避免原生下拉、日期输入和按钮按各自外观计算尺寸。 */
.ccp-analysisInput{box-sizing:border-box;width:100%;min-width:0;height:40px;padding:8px 11px;font:inherit;font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:7px}
/* 原生选择行为保留；SVG 的位置与文字留白独立控制，点击箭头仍交给下拉框。 */
.ccp-analysisSelectShell{position:relative;display:block;width:100%;min-width:0}
.ccp-analysisSelect{appearance:none;-webkit-appearance:none;padding-inline-end:40px;text-overflow:ellipsis;cursor:pointer}
.ccp-analysisSelectShell > .ccp-analysisChevron{position:absolute;inset-inline-end:12px;top:50%;transform:translateY(-50%) rotate(90deg);pointer-events:none}
.ccp-analysisSelect:disabled + .ccp-analysisChevron{opacity:.65}
.ccp-analysisInput::placeholder{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.ccp-analysisApply{box-sizing:border-box;height:40px;font:inherit;font-size:14px;font-weight:500;line-height:20px;white-space:nowrap;padding:8px 18px;border:1px solid var(--dsw-alias-label-primary);border-radius:7px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);cursor:pointer}
.ccp-analysisApply:disabled{opacity:.5;cursor:wait}
.ccp-analysisInput:disabled{opacity:.65}
.ccp-analysisInput:focus-visible,.ccp-analysisApply:focus-visible,.ccp-analysisTab:focus-visible,.ccp-analysisPanel:focus-visible,.ccp-analysisModelSummary:focus-visible,.ccp-analysisScenarioSummary:focus-visible,.ccp-analysisDisclosure:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
/* 模型列表会裁切圆角，内收焦点框以保持第一行和最后一行也清晰可见。 */
.ccp-analysisModelSummary:focus-visible,.ccp-analysisScenarioSummary:focus-visible,.ccp-analysisAggregate > .ccp-analysisDisclosure:focus-visible{outline-offset:-3px}
.ccp-analysisScope{display:flex;justify-content:space-between;gap:6px 18px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:12px;margin-bottom:12px}
.ccp-analysisOverview{display:grid;grid-template-columns:1.25fr repeat(3,1fr);padding:22px 0;border-top:1px solid var(--dsw-alias-border-l2);border-bottom:1px solid var(--dsw-alias-border-l2);font-variant-numeric:tabular-nums}
.ccp-analysisMetric{display:flex;flex-direction:column;gap:4px;min-width:0}
.ccp-analysisLabel{font-size:12px;color:var(--dsw-alias-label-secondary);font-weight:400}
.ccp-analysisValue{font-size:16px;line-height:1.4;font-weight:500;overflow-wrap:anywhere}
.ccp-analysisSub{display:block;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:400;overflow-wrap:anywhere}
.ccp-analysisOverview .ccp-analysisMetric{padding:0 24px;border-left:1px solid var(--dsw-alias-border-l2)}
.ccp-analysisOverview .ccp-analysisMetric:first-child{padding-left:0;border-left:0}
.ccp-analysisOverview .ccp-analysisMetric:last-child{padding-right:0}
.ccp-analysisOverview .ccp-analysisValue{font-size:26px;font-weight:600;letter-spacing:-.025em;margin:3px 0}
.ccp-analysisNote{font-size:12px;color:var(--dsw-alias-label-secondary);margin:8px 0 0}
.ccp-analysisMessage{margin:10px 0;padding:12px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-2);font-size:14px}
.ccp-analysisWarning{border-left:3px solid var(--dsw-alias-state-warn-primary,var(--dsw-alias-label-secondary))}
.ccp-analysisError{border-left:3px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}
.ccp-analysisTabs{display:flex;gap:24px;border-bottom:1px solid var(--dsw-alias-border-l2);margin:24px 0 0}
.ccp-analysisTab{position:relative;border:0;background:transparent;font:inherit;font-size:14px;color:var(--dsw-alias-label-secondary);padding:10px 0 12px;cursor:pointer}
.ccp-analysisTab[aria-selected="true"]{color:var(--dsw-alias-label-primary);font-weight:600}
.ccp-analysisTab[aria-selected="true"]:after{content:"";position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--dsw-alias-brand-primary);border-radius:2px}
.ccp-analysisPanel{padding-top:18px;min-width:0}
.ccp-analysisPanel[hidden]{display:none}
.ccp-analysisSectionHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.ccp-analysisHeading{font-size:14px;font-weight:600;margin:0}
.ccp-analysisSectionHead .ccp-analysisNote{margin:0}
.ccp-analysisModels{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;overflow:hidden}
.ccp-analysisModelRow{border-top:1px solid var(--dsw-alias-border-l2)}
.ccp-analysisModelRow:first-child{border-top:0}
.ccp-analysisModelSummary,.ccp-analysisScenarioSummary{position:relative;display:grid;grid-template-columns:minmax(180px,1.65fr) repeat(4,minmax(90px,1fr)) 16px;gap:16px;align-items:center;padding:18px 16px;cursor:pointer;list-style:none;font-variant-numeric:tabular-nums}
.ccp-analysisScenarioSummary{grid-template-columns:minmax(180px,1.65fr) repeat(2,minmax(90px,1fr)) minmax(90px,.8fr) 16px}
.ccp-analysisModelSummary::-webkit-details-marker,.ccp-analysisScenarioSummary::-webkit-details-marker,.ccp-analysisDisclosure::-webkit-details-marker{display:none}
.ccp-analysisModelSummary:hover,.ccp-analysisScenarioSummary:hover{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2))}
.ccp-analysisIdentity{display:flex;flex-direction:column;gap:5px;min-width:0}
.ccp-analysisModelName{font-size:14px;font-weight:600;overflow-wrap:anywhere}
.ccp-analysisChevron{flex:none;color:var(--dsw-alias-label-secondary)}
.ccp-analysisModelRow[open] > .ccp-analysisModelSummary > .ccp-analysisChevron,.ccp-analysisModelRow[open] > .ccp-analysisScenarioSummary > .ccp-analysisChevron,.ccp-analysisAggregate[open] > .ccp-analysisDisclosure > .ccp-analysisChevron,.ccp-analysisRules[open] > .ccp-analysisDisclosure > .ccp-analysisChevron{transform:rotate(90deg)}
.ccp-analysisDetails{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;padding:18px 16px 22px;background:var(--dsw-alias-bg-layer-2);border-top:1px solid var(--dsw-alias-border-l2)}
.ccp-analysisDetailTitle{font-size:12px;font-weight:600;margin:0 0 10px}
.ccp-analysisFacts{margin:0;display:flex;flex-direction:column;gap:8px}
.ccp-analysisFact{display:flex;align-items:baseline;justify-content:space-between;gap:12px;min-width:0}
.ccp-analysisFactValue{font-size:14px;margin:0;text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;min-width:0}
.ccp-analysisFact .ccp-analysisLabel{flex-shrink:0}
.ccp-analysisAggregate{margin-top:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;overflow:hidden}
.ccp-analysisDisclosure{display:flex;gap:8px;align-items:center;cursor:pointer;list-style:none;font-size:12px;color:var(--dsw-alias-label-secondary);padding:11px 14px}
.ccp-analysisMonthly{margin:16px 0 0;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;font-size:12px;color:var(--dsw-alias-label-secondary)}
.ccp-analysisMonthlyValue{font-size:14px;font-weight:500;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.ccp-analysisMonthly .ccp-analysisNote{width:100%;margin:0}
.ccp-analysisAssumption{font-size:14px;line-height:1.6;color:var(--dsw-alias-label-secondary);margin:0 0 16px}
.ccp-analysisSearch{max-width:360px;margin-bottom:16px}
.ccp-analysisCapability{font-size:12px;color:var(--dsw-alias-label-secondary)}
.ccp-analysisScenarioDetails{grid-template-columns:minmax(0,1fr) minmax(0,2fr)}
.ccp-analysisScenarioDetails .ccp-analysisFactValue{max-width:75%}
.ccp-analysisEmpty{font-size:14px;color:var(--dsw-alias-label-secondary);text-align:center;padding:32px 16px;margin:0;border:1px dashed var(--dsw-alias-border-l2);border-radius:8px}
.ccp-analysisRules{margin-top:22px;border-top:1px solid var(--dsw-alias-border-l2)}
.ccp-analysisRules .ccp-analysisDisclosure{padding:14px 0}
.ccp-analysisRulesBody{color:var(--dsw-alias-label-secondary);font-size:14px;padding-bottom:4px}
.ccp-analysisRulesBody p{margin:0 0 12px}
@media (max-width:860px){
.ccp-analysisOverview .ccp-analysisMetric{padding:0 16px}
.ccp-analysisOverview .ccp-analysisValue{font-size:22px}
.ccp-analysisModelSummary{grid-template-columns:repeat(4,minmax(0,1fr)) 16px;gap:12px 16px}
.ccp-analysisScenarioSummary{grid-template-columns:repeat(3,minmax(0,1fr)) 16px;gap:12px 16px}
.ccp-analysisModelSummary > .ccp-analysisIdentity,.ccp-analysisScenarioSummary > .ccp-analysisIdentity{grid-column:1/-2}
.ccp-analysisModelSummary > .ccp-analysisChevron{grid-column:5;grid-row:1}
.ccp-analysisScenarioSummary > .ccp-analysisChevron{grid-column:4;grid-row:1}
.ccp-analysisDetails{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:640px){
.ccp-mainInnerAnalysis{padding:20px 16px 32px}
.ccp-analysisFilters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.ccp-analysisFilters .ccp-analysisField{min-width:0}
.ccp-analysisApply{grid-column:1/-1}
.ccp-analysisOverview{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 0;padding:20px 0}
.ccp-analysisOverview .ccp-analysisMetric{padding:0 12px}
.ccp-analysisOverview .ccp-analysisMetric:nth-child(odd){border-left:0;padding-left:0}
.ccp-analysisOverview .ccp-analysisValue{font-size:22px}
.ccp-analysisModelSummary,.ccp-analysisScenarioSummary{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:16px}
.ccp-analysisModelSummary > .ccp-analysisIdentity,.ccp-analysisScenarioSummary > .ccp-analysisIdentity{grid-column:1/-1;padding-right:24px}
.ccp-analysisModelSummary > .ccp-analysisChevron,.ccp-analysisScenarioSummary > .ccp-analysisChevron{position:absolute;top:19px;right:16px;grid-column:auto;grid-row:auto}
.ccp-analysisDetails{gap:20px;grid-template-columns:1fr}
.ccp-analysisFactValue{max-width:65%}
.ccp-analysisSearch{max-width:none}
}
`
