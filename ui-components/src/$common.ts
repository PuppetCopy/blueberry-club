import { isStream, O } from "@aelea/core"
import { $Branch, $element, $Node, $text, attr, component, style, styleBehavior, styleInline, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, $seperator, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { bnDiv, formatReadableUSD, getNextLiquidationPrice, getTxExplorerUrl, IAbstractPositionStake, IAbstractTrade, ITrade, ITradeOpen, liquidationWeight, readableNumber, shortenTxAddress, ITokenDescription, formatToBasis } from "@gambitdao/gmx-middleware"
import { CHAIN } from "@gambitdao/wallet-link"
import { now, multicast, map, empty } from "@most/core"
import { Stream } from "@most/types"
import { $alertIcon, $caretDblDown, $info, $tokenIconMap } from "./$icons"
import { $Tooltip } from "./$Tooltip"


export const $anchor = $element('a')(
  layoutSheet.spacingTiny,
  attr({ target: '_blank' }),
  stylePseudo(':hover', { color: pallete.middleground + '!important', fill: pallete.middleground }),
  style({
    cursor: 'pointer',
    color: pallete.message,
    alignItems: 'center',
    display: 'inline-flex',
  }),
)

const $alertContainer = $row(layoutSheet.spacingSmall, style({
  alignSelf: 'flex-start',
  borderRadius: '100px', alignItems: 'center', fontSize: '75%',
  border: `1px solid ${pallete.negative}`, padding: '10px 14px',
}))

export const $alert = ($content: $Branch) => $alertContainer(
  $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
  $content,
)

export const $alertTooltip = ($content: $Branch) => {
  return $Tooltip({
    $content,
    $anchor: $alertContainer(
      $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
    ),
  })({})
}



export const $infoLabel = (label: string | $Node) => {
  return isStream(label)
    ? label
    : $text(style({ color: pallete.foreground, fontSize: '.75em' }))(label)
}

export const $infoTooltipLabel = (text: string | $Node, label?: string | $Node) => {
  return $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
    label
      ? $infoLabel(label)
      : empty(),
    $infoTooltip(text),
  )
}

export const $infoTooltip = (text: string | $Node) => {
  return $Tooltip({
    $content: isStream(text) ? text : $text(text),
    $anchor: $icon({ $content: $info, viewBox: '0 0 32 32', fill: pallete.foreground, width: '18px', svgOps: style({ minWidth: '18px' }) }),
  })({})
}


export const $txHashRef = (txHash: string, chain: CHAIN, label?: $Node) => {
  const href = getTxExplorerUrl(chain, txHash)

  return $anchor(attr({ href }))(label ?? $text(shortenTxAddress(txHash)))
}


export const $sizeDisplay = (pos: IAbstractPositionStake) => $column(layoutSheet.spacingTiny, style({ textAlign: 'center' }))(
  $text(formatReadableUSD(pos.size)),
  $seperator,
  $text(style({ textAlign: 'center', fontSize: '.65em' }))(formatReadableUSD(pos.collateral)),
)

export const $leverage = (pos: IAbstractPositionStake) =>
  $text(style({ fontWeight: 'bold', fontSize: '10px' }))(`${Math.round(bnDiv(pos.size, pos.collateral)) }x`)

export const $ProfitLossText = (pnl: Stream<bigint> | bigint, colorful = true) => {
  const pnls = isStream(pnl) ? pnl : now(pnl)

  const display = multicast(map((n: bigint) => {
    return formatReadableUSD(n)
  }, pnls))

  const colorStyle = colorful
    ? styleBehavior(map(str => {
      const isNegative = str.indexOf('-') > -1
      return { color: isNegative ? pallete.negative : pallete.positive }
    }, display))
    : O()

  // @ts-ignore
  return $text(colorStyle)(display)
}

export function $liquidationSeparator(pos: ITrade, markPrice: Stream<bigint>) {
  const liquidationPrice = getNextLiquidationPrice(pos.isLong, pos.size, pos.collateral, pos.averagePrice)
  const liqWeight = map(price => liquidationWeight(pos.isLong, liquidationPrice, price), markPrice)

  return styleInline(map((weight) => {
    return { width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${`${weight * 100}%`}, ${pallete.foreground} 0)` }
  }, liqWeight))(
    $seperator
  )
}

export const $riskLiquidator = (pos: ITradeOpen, markPrice: Stream<bigint>) => $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end' }))(
  $text(formatReadableUSD(pos.size)),
  $liquidationSeparator(pos, markPrice),
  $text(style({ textAlign: 'center', fontSize: '.65em' }))(formatReadableUSD(pos.collateral))
)

export const $labeledDivider = (label: string) => {
  return $row(layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center' }))(
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.horizon}` }))(),
    $row(layoutSheet.spacingSmall, style({ color: pallete.foreground, alignItems: 'center' }))(
      $text(style({ fontSize: '75%' }))(label),
      $icon({ $content: $caretDblDown, width: '10px', viewBox: '0 0 32 32', fill: pallete.foreground }),
    ),
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.horizon}` }))(),
  )
}

export const $tokenLabel = (token: ITokenDescription, $iconG: $Node, $label?: $Node) => {
  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center' }))(
    $icon({ $content: $iconG, width: '34px', viewBox: '0 0 32 32' }),
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ fontSize: '75%', color: pallete.foreground }))(token.symbol)
    ),
    style({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, $label || empty())
  )
}


export const $tokenLabelFromSummary = (token: ITokenDescription, $label?: $Node) => {
  const $iconG = $tokenIconMap[token.symbol]

  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center', }))(
    $icon({ $content: $iconG, width: '34px', viewBox: '0 0 32 32' }),
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ fontSize: '75%', color: pallete.foreground }))(token.name)
    ),
    style({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, $label || empty())
  )
}

export const $hintNumChange = (config: {
  label?: string,
  isIncrease: Stream<boolean>,
  tooltip?: string | $Node,
  val: Stream<string>,
  change: Stream<string>
}) => $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
  config.tooltip
    ? $infoTooltipLabel(config.tooltip, config.label)
    : config.label
      ? $text(style({ color: pallete.foreground, fontSize: '0.75em' }))(config.label) : empty(),
  $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em' }))(
    $text(style({ color: pallete.foreground }))(config.val),
    $text(styleBehavior(map(isIncrease => {
      return isIncrease ? { color: pallete.positive } : { color: pallete.indeterminate }
    }, config.isIncrease)))('→'),
    $text(style({}))(config.change),
  ),
)



