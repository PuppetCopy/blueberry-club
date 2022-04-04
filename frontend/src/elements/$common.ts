import { $Branch, $Node, $text, attr, style } from "@aelea/dom"
import { $ButtonIcon, $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { getAccountExplorerUrl, getTxExplorerUrl, shortenAddress, shortenTxAddress } from "@gambitdao/gmx-middleware"
import { $trash } from "./$icons"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { $anchor, $caretDblDown, $ethScan, $path } from "@gambitdao/ui-components"
import { $berryById } from "../logic/common"

export const $TrashBtn = $ButtonIcon($trash)

export const $card = $column(layoutSheet.spacing, style({ backgroundColor: pallete.horizon, padding: '30px', borderRadius: '20px', flex: 1 }))

export const $seperator = $text(style({ color: pallete.foreground, pointerEvents: 'none' }))('|')
export const $responsiveFlex = screenUtils.isDesktopScreen ? $row : $column



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



export const $iconCircular = ($iconPath: $Branch<SVGPathElement>) => {
  return $icon({
    $content: $iconPath,
    svgOps: style({
      backgroundColor: pallete.middleground, position: 'absolute', zIndex: 10, borderRadius: '50%', cursor: 'pointer',
      height: '22px', width: '22px', fontSize: '11px', textAlign: 'center', lineHeight: '15px', fontWeight: 'bold', color: pallete.message,
    }),
    width: '18px', viewBox: '0 0 32 32'
  })
}



export const $accountRef = (id: string) => $anchor(attr({ href: getAccountExplorerUrl(USE_CHAIN, id) }))(
  $text(style({}))(`${shortenAddress(id)}`)
)

export const $txHashRef = (txHash: string, label?: $Node) => {
  const href = getTxExplorerUrl(USE_CHAIN, txHash)

  return $anchor(attr({ href, target: '_blank' }))(label ?? $text(shortenTxAddress(txHash)))
}

export const $accountIconLink = (address: string) => $anchor(attr({ href: getAccountExplorerUrl(USE_CHAIN, address) }))(
  $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
)

export const $txnIconLink = (address: string) => $anchor(attr({ href: getTxExplorerUrl(USE_CHAIN, address) }))(
  $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
)


interface ITeamMember {
  name: string
  title: string
  size?: number
  tokenId: number
}

export const $teamMember = ({ name, title, size = 175, tokenId }: ITeamMember) => $column(layoutSheet.spacing, style({ alignItems: 'center', fontSize: screenUtils.isDesktopScreen ? '' : '65%' }))(
  style({ borderRadius: '15px' }, $berryById(tokenId, size)),
  $column(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
    $anchor(attr(({ href: `https://twitter.com/${name}` })), style({ fontWeight: 900, textDecoration: 'none', fontSize: '1.5em' }))($text(`@${name}`)),
    $text(style({ fontSize: '.75em' }))(title),
  )
)