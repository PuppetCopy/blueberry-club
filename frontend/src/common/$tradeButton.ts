import { attr, stylePseudo, style, $text } from "@aelea/dom"
import { $row, layoutSheet, $icon } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { $anchor } from "@gambitdao/ui-components"
import { $ButtonPrimary } from "../components/form/$Button"
import { $gmxLogo } from "./$icons"


export const $tradeGMX = $anchor(attr({ href: 'https://gmx.io/trade' }), stylePseudo(':hover', { fill: `${pallete.message}` }), style({ textDecoration: 'none' }))(
  $ButtonPrimary({
    $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
      $icon({ $content: $gmxLogo, width: '18px', viewBox: '0 0 32 32' }),
      $text('Trade')
    )
  })({})
)