import { Behavior, combineObject } from '@aelea/core'
import { $element, $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $card, $column, $row, layoutSheet, screenUtils } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { empty, map, mergeArray, now, snapshot, switchLatest } from '@most/core'
import { Stream } from '@most/types'
import { formatReadableUSD, IAccountSummary, formatToBasis, readableNumber, importGlobal } from '@gambitdao/gmx-middleware'
import { $alertTooltip, countdown } from './$rules'
import { IWalletLink } from '@gambitdao/wallet-link'
import { $accountPreview, $profilePreview } from '../../components/$AccountProfile'
import { BLUEBERRY_REFFERAL_CODE, IBlueberryLadder, IProfileTradingResult, TOURNAMENT_START, TOURNAMENT_DURATION, TOURNAMENT_NEXT, COMPETITION_METRIC_LIST, TOURNAMENT_TIME_ELAPSED, IRequestCompetitionLadderApi } from '@gambitdao/gbc-middleware'
import { $anchor, $infoLabel, $infoLabeledValue, $infoTooltipLabel, $Link, invertColor, ISortBy } from '@gambitdao/ui-components'
import { $CardTable } from '../../components/$common'
import { IProfileActiveTab } from '../$Profile'
import { $addToCalendar, $responsiveFlex } from '../../elements/$common'
import { $defaultBerry } from '../../components/$DisplayBerry'
import { $defaultProfileContainer } from '../../common/$avatar'
import { $seperator2 } from '../common'

const MAX_COLLATERAL = 500000000000000000000000000000000n

const METRIC_LABEL = {
  [COMPETITION_METRIC_LIST[0]]: 'PnL',
  [COMPETITION_METRIC_LIST[1]]: 'ROI',
} as const


export interface ICompetitonCumulativeRoi {
  walletLink: IWalletLink
  parentRoute: Route
  competitionCumulative: Stream<IProfileTradingResult>
}



export const $CumulativePnl = (config: ICompetitonCumulativeRoi) => component((
  [routeChange, routeChangeTether]: Behavior<any, string>,
  [sortByChange, sortByChangeTether]: Behavior<ISortBy<IAccountSummary>, ISortBy<IAccountSummary>>,
  [pageIndex, pageIndexTether]: Behavior<number, number>,
) => {

  const tableList = map(res => {
    return res.list
  }, config.competitionCumulative)

  const ended = TOURNAMENT_DURATION === TOURNAMENT_TIME_ELAPSED
  const currentMetric = COMPETITION_METRIC_LIST[new Date().getUTCMonth() % 2]
  const currentMetricLabel = METRIC_LABEL[currentMetric]


  const sortBy: Stream<ISortBy<IAccountSummary>> = mergeArray([
    now({ direction: 'desc', selector: currentMetric }),
    sortByChange
  ])


  const crateLoadEvent = importGlobal(import('@widgetbot/crate'))


  return [
    $column(style({ flex: 1 }), screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing)(

      $column(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', alignItems: 'center', placeContent: 'center' }))(

        $row(layoutSheet.spacing)(
          $column(style({ alignItems: 'center' }))(
            $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
              $text(style({ fontSize: '1.95em', fontWeight: 'bold', color: pallete.primary, textShadow: `1px 1px 20px ${colorAlpha(pallete.primary, .25)}, 1px 1px 50px ${colorAlpha(pallete.primary, .25)} ` }))('#TopBlueberry'),
            ),
            $infoTooltipLabel(
              $column(layoutSheet.spacingSmall, style({ width: '300px' }))(
                $text(`Participant prize formula:`),
                $text(style({ fontSize: '.75em', fontStyle: 'italic' }))(`Prize = Prize Pool * ${currentMetricLabel} of participant / sum ${currentMetricLabel} of all winners`),
                currentMetric === COMPETITION_METRIC_LIST[1]
                  ? $text(style({ fontSize: '.75em', fontStyle: 'italic' }))(map(res => {
                    return `ROI = (Total PnL / Max Collateral [Min ${formatReadableUSD(res.averageMaxCollateral)}]) * 100`
                  }, config.competitionCumulative))
                  : empty(),
                $text(style({ fontSize: '.75em', fontStyle: 'italic' }))(`Max Collateral represents the highest amount used for open positions at any point. Reinvesting profits or reusing collateral from closed trades won't affect Max Collateral.`),
                currentMetric === COMPETITION_METRIC_LIST[1]
                  ? $text(style({ fontSize: '.75em', fontStyle: 'italic' }))(map(res => {
                    return `The Minimum Max Collateral is the average for all winners, currently ${formatReadableUSD(res.averageMaxCollateral)}. Winners prizes are always calculated using a Max Collateral above the minimum.`
                  }, config.competitionCumulative))
                  : empty(),

                // currentMetric === COMPETITION_METRIC_LIST[1]
                //   ? $infoLabeledValue(
                //     'Current Floor Max Collateral',
                //     $text(style({ color: pallete.positive }))(map(res => {
                //       return formatReadableUSD(res.averageMaxCollateral)
                //     }, config.competitionCumulative))
                //   )
                //   : empty(),
                $node(),
                $column(
                  $text(`To participate:`),
                  $element('ul')(
                    $element('li')(
                      $text('Own a GBC')
                    ),
                    $element('li')(
                      $text('Start trading on GBC Trading or use/click '),
                      $anchor(attr({ href: 'https://gmx.io/?ref=BLUEBERRY' }))($text('BLUEBERRY')),
                      $text(' to opt our referral on GMX.io.')
                    ),
                  ),
                ),
                // $node(
                //   $text('see '), $anchor(attr({ href: 'https://mirror.xyz/gbc.eth/Oy90Ssp0KDsCtR0TWoAZ4N9cJ2t_yj8xR1bNLKtx7aQ' }))(
                //     $text(`Full Competition Rules`)
                //   ), $text(' for more details')
                // ),
              ),
              $text(style({ fontWeight: 'bold', color: pallete.middleground }))(`Highest ${currentMetricLabel}`)
            ),
          ),
        ),
        ended
          ? $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $column(
              $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
                $text(style({ fontSize: '1.25em' }))('Next Cycle!'),
                $text(style({ color: pallete.foreground }))('Starting in')
              ),
              $text(style({ fontSize: '1.25em' }))(countdown(TOURNAMENT_NEXT))
            )
          )
          : $column(
            $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
              $text(style({ fontSize: '1.25em', color: pallete.indeterminate }))('LIVE!'),
              $text(style({ color: pallete.foreground }))('Ending in')
            ),
            $text(style({ fontSize: '1.25em' }))(countdown(TOURNAMENT_START + TOURNAMENT_DURATION))
          )
      ),

      $column(
        switchLatest(
          map(Crate => {

            const trollbox = new Crate({
              server: '941356283234250772',
              channel: '1068946527021695168',
              // css: '"height": 100px; display: none;'
            })

            return empty()
          }, crateLoadEvent)
        )
      ),


      $column(layoutSheet.spacing)(
        $row(layoutSheet.spacing, style({ alignItems: 'flex-end' }))(
          $column(layoutSheet.spacingSmall, style({ flex: 1, alignSelf: screenUtils.isMobileScreen ? 'center' : '' }))(
            $responsiveFlex(layoutSheet.spacingSmall)(
              $infoTooltipLabel($column(layoutSheet.spacingSmall)(
                $text('The total volume accumulated between the 1st and 26th of each month'),
                $text('Higher volume means a higher prize pool'),

                style({
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                })(
                  $infoLabeledValue(
                    'Current Traded Volume',
                    $text(style({ color: pallete.positive }))(map(res => {
                      return formatReadableUSD(res.size)
                    }, config.competitionCumulative))
                  )
                )
              ), 'Traded Volume'),
              $text(map(res => {
                return '~' + formatReadableUSD(res.estSize)
              }, config.competitionCumulative))
            ),
          ),

          $responsiveFlex(layoutSheet.spacingSmall, style({ placeContent: 'flex-end', alignItems: 'flex-end' }))(
            style({ flexDirection: 'row-reverse' })(
              $infoTooltipLabel(
                $column(layoutSheet.spacingSmall)(
                  $text('The estimated amount distirbuted to all top traders by competition end results'),

                  $infoLabeledValue(
                    'Current Prize Pool',
                    $text(style({ color: pallete.positive }))(map(res => {
                      return formatReadableUSD(res.prizePool)
                    }, config.competitionCumulative))
                  ),

                  $column(
                    $text('Current Prize Pool formula:'),
                    $text(style({ fontSize: '.75em', fontStyle: 'italic' }))('Traded Volume * .001 (Margin Fee) * .15 (BLUBERRY Referral)'),
                  ),

                  $column(
                    $text('Estimated Prize Pool formula:'),
                    $text(style({ fontSize: '.75em', fontStyle: 'italic' }))('Current Prize Pool * Competition Duration / Duration Elapsed'),
                  ),


                ),
                'Prize Pool'
              )
            ),
            $text(style({
              color: pallete.positive,
              fontSize: '1.65em',
              textShadow: `${pallete.positive} 1px 1px 15px`
            }))(map(params => '~' + formatReadableUSD(params.estPrizePool), config.competitionCumulative))
          ),
        ),

        $CardTable({
          dataSource: tableList,
          sortBy,
          columns: [
            {
              $head: $text('Account'),
              columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
              $$body: snapshot((w3p, pos: IBlueberryLadder) => {

                if (!pos.profile) {
                  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $alertTooltip($text(`This account requires GBC to receive the prize once competition ends`)),
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

                return $row(layoutSheet.spacingSmall, w3p?.address === pos.account ? style({ background: invertColor(pallete.message), borderRadius: '15px', padding: '6px 12px' }) : style({}), style({ alignItems: 'center', minWidth: 0 }))(
                  $row(style({ alignItems: 'baseline', zIndex: 5, textAlign: 'center', minWidth: '18px', placeContent: 'center' }))(
                    $text(style({ fontSize: '.75em' }))(`${pos.rank}`),
                  ),
                  $Link({
                    $content: $profilePreview({ profile: pos.profile, $container }),
                    route: config.parentRoute.create({ fragment: 'fefwef' }),
                    url: `/p/profile/${pos.account}/${IProfileActiveTab.TRADING.toLowerCase()}`
                  })({ click: routeChangeTether() }),
                )
              }, config.walletLink.wallet)
            },
            ...(screenUtils.isDesktopScreen ? [
              {
                $head: $text('Win / Loss'),
                columnOp: style({ maxWidth: '88px', alignItems: 'center', placeContent: 'center' }),
                $$body: map((pos: IBlueberryLadder) => {
                  return $row(
                    $text(`${pos.winCount} / ${pos.lossCount}`)
                  )
                })
              },

            ] : []),
            currentMetric === 'pnl'
              ? {
                $head: $column(style({ textAlign: 'right' }))(
                  $text(style({ fontSize: '.75em' }))('Cum. Collateral'),
                  $text('Cum. Size'),
                ),
                sortBy: 'pnl',
                columnOp: style({ placeContent: 'flex-end', minWidth: '90px' }),
                $$body: map((pos) => {
                  const val = formatReadableUSD(pos.cumSize, false)

                  return $column(style({ gap: '3px', textAlign: 'right' }))(
                    $text(style({ fontSize: '.75em' }))(formatReadableUSD(pos.cumCollateral, false)),
                    $seperator2,
                    $text(
                      val
                    ),
                  )
                })
              }
              : {
                $head: $column(style({ textAlign: 'right' }))(
                  $text(style({ fontSize: '.75em' }))('Total PnL'),
                  $text('Max Collateral'),
                ),
                sortBy: 'pnl',
                columnOp: style({ placeContent: 'flex-end', minWidth: '90px' }),
                $$body: map((pos) => {

                  return $column(layoutSheet.spacingTiny, style({ gap: '3px', textAlign: 'right' }))(
                    $text(style({ fontSize: '.75em' }))(formatReadableUSD(pos.pnl, false)),
                    $seperator2,
                    $text(formatReadableUSD(pos.maxCollateral, false))
                  )
                })
              },
            {
              $head: $column(style({ textAlign: 'right' }))(
                $text(style({ fontSize: '.75em' }))(currentMetricLabel),
                $text('Prize'),
              ),
              sortBy: 'score',
              columnOp: style({ minWidth: '90px', alignItems: 'center', placeContent: 'flex-end' }),
              $$body: map(pos => {
                const metricVal = pos.score

                const newLocal = readableNumber(formatToBasis(metricVal) * 100)
                const pnl = currentMetric === 'pnl' ? formatReadableUSD(metricVal, false) : `${Number(newLocal)} %`

                return $column(layoutSheet.spacingTiny, style({ gap: '3px', textAlign: 'right' }))(
                  $text(style({ fontSize: '.75em' }))(pnl),
                  $seperator2,
                  pos.prize > 0n
                    ? $text(style({ color: pallete.positive }))(formatReadableUSD(pos.prize, false))
                    : empty(),
                )
              }),
            }
          ],
        })({
          sortBy: sortByChangeTether(),
          scrollIndex: pageIndexTether()
        }),

        $card(style({ position: 'fixed', placeContent: 'space-between', flexDirection: 'row', bottom: 0, background: pallete.horizon, padding: '20px', borderRadius: '20px 20px 0 0', zIndex: 10, width: '100%', maxWidth: '780px' }))(
          $column(
            // style({ fontSize: '.75em' })(
            //   $infoLabel('Previous competition results')
            // ),

            // $anchor(attr({
            //   href: '/p/feb-roi-old'
            // }))(
            //   $text('Previous competition results')
            // )
          ),

          $row(layoutSheet.spacingSmall)(
            $addToCalendar({
              time: new Date(TOURNAMENT_NEXT * 1000),
              title: 'Blueberry Trading Compeition',
              description: `Monthly trading competitions will be held. These tournaments will offer cash prizes, unique lab items, and more as rewards for traders who compete and win.  \n\n${document.location.href}`
            }),
            $column(
              style({ fontSize: '.75em' })(
                $infoLabel('Next Competition')
              ),
              $text(METRIC_LABEL[COMPETITION_METRIC_LIST[new Date(TOURNAMENT_NEXT * 1000).getUTCMonth() % 2]])
            ),
          )
        )

      )

    ),

    {
      requestCompetitionLadder: map((params) => {
        const from = TOURNAMENT_START
        const to = from + TOURNAMENT_DURATION

        const reqParams: IRequestCompetitionLadderApi = {
          ...params.sortBy,
          chain: params.chain,
          account: params.w3p?.address || null,
          referralCode: BLUEBERRY_REFFERAL_CODE,
          maxCollateral: MAX_COLLATERAL,
          metric: currentMetric,
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



