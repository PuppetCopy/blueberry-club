import { Behavior, replayLatest } from '@aelea/core'
import { $text, component, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $column, $row, $seperator, layoutSheet, screenUtils } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { combine, empty, map, multicast, snapshot, take } from '@most/core'
import { Stream } from '@most/types'
import { IPageParapApi, formatReadableUSD, formatFixed, unixTimestampNow, ICompetitionLadderRequest, groupByMap, zipState } from '@gambitdao/gmx-middleware'
import { $defaultHeaderCell, $defaultRowContainer, $Table2 } from "../../common/$Table2"
import { $alertTooltip, countdown } from './$rules'
import { CHAIN, IWalletLink } from '@gambitdao/wallet-link'
import { $accountPreview, $profilePreview } from '../../components/$AccountProfile'
import { BLUEBERRY_REFFERAL_CODE, IProfile, IProfileTradingSummary } from '@gambitdao/gbc-middleware'
import { $card } from '../../elements/$common'


const prizeLadder: string[] = ['2200', '1100', '550', ...Array(15).fill('110')]


export interface ICompetitonTopCumulative {
  walletLink: IWalletLink
  parentRoute: Route
  competitionCumulativeRoi: Stream<IPageParapApi<IProfileTradingSummary>>
  profilePickList: Stream<IProfile[]>
}




export const $CompetitionRoi = (config: ICompetitonTopCumulative) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [highTableRequestIndex, highTableRequestIndexTether]: Behavior<number, number>,
  [requestCompetitionLadder, requestCompetitionLadderTether]: Behavior<number, ICompetitionLadderRequest>,
) => {
  const date = new Date()
  const start = 0
  const end = Date.UTC(date.getFullYear(), date.getMonth(), 28, 16) / 1000

  const ended = unixTimestampNow() >= end


  const tableList = replayLatest(map(res => {
    return res
  }, multicast(config.competitionCumulativeRoi)))

  // const requestProfilePickList = map(list => list.page.map(x => x.account), tableList)
  // const profilePickList = map(list => {
  //   return groupByMap(list, p => p.id)
  // }, config.profilePickList)


  return [
    $column(

      // style({ alignSelf: 'center', maxWidth: '500px', marginBottom: '18px' })(
      //   $alert($text(`Results are being checked to ensure all data is accounted for. expected to finalize by Nov 25 12:00 UTC`)),
      // ),


      // switchLatest(combine((w3p, chain) => {

      //   if (!w3p || !chain) {
      //     return empty()
      //   }

      //   return $row(style({ backgroundColor: pallete.background, borderLeft: 0, borderRadius: '30px', alignSelf: 'center', marginBottom: '30px', padding: '20px' }))(
      //     $accountPreview({ address: w3p.address }),
      //   )
      // }, config.walletLink.wallet, config.walletLink.network)),


      $row(style({ padding: screenUtils.isMobileScreen ? '0 12px' : '' }))(
        $column(layoutSheet.spacingSmall, style({ marginBottom: '26px', flex: 1 }))(
          $row(layoutSheet.spacingSmall, style({ alignItems: 'flex-end' }))(
            $text(style({}))(`Highest ROI (%)`),

            ...ended ? [] : [
              $text(style({ color: pallete.foreground, fontSize: '.75em' }))('Ending in'),
              $text(style({ fontSize: '.75em' }))(countdown(end)),
            ]

          ),
          $text(style({ fontSize: '.75em' }))(`ROI (%) is defined as: Profits / Max Collateral (min $1000) * 100`),
        ),

        $row(
          $text(style({
            color: pallete.positive,
            fontSize: '1.75em',
            textShadow: `${pallete.positive} 1px 1px 20px, ${pallete.positive} 0px 0px 20px`
          }))('~$75,000')
        )
      ),




      $Table2({
        $container: $card(style({ padding: "0", gap: 0 })),
        // rowOp: style({ backgroundColor: 'red' }),
        $headerCell: $defaultHeaderCell(style({})),
        dataSource: tableList,
        // $rowContainer: 
        $bodyRowContainer: $defaultRowContainer(style({ background: pallete.background, margin: '0 1px', borderBottom: `1px solid ${pallete.horizon}` })),
        columns: [

          {
            $head: $text('Account'),
            columnOp: style({ minWidth: '120px', flex: 1.2, alignItems: 'center' }),
            $$body: map((pos: IProfileTradingSummary) => {

              if (!pos.profile) {
                return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                  $alertTooltip($text(`Unclaimed profile remains below until claimed`)),
                  $accountPreview({ address: pos.account })
                  // style({ zoom: '0.7' })(
                  //   $alert($text('Unclaimed'))
                  // )
                )
              }


              return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                $row(style({ alignItems: 'baseline', zIndex: 5, textAlign: 'center', placeContent: 'center' }))(
                  $text(style({ fontSize: '.65em' }))(`${pos.rank}`),
                ),
                $row(layoutSheet.spacing, style({ minWidth: '0', alignItems: 'center' }))(
                  $profilePreview({ profile: pos.profile })
                ),
              )
            })
          },
          ...(screenUtils.isDesktopScreen ? [
            {
              $head: $text('Win/Loss'),
              columnOp: style({ maxWidth: '88px', alignItems: 'center', placeContent: 'center' }),
              $$body: map((pos: IProfileTradingSummary) => {
                return $row(
                  $text(`${pos.winCount}/${pos.lossCount}`)
                )
              })
            },

          ] : []),

          {
            $head: $column(style({ textAlign: 'center' }))(
              $text('Profits $'),
              $text(style({ fontSize: '.65em' }))('Max Collateral'),
            ),
            columnOp: style({ placeContent: 'center', minWidth: '125px' }),
            $$body: map((pos: IProfileTradingSummary) => {
              const val = formatReadableUSD(pos.pnl)
              const isNeg = pos.pnl < 0n


              return $column(layoutSheet.spacingTiny, style({ textAlign: 'center' }))(
                $text(style({}))(
                  `${isNeg ? '' : '+'}${val}`
                ),
                $seperator,
                $text(formatReadableUSD(BigInt(pos.maxCollateral)))
              )
            })
          },
          {
            $head: $column(style({ placeContent: 'flex-end', alignItems: 'flex-end' }))(
              $text('Prize'),
              $text(style({ fontSize: '.65em' }))('ROI %'),
            ),
            columnOp: style({ flex: 1, alignItems: 'flex-end', placeContent: 'flex-end' }),
            $$body: snapshot((list, pos) => {
              const prize = prizeLadder[list.offset + list.page.indexOf(pos)]

              return $column(
                prize
                  ? $row(
                    // $avaxIcon,
                    $text(style({ fontSize: '1.8em', color: pallete.positive }))(prize),
                  ) : empty(),

                $text(`${formatFixed(pos.roi, 2)}%`)
              )
            }, tableList)
          }
        ],
      })({
        scrollIndex: requestCompetitionLadderTether(
          map(pageIndex => {
            const newLocal: ICompetitionLadderRequest = {
              chain: CHAIN.ARBITRUM,
              referralCode: BLUEBERRY_REFFERAL_CODE,
              maxCollateral: 1000000000000000000000000000000000n,
              from: start,
              to: end,
              offset: pageIndex * 20,
              pageSize: 20,
            }
            return newLocal
          })
        )
      }),

    ),

    {
      requestCompetitionLadder,
      // requestProfilePickList,
      routeChange
    }
  ]
})


