import { Behavior, combineObject } from '@aelea/core'
import { $element, $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $column, $row, $seperator, layoutSheet, screenUtils } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { awaitPromises, combine, empty, map, mergeArray, now, zip } from '@most/core'
import { Stream } from '@most/types'
import { formatReadableUSD, formatFixed, unixTimestampNow, IRequestCompetitionLadderApi, switchMap, gmxSubgraph, groupByKey, IAccountLadderSummary, USD_PERCISION } from '@gambitdao/gmx-middleware'
import { $alertTooltip, countdown } from './$rules'
import { IWalletLink } from '@gambitdao/wallet-link'
import { $accountPreview, $profilePreview } from '../../components/$AccountProfile'
import { blueberrySubgraph, BLUEBERRY_REFFERAL_CODE, IProfileTradingSummary, IProfileTradingResult, TOURNAMENT_START, TOURNAMENT_TIME_DURATION } from '@gambitdao/gbc-middleware'
import { $anchor, $infoTooltipLabel, $Link, ISortBy } from '@gambitdao/ui-components'
import { $CardTable } from '../../components/$common'
import { IProfileActiveTab } from '../$Profile'
import { $addToCalendar, $responsiveFlex } from '../../elements/$common'
import { $defaultBerry } from '../../components/$DisplayBerry'
import { $defaultProfileContainer } from '../../common/$avatar'

const MAX_COLLATERAL = 500000000000000000000000000000000n

export interface ICompetitonCumulativePnl {
  walletLink: IWalletLink
  parentRoute: Route
  competitionCumulative: Stream<IProfileTradingResult>
}



export const $CompetitionPnl = (config: ICompetitonCumulativePnl) => component((
  [routeChange, routeChangeTether]: Behavior<any, string>,
  [sortByChange, sortByChangeTether]: Behavior<ISortBy<IAccountLadderSummary>, ISortBy<IAccountLadderSummary>>,
  [pageIndex, pageIndexTether]: Behavior<number, number>,
) => {

  const tableList = switchMap(res => {
    const accountList = res.list.page.map(a => a.account)
    return combine((gbcList, ensList) => {
      const gbcListMap = groupByKey(gbcList.filter(x => x?.id), x => x.id)
      const ensListMap = groupByKey(ensList, x => x.domain.resolvedAddress.id)

      return {
        ...res.list,
        page: res.list.page.map(summary => {
          const profile = gbcListMap[summary.account]
          const ens = ensListMap[summary.account]

          return { ...summary, profile: profile ? { ...profile, ens } : null }
        })
      }
    }, awaitPromises(blueberrySubgraph.profilePickList(now(accountList))), awaitPromises(gmxSubgraph.getEnsProfileListPick(now(accountList))))
  }, config.competitionCumulative)

  const nowTime = unixTimestampNow()
  const started = nowTime >= TOURNAMENT_START


  const sortBy: Stream<ISortBy<IAccountLadderSummary>> = mergeArray([
    now({ direction: 'desc', selector: 'pnl' }),
    sortByChange
  ])


  return [
    $column(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing)(

      $node(),

      $column(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', alignItems: 'center', placeContent: 'center' }))(

        $row(layoutSheet.spacing)(
          $column(style({ alignItems: 'center' }))(
            $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
              $text(style({ fontSize: screenUtils.isDesktopScreen ? '2.35em' : '1.95em', fontWeight: 'bold', color: pallete.primary, textShadow: `1px 1px 50px ${colorAlpha(pallete.primary, .45)}, 1px 1px 50px ${colorAlpha(pallete.primary, .25)} ` }))('#TopBlueberry'),
            ),
            $infoTooltipLabel(
              $column(layoutSheet.spacingSmall)(
                $text(`Cumulative PnL gives larger rewards to participants with higher PnLs`),
                $text(`Cumulative PnL is defined as:`),
                $text(style({ fontSize: '.75em', fontStyle: 'italic' }))(`(Prize Pool / Total profits of all participants) * PnL of participant`),
                $text(`To participate:`),
                $element('ul')(
                  $element('li')(
                    $text('Own a GBC')
                  ),
                  $element('li')(
                    $text('Have a Lab Identity, go to Wardrobe, choose your GBC & click “Set PFP”')
                  ),
                  $element('li')(
                    $text('Start trading on GBC Trading or use/click '),
                    $anchor(attr({ href: 'https://gmx.io/?ref=BLUEBERRY' }))($text('BLUEBERRY')),
                    $text(' to opt our referral on GMX.io.')
                  ),
                ),
                $node(
                  $text('see '), $anchor(attr({ href: 'https://mirror.xyz/gbc.eth/gxgsTaz8nJyLP1NDUaw_vpnuwjR-2-j2mZfD1GKRtLQ' }))(
                    $text(`Full Competition Rules`)
                  ), $text(' for more details')
                ),
              ),
              $text(style({ fontWeight: 'bold', fontSize: '1.15em', color: pallete.middleground }))(`Cumulative PnL (%)`)
            ),
          ),
        ),
        started
          ? $column(
            $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
              $text(style({ fontSize: '1.25em', color: pallete.indeterminate }))('LIVE!'),
              $text(style({ color: pallete.foreground }))('Ending in')
            ),
            $text(style({ fontSize: '1.25em' }))(countdown(TOURNAMENT_START + TOURNAMENT_TIME_DURATION))
          )
          : $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $addToCalendar({
              time: new Date(TOURNAMENT_START * 1000),
              title: 'Blueberry Trading Compeition',
              description: `Monthly trading competitions will be held. These tournaments will offer cash prizes, unique lab items, and more as rewards for traders who compete and win.  \n\n${document.location.href}`
            }),
            $column(
              $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
                $text(style({ fontSize: '1.25em' }))('Next Cycle!'),
                $text(style({ color: pallete.foreground }))('Starting in')
              ),
              $text(style({ fontSize: '1.25em' }))(countdown(TOURNAMENT_START))
            )
          )
      ),

      $column(layoutSheet.spacing)(
        $row(layoutSheet.spacing, style({ alignItems: 'flex-end' }))(
          $column(layoutSheet.spacingSmall, style({ flex: 1, alignSelf: screenUtils.isMobileScreen ? 'center' : '' }))(
            $responsiveFlex(layoutSheet.spacingSmall)(
              $infoTooltipLabel($column(layoutSheet.spacingSmall)(
                $text('The total volume accumulated between the 1st and 28th of each competition period'),
                $text('Higher volume means a higher prize pool'),
              ), 'Traded Volume'),
              $text(style({ fontSize: '1.25em' }))(map(res => {
                return formatReadableUSD(res.size)
              }, config.competitionCumulative))
            ),
          ),

          $responsiveFlex(layoutSheet.spacingSmall, style({ placeContent: 'flex-end' }))(
            style({ flexDirection: 'row-reverse' })(
              $infoTooltipLabel(
                $column(layoutSheet.spacingSmall)(
                  $text('The current accumulated amount from the GMX referral program will be rewarded to the top traders at the end'),
                  $column(
                    $text('it is calculated as:'),
                    $text(style({ fontSize: '.75em', fontStyle: 'italic' }))('Traded Volume * .001 (Margin Fee) * .15 (BLUBERRY Referral)'),
                  )
                ),
                'Prize Pool'
              )
            ),
            $text(style({
              color: pallete.positive,
              fontSize: screenUtils.isDesktopScreen ? '2.25em' : '2em',
              textShadow: `${pallete.positive} 1px 1px 20px, ${pallete.positive} 0px 0px 20px`
            }))(map(params => formatReadableUSD(params.prizePool), config.competitionCumulative))
          ),
        ),

        $CardTable({
          dataSource: tableList,
          sortBy,
          columns: [
            {
              $head: $text('Account'),
              columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
              $$body: map((pos: IProfileTradingSummary) => {

                if (!pos.profile) {
                  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $alertTooltip($text(`Account requires Lab Identity, prize will be passed to the next participant if remained unclaimed`)),
                    $Link({
                      $content: $accountPreview({ address: pos.account, $container: $defaultProfileContainer(style({ minWidth: '50px' })) }),
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


                const $container = pos.rank < 4
                  ? $defaultBerry(style(
                    {
                      width: '50px',
                      minWidth: '50px',
                      border: `1px solid ${pallete.message}`,
                      boxShadow: `${colorAlpha(pallete.positive, .4)} 0px 3px 20px 5px`
                    }
                    // pos.rank === 1 ? {
                    //   minWidth: '50px',
                    //   width: '60px',
                    //   border: `1px solid ${pallete.positive}`,
                    //   boxShadow: `${colorAlpha(pallete.positive, .4)} 0px 3px 20px 5px`
                    // }
                    //   : pos.rank === 2 ? {
                    //     minWidth: '50px',
                    //     width: '60px',
                    //     border: `1px solid ${pallete.indeterminate}`,
                    //     boxShadow: `${colorAlpha(pallete.indeterminate, .4)} 0px 3px 20px 5px`
                    //   }
                    //     : {
                    //       minWidth: '50px',
                    //       width: '60px',
                    //       border: `1px solid ${pallete.negative}`,
                    //       boxShadow: `${colorAlpha(pallete.negative, .4)} 0px 3px 20px 5px`
                    //     }

                  ))
                  : $defaultBerry(style({ width: '50px', minWidth: '50px', }))

                return $row(layoutSheet.spacingSmall, style({ alignItems: 'center', minWidth: 0, }))(
                  $row(style({ alignItems: 'baseline', zIndex: 5, textAlign: 'center', minWidth: '18px', placeContent: 'center' }))(
                    $text(style({ fontSize: '.75em' }))(`${pos.rank}`),
                  ),
                  $Link({
                    $content: $profilePreview({ profile: pos.profile, $container }),
                    route: config.parentRoute.create({ fragment: 'fefwef' }),
                    url: `/p/profile/${pos.account}/${IProfileActiveTab.TRADING.toLowerCase()}`
                  })({ click: routeChangeTether() }),
                )
              })
            },
            ...(screenUtils.isDesktopScreen ? [
              {
                $head: $text('Win / Loss'),
                columnOp: style({ maxWidth: '88px', alignItems: 'center', placeContent: 'center' }),
                $$body: map((pos: IProfileTradingSummary) => {
                  return $row(
                    $text(`${pos.winCount} / ${pos.lossCount}`)
                  )
                })
              },

            ] : []),
            {
              $head: $column(style({ textAlign: 'right' }))(
                $text('Profits'),
                $text(style({ fontSize: '.75em' }))('Max Collateral'),
              ),
              sortBy: 'pnl',
              columnOp: style({ placeContent: 'flex-end', minWidth: '90px' }),
              $$body: map((pos) => {
                const val = formatReadableUSD(pos.pnl)
                const isNeg = pos.pnl < 0n


                return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
                  $text(style({ color: isNeg ? pallete.negative : pallete.positive }))(
                    val
                  ),
                  $seperator,
                  $text(style({ fontSize: '.75em' }))(formatReadableUSD(BigInt(pos.maxCollateral)))
                )
              })
            },
            {
              $head: $column(style({ placeContent: 'flex-end' }))(
                $text('Prize'),
                $text(style({ fontSize: '.75em' }))('ROI'),
              ),
              sortBy: 'roi',
              columnOp: style({ minWidth: '90px', placeContent: 'flex-end' }),
              $$body: zip((params, pos) => {
                const prize = pos.pnl > USD_PERCISION ? params.prizePool * pos.pnl / params.totalScore : 0n

                return $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end' }))(
                  prize
                    ? $text(style({ fontSize: '1.25em', color: pallete.positive }))(formatReadableUSD(prize))
                    : empty(),

                  $text(`${formatFixed(pos.roi, 2)}%`)
                )
              }, config.competitionCumulative)
            }
          ],
        })({
          sortBy: sortByChangeTether(),
          scrollIndex: pageIndexTether()
        }),
      )

    ),

    {
      requestCompetitionLadder: map((params) => {
        const date = new Date()
        const started = unixTimestampNow() >= TOURNAMENT_START

        const from = started
          ? TOURNAMENT_START
          : Date.UTC(date.getFullYear(), date.getMonth() - 1, 1, 16) / 1000
        const to = from + TOURNAMENT_TIME_DURATION

        const reqParams: IRequestCompetitionLadderApi = {
          ...params.sortBy,
          chain: params.chain,
          account: params.w3p?.address || null,
          referralCode: BLUEBERRY_REFFERAL_CODE,
          maxCollateral: MAX_COLLATERAL,
          metric: 'pnl',
          from,
          to,
          offset: params.pageIndex * 20,
          pageSize: 20,
        }


        return reqParams
      }, combineObject({
        sortBy: sortBy, pageIndex,
        w3p: config.walletLink.wallet,
        chain: config.walletLink.network
      })
      ),
      // requestProfilePickList,
      routeChange
    }
  ]
})



