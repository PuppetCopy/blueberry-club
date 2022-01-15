import { $Branch, $element, $Node, $text, attr, style, styleInline, stylePseudo } from "@aelea/dom"
import { $ButtonIcon, $column, $icon, $row, layoutSheet, $seperator as $uiSeperator, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { formatReadableUSD, IAggregatedTradeOpen, IAggregatedTradeSummary, shortenAddress, shortenTxAddress, strictGet, Token, TradeableToken, TRADEABLE_TOKEN_ADDRESS_MAP } from "@gambitdao/gmx-middleware"
import { $tokenIconMap } from "../common/$icons"
import { $alertIcon, $bagOfCoins, $caretDblDown, $ethScan, $trash } from "./$icons"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { getAccountExplorerUrl, getTxnUrl } from "@gambitdao/wallet-link"
import { totalHodlingsUsd } from "../logic/stakingGraph"

export const $TrashBtn = $ButtonIcon($trash)

export const $card = $column(layoutSheet.spacing, style({ backgroundColor: pallete.horizon, padding: '30px', borderRadius: '20px', flex: 1 }))

export const $seperator = $text(style({ color: pallete.foreground, pointerEvents: 'none' }))('|')
export const $responsiveFlex = screenUtils.isDesktopScreen ? $row : $column

export const $alert = ($contnet: $Branch) => $row(layoutSheet.spacingSmall, style({ borderRadius: '100px', alignItems: 'center', fontSize: '75%', border: `1px solid ${pallete.negative}`, padding: '10px 14px' }))(
  $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
  $contnet,
)

export const $anchor = $element('a')(
  stylePseudo(':hover', { color: pallete.primary + '!important', fill: pallete.primary }),
  style({
    display: 'flex',
    cursor: 'pointer',
    color: pallete.message
  }),
)

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

export const $tokenLabel = (token: Token | TradeableToken, $iconG: $Node, $label?: $Node) => {
  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center' }))(
    $icon({ $content: $iconG, width: '34px', viewBox: '0 0 32 32' }),
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ fontSize: '75%', color: pallete.foreground }))(token.symbol)
    ),
    style({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, $label || empty())
  )
}

export const $tokenLabelFromSummary = (trade: IAggregatedTradeOpen, $label?: $Node) => {
  const indextoken = trade.initialPosition.indexToken
  const $iconG = $tokenIconMap[indextoken]
  const token = strictGet(TRADEABLE_TOKEN_ADDRESS_MAP, indextoken)

  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center', }))(
    $icon({ $content: $iconG, width: '34px', viewBox: '0 0 32 32' }),
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ fontSize: '75%', color: pallete.foreground }))(token.symbol)
    ),
    style({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, $label || empty())
  )
}

export const $leverage = (pos: IAggregatedTradeSummary) =>
  $text(style({ fontWeight: 'bold' }))(`${String(Math.round(pos.leverage))}x`)
  

export function $liquidationSeparator(liqWeight: Stream<number>) {
  return styleInline(map((weight) => {
    return { width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${`${weight * 100}%`}, ${pallete.foreground} 0)` }
  }, liqWeight))(
    $uiSeperator
  )
}


export const $accountRef = (id: string) => $anchor(attr({ href: getAccountExplorerUrl(USE_CHAIN, id) }))(
  $text(style({}))(`${shortenAddress(id)}`)
)

export const $txHashRef = (txHash: string, label?: $Node) => {
  const href = getTxnUrl(USE_CHAIN, txHash)

  return $anchor(attr({ href, target: '_blank' }))(label ?? $text(shortenTxAddress(txHash)))
}

export const $accountIconLink = (address: string) => $anchor(attr({ href: getAccountExplorerUrl(USE_CHAIN, address) }))(
  $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
)

export const $txnIconLink = (address: string) => $anchor(attr({ href: getTxnUrl(USE_CHAIN, address) }))(
  $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
)

export const $treasury = $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
  $icon({ $content: $bagOfCoins, width: '18px', viewBox: '0 0 32 32' }),
  switchLatest(map(x => $text('$' + formatReadableUSD(x)), totalHodlingsUsd)),
)
