import { Behavior, O } from "@aelea/core"
import { $node, $text, attr, component, style } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { TOKEN_ADDRESS_TO_SYMBOL, formatReadableUSD, ITrade, TOKEN_SYMBOL, ICompetitionLadderRequest, countdown, unixTimestampNow, formatFixed, getChainName } from "@gambitdao/gmx-middleware"

import { CHAIN } from "@gambitdao/wallet-link"
import { $anchor, $AnchorLink, $bear, $bull, $Link, $tokenIconMap } from "@gambitdao/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { resolveAddress } from "../logic/utils"
import { $CompetitionRoi, ICompetitonTopCumulative } from "./trade/$CumulativeRoi"
import { TOURNAMENT_START_END, TOURNAMENT_START_PERIOD } from "@gambitdao/gbc-middleware"
import { $AccountLabel } from "../components/$AccountProfile"


export interface ILeaderboard extends ICompetitonTopCumulative {

}

export const $Leaderboard = (config: ILeaderboard) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [highTableRequestIndex, highTableRequestIndexTether]: Behavior<number, number>,
  [requestCompetitionLadder, requestCompetitionLadderTether]: Behavior<ICompetitionLadderRequest, ICompetitionLadderRequest>,
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
        // routeChange
      })

    ),

    {
      requestCompetitionLadder, requestProfilePickList,
    }
  ]
})




export const $Entry = (chain: CHAIN, pos: ITrade) =>
  $row(
    $column(layoutSheet.spacingTiny, style({ alignSelf: 'flex-start' }))(
      $entryDisplay(chain, pos),
      $text(style({ fontSize: '.65em', textAlign: 'center', color: pallete.primary }))(formatReadableUSD(pos.averagePrice))
    )
  )


export function $entryDisplay(chain: CHAIN, pos: ITrade) {
  const newLocal = resolveAddress(chain, pos.indexToken)
  return $row(style({ position: 'relative', flexDirection: 'row', alignSelf: 'center' }))(
    style({ marginRight: '-5px' })(
      // @ts-ignore
      $TokenIcon(TOKEN_ADDRESS_TO_SYMBOL[newLocal])
    ),
    style({ borderRadius: '50%', padding: '3px', backgroundColor: pallete.background, })(
      $icon({
        $content: pos.isLong ? $bull : $bear,
        viewBox: '0 0 32 32',
      })
    )
  )
}


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


