import { Behavior, replayLatest } from '@aelea/core'
import { $text, attr, component, nodeEvent, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $column, $icon, $row, $seperator, layoutSheet, screenUtils } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { combine, empty, map, multicast, snapshot, take, zip } from '@most/core'
import { Stream } from '@most/types'
import { formatReadableUSD, formatFixed, unixTimestampNow, IRequestCompetitionLadderApi, getChainName, BASIS_POINTS_DIVISOR, getMarginFees, div } from '@gambitdao/gmx-middleware'
import { $alertTooltip, countdown } from './$rules'
import { CHAIN, IWalletLink } from '@gambitdao/wallet-link'
import { $AccountLabel, $accountPreview, $profilePreview } from '../../components/$AccountProfile'
import { BLUEBERRY_REFFERAL_CODE, IProfile, IProfileTradingList, IProfileTradingResult, TOURNAMENT_START_END, TOURNAMENT_START_PERIOD } from '@gambitdao/gbc-middleware'
import { $anchor, $infoTooltipLabel, $Link } from '@gambitdao/ui-components'
import { $berryByToken } from '../../logic/common'
import { $CardTable } from '../../components/$common'
import { IProfileActiveTab } from '../$Profile'
import { $addToCalendar, $responsiveFlex } from '../../elements/$common'
import { $gmxLogo } from '../../common/$icons'
import { $ButtonSecondary, $defaultMiniButtonSecondary } from '../../components/form/$Button'

const MAX_COLLATERAL = 1000000000000000000000000000000000n

const prizeRatioLadder: bigint[] = [3000n, 1500n, 750n, ...Array(7).fill(div(4750n, 7n) / BASIS_POINTS_DIVISOR)]


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
  // const start = TOURNAMENT_START_PERIOD
  const start = 0
  const end = TOURNAMENT_START_END

  const tableList = replayLatest(map(res => {
    return res.list
  }, config.competitionCumulativeRoi))

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

    return $column(layoutSheet.spacing)(
      $column(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', fontSize: '1.15em', alignItems: 'center', placeContent: 'center' }))(
        $row(layoutSheet.spacing)(
          $column(style({ textAlign: 'right' }))(
            $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
              $text(style({ fontSize: '2.35em', fontWeight: 'bold', color: pallete.primary, textShadow: `1px 1px 50px ${colorAlpha(pallete.primary, .45)}, 1px 1px 50px ${colorAlpha(pallete.primary, .25)} ` }))('#TopBlueberry'),
            ),
          ),
        ),
        ended
          ? $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $addToCalendar({
              // time: start,
              time: new Date(Date.UTC(new Date().getFullYear(), 1, 1, 16)),
              title: 'Blueberry Trading Compeition',
              description: `Monthly trading competitions will be held. These tournaments will offer cash prizes, unique lab items, and more as rewards for traders who compete and win.  \n\n${document.location.href}`
            }),
            $column(
              $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
                $text(style({ fontSize: '1.25em' }))('Next Cycle!'),
                $text(style({ color: pallete.foreground }))('Starting in')
              ),
              $text(style({ fontSize: '1.25em' }))(countdown(Date.UTC(new Date().getFullYear(), 1, 1, 16) / 1000))
            )
          )
          : $column(
            $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
              $text(style({ fontSize: '1.25em', color: pallete.indeterminate }))('Beta LIVE!'),
              $text(style({ color: pallete.foreground }))('Ending in')
            ),
            $text(style({ fontSize: '1.25em' }))(countdown(end))
          )
      ),

      // $anchor(style({ fontSize: '.65em', placeSelf: 'center' }), attr({ href: 'https://medium.com/@gmx.io/' }))(
      //   $text('$50,000 GBC #GAMBIT ROI Trading Contest')
      // )
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

  const prizePool = map(res => {
    return getMarginFees(res.size) * 1500n / BASIS_POINTS_DIVISOR
  }, config.competitionCumulativeRoi)


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

      // $Link({
      //   $content: $ButtonSecondary({
      //     $container: $defaultMiniButtonSecondary,
      //     $content: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
      //       $icon({
      //         $content: $gmxLogo, width: '16px',
      //         fill: pallete.middleground,
      //         svgOps: style({ minWidth: '36px' }), viewBox: '0 0 32 32'
      //       }),
      //       $text('Trade')
      //     )
      //   })({}),
      //   url: '/p/trade', route: config.parentRoute.create({ fragment: 'feefwefwe' })
      // })({
      //   // $Link({ $content: $pageLink($gmxLogo, 'Trade'), url: '/p/trade', disabled: now(false), route: parentRoute.create({ fragment: 'feefwefwe' }) })({
      //   click: routeChangeTether()
      // }),


      $column(
        $responsiveFlex(layoutSheet.spacing, style({ padding: screenUtils.isMobileScreen ? '0 12px' : '', marginBottom: '26px', alignItems: 'flex-end' }))(
          $column(layoutSheet.spacingSmall, style({ flex: 1, alignSelf: screenUtils.isMobileScreen ? 'center' : '' }))(
            $infoTooltipLabel(
              `ROI (%) is defined as: Profits / Max Collateral (min $${formatReadableUSD(MAX_COLLATERAL)}) * 100`,
              $text(style({ fontWeight: 'bold', fontSize: '1.15em' }))(`Highest ROI (%)`)
            ),
            $row(layoutSheet.spacing)(
              $infoTooltipLabel($column(layoutSheet.spacingSmall)(
                $text('The amount traded using'),
                $text('it is calculated as Traded Volume fees * 0.15% (BLUBERRY Referral)'),
              ), 'Traded Volume'),
              $text(style({
                fontSize: '1em',
                textShadow: `${colorAlpha(pallete.message, .5)} 1px 1px 20px, ${colorAlpha(pallete.message, .5)} 0px 0px 20px`
              }))(map(res => {
                return formatReadableUSD(res.size)
              }, config.competitionCumulativeRoi))
            ),
          ),

          $row(layoutSheet.spacingSmall, style({ placeContent: 'flex-end' }))(
            $infoTooltipLabel($column(
              $text('The current accumulated amount from the GMX referral program will be rewarded to the top traders at the end'),
              $text('it is calculated as Aggregated size fee * 0.15% (BLUBERRY Referral)'),
            ), 'Prize Pool'),
            $text(style({
              color: pallete.positive,
              fontSize: '2.25em',
              textShadow: `${pallete.positive} 1px 1px 20px, ${pallete.positive} 0px 0px 20px`
            }))(map(amount => '$' + formatReadableUSD(amount), prizePool))
          ),

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
                    $alertTooltip($text(`Unidentified profile remains below until claimed`)),
                    $Link({
                      $content: $accountPreview({ address: pos.account }),
                      route: config.parentRoute.create({ fragment: 'fefwef' }),
                      url: `/p/profile/${pos.account}/${IProfileActiveTab.TRADING.toLowerCase()}`
                    })({ click: routeChangeTether() }),
                    // $anchor(clickAccountBehaviour)(
                    //   $accountPreview({ address: pos.account })
                    // )
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
                    url: `/p/profile/${pos.account}/${IProfileActiveTab.TRADING.toLowerCase()}`
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
              $$body: zip((prizePool, pos) => {
                const prizeRatio = prizeRatioLadder[pos.rank - 1]

                return $column(style({ alignItems: 'flex-end' }))(
                  prizeRatio
                    ? $row(
                      // $avaxIcon,
                      $text(style({ fontSize: '1.25em', color: pallete.positive }))(formatReadableUSD(prizePool * prizeRatio / BASIS_POINTS_DIVISOR)),
                    ) : empty(),

                  $text(style({ fontSize: '.75em' }))(`${formatFixed(pos.roi, 2)}%`)
                )
              }, prizePool)
            }
          ],
        })({
          scrollIndex: requestCompetitionLadderTether(
            combine((chain, pageIndex) => {
              const params: IRequestCompetitionLadderApi = {
                chain,
                referralCode: BLUEBERRY_REFFERAL_CODE,
                maxCollateral: MAX_COLLATERAL,
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



