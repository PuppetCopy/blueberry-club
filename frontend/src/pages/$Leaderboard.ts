import { Behavior } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { TOKEN_ADDRESS_TO_SYMBOL, formatReadableUSD, ITrade, TOKEN_SYMBOL, IRequestCompetitionLadderApi } from "@gambitdao/gmx-middleware"

import { $bear, $bull, $leverage, $tokenIconMap } from "@gambitdao/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { $CompetitionRoi, ICompetitonTopCumulative } from "./trade/$CumulativeRoi"


export interface ILeaderboard extends ICompetitonTopCumulative {

}

export const $Leaderboard = (config: ILeaderboard) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [highTableRequestIndex, highTableRequestIndexTether]: Behavior<number, number>,
  [requestCompetitionLadder, requestCompetitionLadderTether]: Behavior<IRequestCompetitionLadderApi, IRequestCompetitionLadderApi>,
  [requestProfilePickList, requestProfilePickListTether]: Behavior<string[], string[]>,
) => {



  return [
    $column(
      style({
        fontSize: '1.1rem',
        fontFeatureSettings: '"tnum" on,"lnum" on',
        fontFamily: `-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif`,
      })
    )(
      style({ gap: '46px', display: 'flex' }),
      screenUtils.isDesktopScreen
        ? style({ width: '780px', alignSelf: 'center' })
        : style({ width: '100%' })
    )(

      $CompetitionRoi({
        ...config
      })({
        requestCompetitionLadder: requestCompetitionLadderTether(),
        // requestProfilePickList: requestProfilePickListTether()
        routeChange: routeChangeTether()
      })

    ),

    {
      requestCompetitionLadder, requestProfilePickList, routeChange,
    }
  ]
})



export const $Entry = (pos: ITrade) => $row(style({ position: 'relative', alignItems: 'center' }))(
  $TokenIcon(TOKEN_ADDRESS_TO_SYMBOL[pos.indexToken], { width: '35px' }),
  $column(style({ marginLeft: '-5px', borderRadius: '50%', padding: '6px', alignItems: 'center', backgroundColor: pallete.horizon }))(
    $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
      $icon({
        $content: pos.isLong ? $bull : $bear,
        viewBox: '0 0 32 32',
        width: '16px'
      }),
      $leverage(pos)
    ),
    $text(style({ fontSize: '.65em' }))(formatReadableUSD(pos.averagePrice))
  )
)





export const $TokenIcon = (indexToken: TOKEN_SYMBOL, IIcon?: { width?: string }) => {
  const $token = $tokenIconMap[indexToken]

  if (!$token) {
    throw new Error('Unable to find matched token')
  }

  return $icon({
    $content: $token,
    viewBox: '0 0 32 32',
    width: '24px',
    ...IIcon
  })
}


