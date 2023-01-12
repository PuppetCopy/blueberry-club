import { Behavior, replayLatest } from '@aelea/core'
import { $text, component, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $card, $column, $row, $seperator, layoutSheet, screenUtils } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { combine, empty, map, multicast, now, snapshot, switchLatest, take } from '@most/core'
import { Stream } from '@most/types'
import { IPageParapApi, formatReadableUSD, formatFixed, unixTimestampNow, IAccountLadderSummary, ICompetitionLadderRequest } from '@gambitdao/gmx-middleware'
import { $Table2 } from "../../common/$Table2"
import { $alertTooltip, $avaxIcon, countdown } from './$rules'
import { CHAIN, IWalletLink } from '@gambitdao/wallet-link'
import { $accountPreview } from '../../components/$AccountProfile'
import { BLUEBERRY_REFFERAL_CODE } from '@gambitdao/gbc-middleware'


const prizeLadder: string[] = ['2200', '1100', '550', ...Array(15).fill('110')]


export interface ICompetitonTopCumulative {
  walletLink: IWalletLink
  parentRoute: Route
  competitionCumulativeRoi: Stream<IPageParapApi<IAccountLadderSummary>>
}




export const $CompetitionRoi = (config: ICompetitonTopCumulative) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [highTableRequestIndex, highTableRequestIndexTether]: Behavior<number, number>,
  [requestCompetitionLadder, requestCompetitionLadderTether]: Behavior<number, ICompetitionLadderRequest>,
) => {
  const date = new Date()
  const start = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 16) / 1000
  const end = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + 1, 16) / 1000

  const ended = unixTimestampNow() >= end


  const tableList = replayLatest(map(res => {
    return res
  }, multicast(config.competitionCumulativeRoi)))


  const newLocal = take(1, tableList)
  return [
    $column(

      // style({ alignSelf: 'center', maxWidth: '500px', marginBottom: '18px' })(
      //   $alert($text(`Results are being checked to ensure all data is accounted for. expected to finalize by Nov 25 12:00 UTC`)),
      // ),


      switchLatest(combine((w3p, chain) => {

        if (!w3p || !chain) {
          return empty()
        }

        return $row(style({ backgroundColor: pallete.background, borderLeft: 0, borderRadius: '30px', alignSelf: 'center', marginBottom: '30px', padding: '20px' }))(
          $accountPreview({ address: w3p.address }),
        )
      }, config.walletLink.wallet, config.walletLink.network)),


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
        $container: $card(layoutSheet.spacingBig, style(screenUtils.isDesktopScreen ? { padding: "28px 40px" } : {})),
        dataSource: tableList,
        columns: [

          {
            $head: $text('Account'),
            columnOp: style({ minWidth: '120px', flex: 1.2, alignItems: 'center' }),
            $body: snapshot((datasource, pos: IAccountLadderSummary) => {

              return $row(layoutSheet.spacingSmall)(

                $row(layoutSheet.spacingSmall)(
                  switchLatest(map((claimMap: any) => {
                    const claim = claimMap[pos.account]

                    if (!claim) {
                      return $row(
                        $alertTooltip($text(style({ whiteSpace: 'pre-wrap', fontSize: '.75em' }))(`Unclaimed profile remains below until claimed`)),
                        // style({ zoom: '0.7' })(
                        //   $alert($text('Unclaimed'))
                        // )
                      )
                    }

                    const rank = datasource.offset + datasource.page.indexOf(pos) + 1


                    return $row(style({ alignItems: 'baseline', zIndex: 5, textAlign: 'center', placeContent: 'center' }))(
                      $text(style({ fontSize: '.65em' }))(`${rank}`),
                    )

                  }, now({})))

                ),
                $row(layoutSheet.spacing, style({ minWidth: '0', alignItems: 'center' }))(
                  $accountPreview({ address: pos.account })
                ),


              )
            }, tableList)
          },
          ...(screenUtils.isDesktopScreen ? [
            {
              $head: $text('Win/Loss'),
              columnOp: style({ maxWidth: '88px', alignItems: 'center', placeContent: 'center' }),
              $body: map((pos: IAccountLadderSummary) => {
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
            $body: map((pos: IAccountLadderSummary) => {
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
            $body: snapshot((list, pos) => {
              const prize = prizeLadder[list.offset + list.page.indexOf(pos)]

              return $column(
                prize
                  ? $row(
                    $avaxIcon,
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
      routeChange
    }
  ]
})


