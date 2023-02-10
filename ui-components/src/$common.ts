import { isStream, O } from "@aelea/core"
import { $element, $node, $Node, $text, attr, style, styleBehavior, styleInline, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, $seperator, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { bnDiv, formatReadableUSD, getNextLiquidationPrice, getTxExplorerUrl, IAbstractPositionStake, ITrade, ITradeOpen, liquidationWeight, shortenTxAddress, ITokenDescription, getFundingFee, getPnL, getMarginFees, CHAIN } from "@gambitdao/gmx-middleware"
import { now, map, empty, skipRepeats } from "@most/core"
import { Stream } from "@most/types"
import { $alertIcon, $caretDblDown, $info, $arrowRight, $tokenIconMap } from "./$icons"
import { $defaultDropContainer, $Tooltip } from "./$Tooltip"


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
  alignSelf: 'flex-start', minWidth: 0, maxWidth: '100%',
  borderRadius: '100px', alignItems: 'center', fontSize: '75%',
  border: `1px dashed ${pallete.negative}`, padding: '8px 10px',
}))

export const $alert = ($content: $Node) => $alertContainer(
  $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
  $content,
)

export const $alertTooltip = ($content: $Node) => {
  return $Tooltip({
    $content: $content,
    $dropContainer: $defaultDropContainer(style({ fontSize: '0.75em' })),
    $anchor: $alertContainer(
      $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
      style({ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' })($content),
    ),
  })({})
}



export const $infoLabel = (label: string | $Node) => {
  return isStream(label)
    ? style({ lineHeight: 1 })(label)
    : $text(style({ color: pallete.foreground, fontSize: '13.2px', lineHeight: 1 }))(label)
}

export const $infoLabeledValue = (label: string | $Node, value: string | $Node) => {
  return $row(layoutSheet.spacingTiny, style({ fontSize: '13.2px', alignItems: 'center' }))(
    isStream(label)
      ? label
      : $text(style({ color: pallete.foreground }))(label),
    isStream(value) ? value : $text(value)
  )
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
    $dropContainer: $defaultDropContainer(style({ fontSize: '0.75em' })),
    // $container: $defaultTooltipAnchorContainer(style({ fontSize: '0.75em' })),
    $content: isStream(text) ? text : $text(text),
    $anchor: $icon({ $content: $info, viewBox: '0 0 32 32', fill: pallete.foreground, width: '18px', svgOps: style({ minWidth: '18px' }) }),
  })({})
}


export const $txHashRef = (txHash: string, chain: CHAIN, label?: $Node) => {
  const href = getTxExplorerUrl(chain, txHash)

  return $anchor(attr({ href }))(label ?? $text(shortenTxAddress(txHash)))
}


export const $sizeDisplay = (pos: IAbstractPositionStake) => $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
  $text(style({ fontSize: '.75em' }))(formatReadableUSD(pos.collateral)),
  $seperator,
  $text(formatReadableUSD(pos.size)),
)

export const $riskLiquidator = (pos: ITradeOpen, markPrice: Stream<bigint>) => $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end' }))(
  $text(style({ fontSize: '.75em' }))(formatReadableUSD(pos.collateral)),
  $liquidationSeparator(pos, markPrice),
  $text(formatReadableUSD(pos.size)),
)

export const $leverage = (pos: IAbstractPositionStake) =>
  $text(style({ fontWeight: 'bold' }))(`${Math.round(bnDiv(pos.size, pos.collateral))}x`)

export const $PnlValue = (pnl: Stream<bigint> | bigint, colorful = true) => {
  const pnls = isStream(pnl) ? pnl : now(pnl)

  const display = map((n: bigint) => {
    return formatReadableUSD(n)
  }, pnls)

  const displayColor = skipRepeats(map((n: bigint) => {
    return n > 0n ? pallete.positive : n === 0n ? pallete.foreground : pallete.negative
  }, pnls))

  const colorStyle = colorful
    ? styleBehavior(map(color => {
      return { color }
    }, displayColor))
    : O()

  // @ts-ignore
  return $text(colorStyle)(display)
}

export const $TradePnl = (pos: ITrade, cumulativeFee: Stream<bigint>, positionMarkPrice: Stream<bigint> | bigint, colorful = true) => {
  const pnl = isStream(positionMarkPrice)
    ? map((markPrice: bigint) => {
      const delta = getPnL(pos.isLong, pos.averagePrice, markPrice, pos.size)
      return pos.realisedPnl + delta - pos.fee
    }, positionMarkPrice)
    : positionMarkPrice

  return $PnlValue(pnl, colorful)
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

export const $openPositionPnlBreakdown = (trade: ITradeOpen, cumulativeFee: Stream<bigint>, price: Stream<bigint>) => {
  const positionMarkPrice = price

  const totalMarginFee = [...trade.increaseList, ...trade.decreaseList].reduce((seed, next) => seed + getMarginFees(next.sizeDelta), 0n)


  return $column(layoutSheet.spacingTiny)(
    $row(style({ placeContent: 'space-between' }))(
      $text('PnL breakdown'),
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Deposit'),
        $text(map(cumFee => {
          const entryFundingRate = trade.updateList[0].entryFundingRate
          const fee = getFundingFee(entryFundingRate, cumFee, trade.size)
          const realisedLoss = trade.realisedPnl < 0n ? -trade.realisedPnl : 0n

          return formatReadableUSD(trade.collateral + fee + realisedLoss + totalMarginFee)
        }, cumulativeFee))
      )
    ),
    $node(),
    $column(layoutSheet.spacingTiny)(
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Swap Fees'),
        $text('WIP')
      ),
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Margin Fee'),
        $PnlValue(-totalMarginFee)
      ),
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Borrow Fee'),
        $PnlValue(
          map(cumFee => {
            const fstUpdate = trade.updateList[0]
            const entryFundingRate = fstUpdate.entryFundingRate

            const fee = getFundingFee(entryFundingRate, cumFee, trade.size)
            return -fee
          }, cumulativeFee)
        )
      ),
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Realised Pnl'),
        $PnlValue(now(trade.realisedPnl))
      ),
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('PnL w/o fees'),
        $PnlValue(map(price => getPnL(trade.isLong, trade.averagePrice, price, trade.size), positionMarkPrice))
      ),
    )
  )
}


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
  $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em', alignItems: 'center' }))(
    $text(style({ color: pallete.foreground }))(config.val),
    $icon({
      $content: $arrowRight,
      width: '8px',
      svgOps: styleBehavior(map(isIncrease => {
        return isIncrease ? { fill: pallete.positive } : { fill: pallete.indeterminate }
      }, config.isIncrease)),
      viewBox: '0 0 32 32'
    }),
    $text(style({}))(config.change),
  ),
)



