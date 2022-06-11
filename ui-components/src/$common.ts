import { isStream, O } from "@aelea/core"
import { $Branch, $element, $node, $Node, $text, attr, component, style, styleBehavior, styleInline, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, $seperator, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { CHAIN, formatReadableUSD, getLeverage, getLiquidationPriceFromDelta, getTxExplorerUrl, IAbstractTrade, ITradeOpen, liquidationWeight, readableNumber, shortenTxAddress, TokenDescription, TOKEN_SYMBOL } from "@gambitdao/gmx-middleware"
import { now, multicast, map, empty } from "@most/core"
import { Stream } from "@most/types"
import { $alertIcon, $caretDblDown, $skull, $tokenIconMap } from "./$icons"


export const $anchor = $element('a')(
  stylePseudo(':hover', { color: pallete.middleground + '!important', fill: pallete.middleground }),
  style({
    display: 'flex',
    cursor: 'pointer',
    color: pallete.message
  }),
)

export const $alert = ($contnet: $Branch) => $row(layoutSheet.spacingSmall, style({
  alignSelf: 'flex-start',
  borderRadius: '100px', alignItems: 'center', fontSize: '75%', border: `1px solid ${pallete.negative}`, padding: '10px 14px'
}))(
  $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
  $contnet,
)


export const $txHashRef = (txHash: string, chain: CHAIN, label?: $Node) => {
  const href = getTxExplorerUrl(chain, txHash)

  return $anchor(attr({ href, target: '_blank' }))(label ?? $text(shortenTxAddress(txHash)))
}


export const $risk = (pos: IAbstractTrade) => $column(layoutSheet.spacingTiny, style({ textAlign: 'center' }))(
  $text(formatReadableUSD(pos.size)),
  $seperator,
  style({ textAlign: 'center', fontSize: '.65em' }, $leverage(pos)),
)

export const $leverage = (pos: IAbstractTrade) =>
  $text(style({ fontWeight: 'bold' }))(`${readableNumber(getLeverage(pos), 2)}x`)

export const $ProfitLossText = (pnl: Stream<bigint> | bigint, colorful = true) => {
  const pnls = isStream(pnl) ? pnl : now(pnl)

  const display = multicast(map(n => {
    return (n > 0n ? '+' : '') + formatReadableUSD(n)
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

export function $liquidationSeparator(liqWeight: Stream<number>) {
  return styleInline(map((weight) => {
    return { width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${`${weight * 100}%`}, ${pallete.foreground} 0)` }
  }, liqWeight))(
    $seperator
  )
}

export const $RiskLiquidator = (pos: ITradeOpen, markPrice: Stream<bigint>) => component(() => {
  const liquidationPrice = getLiquidationPriceFromDelta(pos.collateral, pos.size, pos.averagePrice, pos.isLong)
  const liqPercentage = map(price => liquidationWeight(pos.isLong, liquidationPrice, price), markPrice)

  return [
    $column(layoutSheet.spacingTiny, style({ minWidth: '100px', alignItems: 'center' }))(
      $text(formatReadableUSD(pos.size)),
      $liquidationSeparator(liqPercentage),
      $row(style({ fontSize: '.65em', gap: '2px', alignItems: 'center' }))(
        $leverage(pos),

        $node(),

        $icon({
          $content: $skull,
          width: '12px',
          svgOps: style({ marginLeft: '3px' }),
          viewBox: '0 0 32 32',
        }),
        $text(style({  }))(
          formatReadableUSD(liquidationPrice)
        )
      )
    )
  ]
})

export const $labeledDivider = (label: string) => {
  return $row(layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center' }))(
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.middleground}` }))(),
    $row(layoutSheet.spacingSmall, style({ color: pallete.foreground, alignItems: 'center' }))(
      $text(style({ fontSize: '75%' }))(label),
      $icon({ $content: $caretDblDown, width: '10px', viewBox: '0 0 32 32', fill: pallete.foreground }),
    ),
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.middleground}` }))(),
  )
}

export const $tokenLabel = (token: TokenDescription, $iconG: $Node, $label?: $Node) => {
  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center' }))(
    $icon({ $content: $iconG, width: '34px', viewBox: '0 0 32 32' }),
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ fontSize: '75%', color: pallete.foreground }))(token.symbol)
    ),
    style({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, $label || empty())
  )
}


export const $tokenLabelFromSummary = (token: TokenDescription, $label?: $Node) => {
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


