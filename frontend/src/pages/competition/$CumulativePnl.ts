import { Behavior, combineObject, replayLatest } from '@aelea/core'
import { $element, $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $card, $column, $row, layoutSheet, screenUtils } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { Contract, ContractTransaction } from '@ethersproject/contracts'
import { CHAIN } from '@gambitdao/const'
import { ERC20__factory } from '@gambitdao/gbc-contracts'
import { BLUEBERRY_REFFERAL_CODE, COMPETITION_METRIC_LIST, getCompetitionSchedule, IBlueberryLadder, IProfileTradingResult, IRequestCompetitionLadderApi } from '@gambitdao/gbc-middleware'
import { ARBITRUM_ADDRESS, formatReadableUSD, formatToBasis, IAccountSummary, importGlobal, readableNumber, unixTimestampNow } from '@gambitdao/gmx-middleware'
import { $anchor, $infoLabel, $infoLabeledValue, $infoTooltipLabel, $Link, invertColor, ISortBy } from '@gambitdao/ui-components'
import { IWalletLink, IWalletState } from '@gambitdao/wallet-link'
import { awaitPromises, combine, empty, fromPromise, map, mergeArray, multicast, now, switchLatest } from '@most/core'
import { Stream } from '@most/types'
import { BigNumber } from 'ethers'
import { IProfileActiveTab } from '../$Profile'
import { $accountPreview, $profilePreview } from '../../components/$AccountProfile'
import { $CardTable } from '../../components/$common'
import { $defaultBerry } from '../../components/$DisplayBerry'
import { $ButtonPrimaryCtx, $defaultMiniButtonSecondary } from '../../components/form/$Button'
import { $accountIconLink, $addToCalendar, $responsiveFlex } from '../../elements/$common'
import { PriceFeed__factory, VaultPriceFeed__factory } from '../../logic/gmx-contracts'
import { $seperator2 } from '../common'
import { $alertTooltip, countdown } from './$rules'

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
  [clickPoolDistributorClaim, clickPoolDistributorClaimTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,
) => {

  const historyParam = Number(new URLSearchParams(document.location.search).get('history') || 0)
  const poolDistributor = replayLatest(multicast(awaitPromises(map(async provider => {

    const [balance, priceFeed] = await Promise.all([
      ERC20__factory.connect(ARBITRUM_ADDRESS.NATIVE_TOKEN, provider).balanceOf('0xEd6265F1030186dd09cAEb1B827078aC0f6EE970'),
      VaultPriceFeed__factory.connect(ARBITRUM_ADDRESS.VaultPriceFeed, provider).getPrimaryPrice(ARBITRUM_ADDRESS.NATIVE_TOKEN, false)
    ])


    const fundUsd = balance.toBigInt() * priceFeed.toBigInt() / 10n ** 18n

    return fundUsd
  }, config.walletLink.defaultProvider))))


  const unixTime = unixTimestampNow()
  const competitionSchedule = getCompetitionSchedule(unixTime, historyParam)


  const tableList = map(res => {
    return res.list
  }, config.competitionCumulative)

  const currentMetric = COMPETITION_METRIC_LIST[competitionSchedule.date.getUTCMonth() % 2]
  const currentMetricLabel = METRIC_LABEL[currentMetric]


  const sortBy: Stream<ISortBy<IAccountSummary>> = mergeArray([
    now({ direction: 'desc', selector: currentMetric }),
    sortByChange
  ])


  const crateLoadEvent = importGlobal(import('@widgetbot/crate'))



  const $description = currentMetric === COMPETITION_METRIC_LIST[1]
    ? [
      $text(style({ fontSize: '.75em', fontStyle: 'italic' }))(map(res => {
        return `ROI = (Total PnL / Max Collateral [Min ${formatReadableUSD(res.averageMaxCollateral)}]) * 100`
      }, config.competitionCumulative)),
      $text(style({ fontSize: '.75em', fontStyle: 'italic' }))(map(res => {
        return `The Minimum Max Collateral is the average for all winners, currently ${formatReadableUSD(res.averageMaxCollateral)}. Winners prizes are always calculated using a Max Collateral above the minimum.`
      }, config.competitionCumulative))
    ]
    : []



  const accountRewardInfo = (w3p: IWalletState) => {
    const poolDistributor = new Contract('0xEd6265F1030186dd09cAEb1B827078aC0f6EE970', poolDistributorAbi, w3p.provider.getSigner())
    const proxyFactoryContract = new Contract('0x2ff2f1D9826ae2410979ae19B88c361073Ab0918', proxyFactoryAbi, w3p.provider.getSigner())

    const muxAccountProxyQuery = proxyFactoryContract.getProxiesOf(w3p.address).then(([containerAccount]: string[]) => containerAccount || null) as Promise<string | null>

    const queryContract = fromPromise(Promise.all([
      muxAccountProxyQuery,
      poolDistributor.rewardForWinner(w3p.address).then((bn: BigNumber) => bn.toBigInt()) as Promise<bigint>,
      muxAccountProxyQuery.then(containerAccount => {
        if (!containerAccount) {
          return 0n
        }

        return poolDistributor.rewardForWinner(containerAccount).then((bn: BigNumber) => bn.toBigInt())
      }) as Promise<bigint>,
      poolDistributor.epoch().then((bn: BigNumber) => bn.toBigInt()) as Promise<bigint>,
    ]))


    return map(([containerAccount, lateBloomerRewardAmount, muxAccountRewardAmount, poolEpoch]) => {
      return { containerAccount, proxyFactoryContract, poolDistributor, lateBloomerRewardAmount, muxAccountRewardAmount, poolEpoch }
    }, queryContract)
  }


  const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(competitionSchedule.date)

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

                $text(`Top Blueberry is a monthly competition rewarding the best GBC traders. The prize pool is 100% of the total trading referral fees collected during the competition period. The prize pool is distributed as follows:`),
                $node(),

                $text(`Participant prize formula:`),
                $text(style({ fontSize: '.75em', fontStyle: 'italic' }))(`Prize = Prize Pool * ${currentMetricLabel} of participant / sum ${currentMetricLabel} of all winners`),

                ...$description,

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
        historyParam
          ? $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
              $text(style({ fontSize: '1.25em' }))(dateLabel),
            )
          )
          : competitionSchedule.ended
            ? $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $column(
                $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
                  $text(style({ fontSize: '1.25em' }))('Next Cycle!'),
                  $text(style({ color: pallete.foreground }))('Starting in')
                ),
                $text(style({ fontSize: '1.25em' }))(countdown(competitionSchedule.next))
              )
            )
            : $column(
              $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
                $text(style({ fontSize: '1.25em', color: pallete.indeterminate }))('LIVE!'),
                $text(style({ color: pallete.foreground }))('Ending in')
              ),
              $text(style({ fontSize: '1.25em' }))(countdown(competitionSchedule.end))
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
                return '~' + formatReadableUSD(res.metrics.estSize)
              }, config.competitionCumulative))
            ),
          ),

          $responsiveFlex(layoutSheet.spacingSmall, style({ placeContent: 'flex-end', alignItems: 'flex-end' }))(
            style({ flexDirection: 'row-reverse' })(
              $infoTooltipLabel(
                $column(layoutSheet.spacingSmall)(
                  $text('A breakdown of the total prize pool'),


                  switchLatest(map(res => {

                    return $column(
                      $infoLabeledValue(
                        'Current Fee Pool',
                        $text(style({ color: pallete.positive }))(formatReadableUSD(res.metrics.feePool))
                      ),
                      $column(
                        $text('Current Prize Pool formula:'),
                        $text(style({ fontSize: '.75em', fontStyle: 'italic' }))(`Traded Volume * .001 (Margin Fee) * ${Number(res.metrics.feeMultiplier) / 10000} (BLUBERRY Referral)`),
                      ),
                    )
                  }, config.competitionCumulative)),
                                    
                  $column(
                    $infoLabeledValue(
                      'Estimated Fee Pool',
                      $text(style({ color: pallete.positive }))(map(res => {
                        return formatReadableUSD(res.metrics.estFeePool)
                      }, config.competitionCumulative))
                    ),
                    $column(
                      $text('Estimated Fee Pool formula:'),
                      $text(style({ fontSize: '.75em', fontStyle: 'italic' }))('Current Fee Pool * Competition Duration / Duration Elapsed'),
                    )
                  ),


                  $column(
                    $infoLabeledValue(
                      'Unclaimed Fee Pool',
                      $text(style({ color: pallete.positive }))(map(res => {
                        return formatReadableUSD(res)
                      }, poolDistributor))
                    ),
                    $text('Prizes that have not been claimed by non-holders on Arbitrum'), $accountIconLink('0xEd6265F1030186dd09cAEb1B827078aC0f6EE970')
                  ),

                ),
                'Est. Prize Pool'
              )
            ),
            $text(style({
              color: pallete.positive,
              fontSize: '1.65em',
              textShadow: `${pallete.positive} 1px 1px 15px`
            }))(map(params => '~' + formatReadableUSD((params.chain === CHAIN.ARBITRUM ? params.poolDistributor : 0n) + params.competitionCumulative.metrics.estFeePool), combineObject({ poolDistributor, competitionCumulative: config.competitionCumulative, chain: config.walletLink.network })))
          ),
        ),

        $CardTable({
          dataSource: tableList,
          sortBy,
          columns: [
            {
              $head: $text('Account'),
              columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
              $$body: combine((w3p, pos: IBlueberryLadder) => {
                const profileSize = screenUtils.isDesktopScreen ? '50px' : '45px'
                const isConnectedAccount = w3p?.address === pos.account

                const $container = pos.rank < 4
                  ? $defaultBerry(style(
                    {
                      borderRadius: '50%',
                      width: profileSize,
                      minWidth: profileSize,
                      border: `1px solid ${pallete.message}`,
                      boxShadow: `${colorAlpha(pallete.positive, .4)} 0px 3px 20px 5px`
                    }
                  ))
                  : $defaultBerry(style({ width: profileSize, minWidth: profileSize, }))


                const $profile = !pos.profile
                  ? $Link({
                    $content: $accountPreview({ address: pos.account, $container, labelSize: '16px' }),
                    route: config.parentRoute.create({ fragment: 'fefwef' }),
                    url: `/p/profile/${pos.account}/${IProfileActiveTab.TRADING.toLowerCase()}`
                  })({ click: routeChangeTether() })
                  : $Link({
                    $content: $profilePreview({ profile: pos.profile, $container, labelSize: '16px' }),
                    route: config.parentRoute.create({ fragment: 'fefwef' }),
                    url: `/p/profile/${pos.account}/${IProfileActiveTab.TRADING.toLowerCase()}`
                  })({ click: routeChangeTether() })

                if (!isConnectedAccount) {
                  return $row(layoutSheet.spacingSmall, style({ padding: '6px 12px', position: 'relative', alignItems: 'center', minWidth: 0 }))(
                    $text(style({ right: '100%', top: '50%', transform: 'translate(3px, -50%)', fontWeight: 'bold', fontSize: '.55em', position: 'absolute', }))(`${pos.rank}`),
                    $profile
                  )
                }

                return $responsiveFlex(layoutSheet.spacingSmall)(
                  $row(layoutSheet.spacingSmall, style({ padding: '6px 12px', position: 'relative', alignItems: 'center', minWidth: 0 }), isConnectedAccount ? style({ background: invertColor(pallete.message), borderRadius: '15px' }) : style({}))(
                    $text(style({ right: '100%', top: '50%', transform: 'translate(3px, -50%)', fontWeight: 'bold', fontSize: '.55em', position: 'absolute', }))(`${pos.rank}`),
                    $profile
                  ),

                  switchLatest(map(params => {
                    const isMuxContainer = params?.containerAccount?.toLowerCase() === pos.account
                    const accountAsMux = isConnectedAccount && isMuxContainer
                    const rewardAmount = params?.muxAccountRewardAmount || params?.lateBloomerRewardAmount || 0n

                    return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                      rewardAmount > 0n
                        ? $row(layoutSheet.spacingSmall)(

                          params.lateBloomerRewardAmount > 0n ? $ButtonPrimaryCtx({
                            ctx: clickPoolDistributorClaim,
                            $content: $text('Claim'),
                            disabled: now(!pos.profile),
                            $container: $defaultMiniButtonSecondary
                          })({
                            click: clickPoolDistributorClaimTether(
                              map((router) => {
                                const profile = pos.profile!

                                return params.poolDistributor.claim(profile.profile?.id, w3p.address)
                              }),
                              // multicast
                            )
                          }) : empty(),
                          params.muxAccountRewardAmount > 0n || accountAsMux ? $ButtonPrimaryCtx({
                            ctx: clickPoolDistributorClaim,
                            $content: $text('Mux Claim'),
                            disabled: now(!pos.profile),
                            $container: $defaultMiniButtonSecondary
                          })({
                            click: clickPoolDistributorClaimTether(
                              map((router) => {
                                const profile = pos.profile!

                                return params.poolDistributor.muxClaim(profile.profile?.id, params.containerAccount, w3p.address)
                              }),
                              multicast
                            )
                          }) : empty()

                        ) : empty(),

                      params.poolEpoch === BigInt(competitionSchedule.epoch)
                        ? $alertTooltip($text('Rewards has not been distributed yet, awaiting multi-sig approval'))
                        : !pos.profile ? $alertTooltip($text(`To claim a reward, you must hold a GBC in your wallet`)) : empty(),
                    )
                  }, accountRewardInfo(w3p)))
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
            style({ fontSize: '.75em' })(
              $infoLabel('Previous results')
            ),

            $anchor(attr({
              href: '/p/leaderboard' + `?history=${historyParam + 1}`
            }))(
              $text(new Intl.DateTimeFormat('en-US', { month: 'long' }).format(competitionSchedule.previous * 1000) + ' results')
            )
          ),

          historyParam ?
            $column(
              style({ fontSize: '.75em' })(
                $infoLabel('Next results')
              ),

              $anchor(attr({
                href: '/p/leaderboard' + `?history=${historyParam - 1}`
              }))(
                $text(new Intl.DateTimeFormat('en-US', { month: 'long' }).format(competitionSchedule.next * 1000) + ' results')
              )
            )
            : $row(layoutSheet.spacingSmall)(
              $addToCalendar({
                time: new Date(competitionSchedule.next * 1000),
                title: 'Blueberry Trading Compeition',
                description: `Monthly trading competitions will be held. These tournaments will offer cash prizes, unique lab items, and more as rewards for traders who compete and win.  \n\n${document.location.href}`
              }),
              $column(
                style({ fontSize: '.75em' })(
                  $infoLabel('Next Competition')
                ),
                $text(METRIC_LABEL[COMPETITION_METRIC_LIST[new Date(competitionSchedule.next * 1000).getUTCMonth() % 2]])
              ),
            )
        )

      )

    ),

    {
      requestCompetitionLadder: map((params) => {
        const from = competitionSchedule.start
        const to = from + competitionSchedule.duration

        const reqParams: IRequestCompetitionLadderApi = {
          ...params.sortBy,
          schedule: competitionSchedule,
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



export const proxyFactoryAbi = [
  { inputs: [{ internalType: "address", name: "account", type: "address" }], name: "getProxiesOf", outputs: [{ internalType: "address[]", name: "", type: "address[]" }], stateMutability: "view", type: "function" }
] as const
export const poolDistributorAbi = [{ inputs: [{ internalType: "contract Authority", name: "_authority", type: "address" }, { internalType: "contract IERC721", name: "_token", type: "address" }, { internalType: "address", name: "_owner", type: "address" }], stateMutability: "nonpayable", type: "constructor" }, { inputs: [], name: "AlreadyClaimed", type: "error" }, { inputs: [], name: "LengthMismatch", type: "error" }, { inputs: [], name: "NotClaimable", type: "error" }, { inputs: [], name: "NotContainerOwner", type: "error" }, { inputs: [], name: "NotOwnerOfToken", type: "error" }, { inputs: [], name: "NotWinner", type: "error" }, { inputs: [], name: "TokenAlreadyUsed", type: "error" }, { inputs: [], name: "ZeroAddress", type: "error" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "user", type: "address" }, { indexed: true, internalType: "contract Authority", name: "newAuthority", type: "address" }], name: "AuthorityUpdated", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "sender", type: "address" }, { indexed: true, internalType: "address", name: "winner", type: "address" }, { indexed: true, internalType: "address", name: "receiver", type: "address" }, { indexed: false, internalType: "uint256", name: "reward", type: "uint256" }], name: "Claim", type: "event" }, { anonymous: false, inputs: [{ indexed: false, internalType: "uint256", name: "unclaimedRewards", type: "uint256" }, { indexed: false, internalType: "uint256", name: "newRewards", type: "uint256" }, { indexed: true, internalType: "uint256", name: "epoch", type: "uint256" }], name: "Distribute", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "user", type: "address" }, { indexed: true, internalType: "address", name: "newOwner", type: "address" }], name: "OwnershipTransferred", type: "event" }, { anonymous: false, inputs: [{ indexed: false, internalType: "bool", name: "claimable", type: "bool" }], name: "SetClaimable", type: "event" }, { inputs: [], name: "authority", outputs: [{ internalType: "contract Authority", name: "", type: "address" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "uint256", name: "_tokenID", type: "uint256" }, { internalType: "address", name: "_receiver", type: "address" }], name: "claim", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [], name: "claimable", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "uint256", name: "_newRewards", type: "uint256" }, { internalType: "uint256[]", name: "_rewardsList", type: "uint256[]" }, { internalType: "address[]", name: "_winnersList", type: "address[]" }], name: "distribute", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [], name: "epoch", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "_container", type: "address" }], name: "getMuxContainerOwner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "uint256", name: "_tokenID", type: "uint256" }], name: "isTokenClaimed", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "uint256", name: "_tokenID", type: "uint256" }, { internalType: "address", name: "_container", type: "address" }, { internalType: "address", name: "_receiver", type: "address" }], name: "muxClaim", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "", type: "address" }], name: "muxContainerOwner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" }, { inputs: [], name: "owner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "_winner", type: "address" }], name: "rewardForWinner", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "contract Authority", name: "newAuthority", type: "address" }], name: "setAuthority", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "bool", name: "_claimable", type: "bool" }], name: "setClaimable", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [], name: "token", outputs: [{ internalType: "contract IERC721", name: "", type: "address" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "newOwner", type: "address" }], name: "transferOwnership", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "_winner", type: "address" }], name: "winnerClaimed", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" }] as const

