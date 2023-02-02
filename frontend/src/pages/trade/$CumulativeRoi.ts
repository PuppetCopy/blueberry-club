import { Behavior, combineObject } from '@aelea/core'
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $column, $row, $seperator, layoutSheet, screenUtils } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { awaitPromises, combine, empty, map, multicast, now, zip } from '@most/core'
import { Stream } from '@most/types'
import { formatReadableUSD, formatFixed, unixTimestampNow, IRequestCompetitionLadderApi, BASIS_POINTS_DIVISOR, getMarginFees, div, switchMap, gmxSubgraph, groupByKey } from '@gambitdao/gmx-middleware'
import { $alertTooltip, countdown } from './$rules'
import { IWalletLink } from '@gambitdao/wallet-link'
import { $accountPreview, $profilePreview } from '../../components/$AccountProfile'
import { blueberrySubgraph, BLUEBERRY_REFFERAL_CODE, IProfileTradingList, IProfileTradingResult, TOURNAMENT_START, TOURNAMENT_TIME_DURATION } from '@gambitdao/gbc-middleware'
import { $alert, $infoTooltipLabel, $Link } from '@gambitdao/ui-components'
import { $CardTable } from '../../components/$common'
import { IProfileActiveTab } from '../$Profile'
import { $addToCalendar, $responsiveFlex } from '../../elements/$common'
import { $defaultBerry } from '../../components/$DisplayBerry'

const MAX_COLLATERAL = 500000000000000000000000000000000n

const prizeRatioLadder: bigint[] = [3000n, 1500n, 750n, ...Array(17).fill(div(4750n, 17n) / BASIS_POINTS_DIVISOR)]


export interface ICompetitonTopCumulative {
  walletLink: IWalletLink
  parentRoute: Route
  competitionCumulativeRoi: Stream<IProfileTradingResult>
}



export const $CompetitionRoi = (config: ICompetitonTopCumulative) => component((
  [routeChange, routeChangeTether]: Behavior<any, string>,
  [requestCompetitionLadder, requestCompetitionLadderTether]: Behavior<number, IRequestCompetitionLadderApi>,
) => {

  const tableList = multicast(switchMap(res => {
    const accountList = res.list.page.map(a => a.account)

    return combine((gbcList, ensList) => {
      const gbcListMap = groupByKey(gbcList.filter(x => x?.id), x => x.id)
      const ensListMap = groupByKey(ensList.filter(x => x?.id), x => {
        return x.resolvedAddress.id
      })

      return {
        ...res.list,
        page: res.list.page.map(summary => {
          const profile = gbcListMap[summary.account]
          const ens = ensListMap[summary.account]

          return { ...summary, profile: profile ? { ...profile, ens } : null }
        })
      }
    }, awaitPromises(blueberrySubgraph.profilePickList(now(accountList))), awaitPromises(gmxSubgraph.getEnsProfileListPick(now(accountList))))
  }, config.competitionCumulativeRoi))

  const nowTime = unixTimestampNow()
  const started = nowTime >= TOURNAMENT_START



  const prizePool = map(res => {
    return getMarginFees(res.size) * 1500n / BASIS_POINTS_DIVISOR
  }, config.competitionCumulativeRoi)

  // pointer-events: none;
  // content: "";
  // position: absolute;
  // background: var(--clr-neon);
  // top: 120%;
  // left: 0;
  // width: 100%;
  // height: 100%;
  // transform: perspective(1em) rotateX(40deg) scale(1, 0.35);
  // filter: blur(1em);
  // opacity: 0.7;

  return [
    $column(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing)(

      // style({ alignSelf: 'center', maxWidth: '500px', marginBottom: '18px' })(
      //   $alert($text(`Results are being checked to ensure all data is accounted for. expected to finalize by Nov 25 12:00 UTC`)),
      // ),

      $column(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', fontSize: '1.15em', alignItems: 'center', placeContent: 'center' }))(
        $row(layoutSheet.spacing)(
          $column(style({ alignItems: 'center' }))(
            $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
              $text(style({ fontSize: screenUtils.isDesktopScreen ? '2.35em' : '1.95em', fontWeight: 'bold', color: pallete.primary, textShadow: `1px 1px 50px ${colorAlpha(pallete.primary, .45)}, 1px 1px 50px ${colorAlpha(pallete.primary, .25)} ` }))('#TopBlueberry'),
            ),
            $infoTooltipLabel(
              $column(layoutSheet.spacingSmall)(
                $text(`ROI (%) is defined as:`),
                $text(style({ fontSize: '.75em', fontStyle: 'italic' }))(`Profits / Max Collateral (min ${formatReadableUSD(MAX_COLLATERAL)}) * 100`),
              ),
              $text(style({ fontWeight: 'bold', fontSize: '1.15em', color: pallete.middleground }))(`Highest ROI (%)`)
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

      $node(),
      // style({ placeSelf: 'center' })(
      //   $alert(
      //     $text(`We are aware of missing data, a fix is coming soon, your data is SAFU!`)
      //   )
      // ),


      $column(layoutSheet.spacing)(
        $row(layoutSheet.spacing, style({ alignItems: 'flex-end' }))(
          $column(layoutSheet.spacingSmall, style({ flex: 1, alignSelf: screenUtils.isMobileScreen ? 'center' : '' }))(
            $responsiveFlex(layoutSheet.spacingSmall)(
              $infoTooltipLabel($column(layoutSheet.spacingSmall)(
                $text('The total volume accumulated between the 1st and 28th of each competition period'),
                $text('Higher volume means a higher prize pool'),
              ), 'Traded Volume'),
              $text(style({
                fontSize: '1.25em',
                textShadow: `${colorAlpha(pallete.message, .5)} 1px 1px 20px, ${colorAlpha(pallete.message, .5)} 0px 0px 20px`
              }))(map(res => {
                return formatReadableUSD(res.size)
              }, config.competitionCumulativeRoi))
            ),
          ),

          $responsiveFlex(layoutSheet.spacingSmall, style({ placeContent: 'flex-end' }))(
            $infoTooltipLabel(
              $column(layoutSheet.spacingSmall)(
                $text('The current accumulated amount from the GMX referral program will be rewarded to the top traders at the end'),
                $column(
                  $text('it is calculated as:'),
                  $text(style({ fontSize: '.75em', fontStyle: 'italic' }))('Traded Volume * .001 (Margin Fee) * .15 (BLUBERRY Referral)'),
                )
              ),
              'Prize Pool'
            ),
            $text(style({
              color: pallete.positive,
              fontSize: screenUtils.isDesktopScreen ? '2.25em' : '1.45em',
              textShadow: `${pallete.positive} 1px 1px 20px, ${pallete.positive} 0px 0px 20px`
            }))(map(amount => formatReadableUSD(amount), prizePool))
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
                    $alertTooltip($text(`Account requires Lab Identity, prize will be passed to the next participant if remained unclaimed`)),
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
                  $row(style({ alignItems: 'baseline', zIndex: 5, textAlign: 'center', placeContent: 'center' }))(
                    $text(style({ fontSize: '.75em', width: '10px' }))(`${pos.rank}`),
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
              columnOp: style({ placeContent: 'center', minWidth: '90px' }),
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

                // const prizeRatio = easeInExpo()
                // const usd1k = 10n ** 30n * 1000n
                // const particiapnts = formatFixed(prizePool / usd1k, 30)
                // total = rewards[i] = ((i + 1) ** 2) / total



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
            combine((params, pageIndex) => {
              const date = new Date()
              const started = unixTimestampNow() >= TOURNAMENT_START

              const from = started
                ? TOURNAMENT_START
                : Date.UTC(date.getFullYear(), date.getMonth() - 1, 1, 16) / 1000
              const to = from + TOURNAMENT_TIME_DURATION

              const reqParams: IRequestCompetitionLadderApi = {
                chain: params.chain,
                account: params.w3p?.address || null,
                referralCode: BLUEBERRY_REFFERAL_CODE,
                maxCollateral: MAX_COLLATERAL,
                from,
                to,
                offset: pageIndex * 20,
                pageSize: 20,
              }
              return reqParams
            }, combineObject({ w3p: config.walletLink.wallet, chain: config.walletLink.network })),
            multicast
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



