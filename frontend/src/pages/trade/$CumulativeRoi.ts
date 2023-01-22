import { Behavior, replayLatest } from '@aelea/core'
import { $text, attr, component, nodeEvent, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $column, $row, $seperator, layoutSheet, screenUtils } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { combine, empty, map, multicast, snapshot, take } from '@most/core'
import { Stream } from '@most/types'
import { formatReadableUSD, formatFixed, unixTimestampNow, IRequestCompetitionLadderApi, getChainName, BASIS_POINTS_DIVISOR, getMarginFees } from '@gambitdao/gmx-middleware'
import { $alertTooltip, countdown } from './$rules'
import { CHAIN, IWalletLink } from '@gambitdao/wallet-link'
import { $AccountLabel, $accountPreview, $profilePreview } from '../../components/$AccountProfile'
import { BLUEBERRY_REFFERAL_CODE, IProfile, IProfileTradingList, IProfileTradingResult, TOURNAMENT_START_END, TOURNAMENT_START_PERIOD } from '@gambitdao/gbc-middleware'
import { $anchor, $infoLabel, $infoTooltipLabel, $Link } from '@gambitdao/ui-components'
import { $berryByToken } from '../../logic/common'
import { $CardTable } from '../../components/$common'


const prizeLadder: string[] = ['2200', '1100', '550', ...Array(15).fill('110')]


export interface ICompetitonTopCumulative {
  walletLink: IWalletLink
  parentRoute: Route
  competitionCumulativeRoi: Stream<IProfileTradingResult>
  profilePickList: Stream<IProfile[]>
}




export const $CompetitionRoi = (config: ICompetitonTopCumulative) => component((
  [routeChange, routeChangeTether]: Behavior<any, string>,
  [requestCompetitionLadder, requestCompetitionLadderTether]: Behavior<number, IRequestCompetitionLadderApi>,
) => {
  const start = TOURNAMENT_START_PERIOD
  const end = TOURNAMENT_START_END

  const competitionCumulativeRoi = multicast(config.competitionCumulativeRoi)
  const tableList = replayLatest(map(res => {
    return res.list
  }, competitionCumulativeRoi))

  const newLocal = take(1, tableList)
  // const requestProfilePickList = map(list => list.page.map(x => x.account), tableList)
  // const profilePickList = map(list => {
  //   return groupByMap(list, p => p.id)
  // }, config.profilePickList)


  function $profileHighlight(summary: IProfileTradingList, borderColor = pallete.primary) {
    const profile = summary.profile!

    return $column(layoutSheet.spacing, style({ alignItems: 'center', textDecoration: 'none' }))(
      style({ borderRadius: '50%', border: `2px solid ${borderColor}`, boxShadow: `${colorAlpha(borderColor, .15)} 0px 0px 20px 11px` }, $berryByToken(profile.token!, 110)),
      $column(layoutSheet.spacingTiny, style({ alignItems: 'center', textDecoration: 'none' }))(
        $text(style({ fontSize: '.75em' }))(`${formatFixed(summary.roi, 2)}%`),
        $column(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
          $Link({
            route: config.parentRoute.create({ fragment: '2121212' }),
            $content: style({ color: pallete.primary, fontSize: '1em' })(
              $AccountLabel(profile.id)
            ),
            anchorOp: style({ minWidth: 0, zIndex: 222 }),
            url: `/${getChainName(CHAIN.ARBITRUM)}/account/${profile.id}`,
          })({ click: routeChangeTether() }),
          // $defaultProfileSocialLink(list[1].account, config.chain, claimMap[list[1].account])
        )
      )
    )
  }

  const $details = (start: number, end: number) => {
    const now = unixTimestampNow()
    const ended = end < now

    return start > now
      ? $column(style({ alignItems: 'center' }))(
        $text(`Starting in`),
        $text(style({ fontWeight: 'bold', fontSize: '3em' }))(countdown(start)),
      )
      : $column(layoutSheet.spacingSmall)(
        $column(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', fontSize: '1.15em', alignItems: 'center', placeContent: 'center' }))(
          ended
            ? $text(style({ color: ended ? '' : pallete.indeterminate }))(
              `Competition has ended!`
            )
            : $row(layoutSheet.spacing)(
              $column(style({ textAlign: 'right' }))(
                $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
                  $text(style({ fontSize: '2.2em', fontWeight: 'bold', color: pallete.primary, textShadow: `1px 1px 50px ${colorAlpha(pallete.primary, .45)}, 1px 1px 50px ${colorAlpha(pallete.primary, .25)} ` }))('#TopBlueberry'),
                ),
              ),
            ),
          $column(
            $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
              $text(style({ fontSize: '1.25em', color: ended ? '' : pallete.indeterminate }))('Beta LIVE!'),
              $text(style({ color: pallete.foreground }))('Ending in')
            ),
            $text(style({ fontSize: '1.25em' }))(countdown(end))
          )
        ),

        $anchor(style({ fontSize: '.65em', placeSelf: 'center' }), attr({ href: 'https://medium.com/@gmx.io/' }))(
          $text('$50,000 GBC #GAMBIT ROI Trading Contest')
        )
      )

  }


  const clickAccountBehaviour = routeChangeTether(
    nodeEvent('click'),
    map(path => {
      const lastFragment = location.pathname.split('/').slice(-1)[0]
      const newPath = `/p/wallet/trade`

      if (location.pathname !== newPath) {
        history.pushState(null, '', newPath)
      }

      return newPath
    })
  )

  return [
    $column(layoutSheet.spacingBig)(

      // style({ alignSelf: 'center', maxWidth: '500px', marginBottom: '18px' })(
      //   $alert($text(`Results are being checked to ensure all data is accounted for. expected to finalize by Nov 25 12:00 UTC`)),
      // ),

      $column(layoutSheet.spacing, style({ alignItems: 'center', placeContent: 'center', margin: '40px 0', }))(
        $details(TOURNAMENT_START_PERIOD, TOURNAMENT_START_END)
      ),


      // switchLatest(map(res => {
      //   const list = res.page
      //   const profile = list[0].profile!
      //   return $row(layoutSheet.spacing, style({ alignItems: 'flex-end', placeContent: 'center', position: 'relative' }))(
      //     $profileHighlight(list[1]),
      //     style({
      //       margin: '0 -26px',
      //       zIndex: 10,
      //       zoom: 1.3
      //     })($profileHighlight(list[0], pallete.positive)),
      //     $profileHighlight(list[2]),
      //     // $column(layoutSheet.spacing, style({ alignItems: 'center', zIndex: 10, margin: '0 -35px', textDecoration: 'none' }))(
      //     //   style({ border: `2px solid ${pallete.positive}`, boxShadow: `${colorAlpha(pallete.positive, .15)} 0px 0px 20px 11px` }, $AccountPhoto(list[0].account, claimMap[list[0].account], '215px')),
      //     //   $column(layoutSheet.spacingTiny, style({ alignItems: 'center', textDecoration: 'none' }))(
      //     //     $text(style({ fontSize: '.75em' }))(`${formatFixed(list[0].roi, 2)}%`),
      //     //     $column(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      //     //       $Link({
      //     //         route: config.parentRoute.create({ fragment: '2121212' }),
      //     //         $content: $AccountLabel(list[0].account, claimMap[list[0].account], style({ color: pallete.primary, fontSize: '1em' })),
      //     //         anchorOp: style({ minWidth: 0, zIndex: 222 }),
      //     //         url: `/${getChainName(config.chain)}/account/${list[0].account}`,
      //     //       })({ click: routeChangeTether() }),
      //     //       $defaultProfileSocialLink(list[0].account, config.chain, claimMap[list[0].account])
      //     //     )
      //     //   )
      //     // ),
      //     // $column(layoutSheet.spacing, style({ alignItems: 'center', textDecoration: 'none' }))(
      //     //   style({ border: `2px solid ${pallete.positive}`, boxShadow: `${colorAlpha(pallete.positive, .15)} 0px 0px 20px 11px` }, $AccountPhoto(list[2].account, claimMap[list[2].account], '140px')),
      //     //   $column(layoutSheet.spacingTiny, style({ alignItems: 'center', textDecoration: 'none' }))(
      //     //     $text(style({ fontSize: '.75em' }))(`${formatFixed(list[2].roi, 2)}%`),
      //     //     $column(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      //     //       $Link({
      //     //         route: config.parentRoute.create({ fragment: '2121212' }),
      //     //         $content: $AccountLabel(list[2].account, claimMap[list[2].account], style({ color: pallete.primary, fontSize: '1em' })),
      //     //         anchorOp: style({ minWidth: 0, zIndex: 222 }),
      //     //         url: `/${getChainName(config.chain)}/account/${list[2].account}`,
      //     //       })({ click: routeChangeTether() }),
      //     //       $defaultProfileSocialLink(list[2].account, config.chain, claimMap[list[2].account])
      //     //     )
      //     //   )
      //     // )
      //   )
      // }, newLocal)),




      $column(
        $row(style({ padding: screenUtils.isMobileScreen ? '0 12px' : '', marginBottom: '26px', alignItems: 'flex-end' }))(
          $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
            $infoTooltipLabel(
              `ROI (%) is defined as: Profits / Max Collateral (min $1000) * 100`,
              $text(style({ fontWeight: 'bold', fontSize: '1.15em' }))(`Highest ROI (%)`)
            ),
            $row(layoutSheet.spacing)(
              $infoTooltipLabel($column(layoutSheet.spacingSmall)(
                $text('The current amount accumulated through GMX rebate program, later to be rewarded to top traders in the end'),
                $text('it is calculated as Aggregated size fee * 0.15% (BLUBERRY Referral)'),
              ), 'Aggregated Size'),
              $text(style({
                fontSize: '1em',
                textShadow: `${colorAlpha(pallete.message, .5)} 1px 1px 20px, ${colorAlpha(pallete.message, .5)} 0px 0px 20px`
              }))(map(res => {
                return formatReadableUSD(res.size)
              }, competitionCumulativeRoi))
            ),
          ),
          $column(
            $row(layoutSheet.spacing, style({ placeContent: 'flex-end' }))(
              $infoTooltipLabel($column(layoutSheet.spacingSmall)(
                $text('The current amount accumulated through GMX rebate program, later to be rewarded to top traders in the end'),
                $text('it is calculated as Aggregated size fee * 0.15% (BLUBERRY Referral)'),
              ), 'Prize Pool'),
              $text(style({
                color: pallete.positive,
                fontSize: '2.25em',
                textShadow: `${pallete.positive} 1px 1px 20px, ${pallete.positive} 0px 0px 20px`
              }))(map(res => {
                return formatReadableUSD(getMarginFees(res.size) * 1500n / BASIS_POINTS_DIVISOR)
              }, competitionCumulativeRoi))
            ),

          )
        ),

        $CardTable({
          dataSource: tableList,
          columns: [

            {
              $head: $text('Account'),
              columnOp: style({ minWidth: '120px', flex: 1.2, alignItems: 'center' }),
              $$body: map((pos: IProfileTradingList) => {

                if (!pos.profile) {
                  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $alertTooltip($text(`Unclaimed profile remains below until claimed`)),
                    $anchor(clickAccountBehaviour)(
                      $accountPreview({ address: pos.account })
                    )
                    // style({ zoom: '0.7' })(
                    //   $alert($text('Unclaimed'))
                    // )
                  )
                }


                return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                  $row(style({ alignItems: 'baseline', zIndex: 5, textAlign: 'center', placeContent: 'center' }))(
                    $text(style({ fontSize: '.75em', width: '18px' }))(`${pos.rank}`),
                  ),
                  $Link({
                    $content: $profilePreview({ profile: pos.profile }),
                    route: config.parentRoute.create({ fragment: 'fefwef' }),
                    url: `/p/profile/${pos.account}/trading`
                  })({ click: routeChangeTether() }),
                )
              })
            },
            ...(screenUtils.isDesktopScreen ? [
              {
                $head: $text('Win/Loss'),
                columnOp: style({ maxWidth: '88px', alignItems: 'center', placeContent: 'center' }),
                $$body: map((pos: IProfileTradingList) => {
                  return $row(
                    $text(`${pos.winCount} / ${pos.lossCount}`)
                  )
                })
              },

            ] : []),

            {
              $head: $column(style({ textAlign: 'center' }))(
                $text('Profits $'),
                $text(style({ fontSize: '.75em' }))('Max Collateral'),
              ),
              columnOp: style({ placeContent: 'center', minWidth: '125px' }),
              $$body: map((pos) => {
                const val = formatReadableUSD(pos.pnl)
                const isNeg = pos.pnl < 0n


                return $column(layoutSheet.spacingTiny, style({ textAlign: 'center', fontSize: '.75em' }))(
                  $text(style({ color: isNeg ? pallete.negative : pallete.positive }))(
                    val
                  ),
                  $seperator,
                  $text(style({}))(formatReadableUSD(BigInt(pos.maxCollateral)))
                )
              })
            },
            {
              $head: $column(style({ placeContent: 'flex-end', alignItems: 'flex-end' }))(
                $text('Prize'),
                $text(style({ fontSize: '.75em' }))('ROI %'),
              ),
              columnOp: style({ flex: 1, alignItems: 'flex-end', placeContent: 'flex-end' }),
              $$body: snapshot((list, pos) => {
                const prize = prizeLadder[list.offset + list.page.indexOf(pos)]

                return $column(style({ alignItems: 'flex-end' }))(
                  prize
                    ? $row(
                      // $avaxIcon,
                      $text(style({ fontSize: '1.25em', color: pallete.positive }))(prize),
                    ) : empty(),

                  $text(style({ fontSize: '.75em' }))(`${formatFixed(pos.roi, 2)}%`)
                )
              }, tableList)
            }
          ],
        })({
          scrollIndex: requestCompetitionLadderTether(
            combine((chain, pageIndex) => {
              const params: IRequestCompetitionLadderApi = {
                chain,
                referralCode: BLUEBERRY_REFFERAL_CODE,
                maxCollateral: 1000000000000000000000000000000000n,
                from: start,
                to: end,
                offset: pageIndex * 20,
                pageSize: 20,
              }
              return params
            }, config.walletLink.network)
          )
        }),
      )

    ),

    {
      requestCompetitionLadder,
      // requestProfilePickList,
      routeChange
    }
  ]
})



