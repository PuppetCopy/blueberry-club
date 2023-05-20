import { Behavior, O } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { ITrade, TOKEN_ADDRESS_TO_SYMBOL, TOKEN_SYMBOL, formatReadableUSD } from "@gambitdao/gmx-middleware"

import { pallete } from "@aelea/ui-components-theme"
import { $bear, $bull, $tokenIconMap } from "@gambitdao/ui-components"
import { $CumulativePnl, ICompetitonCumulativeRoi } from "./$CumulativePnl"


export interface ILeaderboard extends ICompetitonCumulativeRoi {

}

export const $Leaderboard = (config: ILeaderboard) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
) => {


  const containerStyle = O(
    layoutSheet.spacingBig,
    style({
      display: 'flex',
      fontFeatureSettings: '"tnum" on,"lnum" on',
      fontFamily: `-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif`,
    }),
    screenUtils.isDesktopScreen
      ? style({ width: '780px', alignSelf: 'center' })
      : style({ width: '100%' })
  )


  return [
    containerStyle(
      $CumulativePnl({
        ...config
      })({
        routeChange: routeChangeTether()
      })
    ),

    {
      routeChange,
    }
  ]
})



export const $Index = (pos: ITrade) => $column(style({ position: 'relative', placeContent: 'center' }))(
  $row(layoutSheet.spacingTiny, style({ alignItems: 'center', fontSize: '.65em' }))(
    $icon({
      svgOps: style({ borderRadius: '50%', padding: '4px', marginRight: '-10px', zIndex: 0, alignItems: 'center', fill: pallete.message, backgroundColor: pallete.horizon }),
      $content: pos.isLong ? $bull : $bear,
      viewBox: '0 0 32 32',
      width: '26px'
    }),
    $TokenIcon(TOKEN_ADDRESS_TO_SYMBOL[pos.indexToken], { width: '28px' }),
    $text(formatReadableUSD(pos.averagePrice))
  ),
  // $text(style({ fontSize: '.65em' }))(formatReadableUSD(pos.averagePrice)),
  // $column(style({ marginLeft: '-5px', borderRadius: '50%', padding: '6px', alignItems: 'center', backgroundColor: pallete.horizon }))(
  //   $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(

  //     $leverage(pos)
  //   ),
  // )
)





export const $TokenIcon = (indexToken: TOKEN_SYMBOL, IIcon?: { width?: string }) => {
  const $token = $tokenIconMap[indexToken]

  if (!$token) {
    throw new Error('Unable to find matched token')
  }

  return $icon({
    $content: $token,
    svgOps: style({ fill: pallete.message }),
    viewBox: '0 0 32 32',
    width: '24px',
    ...IIcon
  })
}


