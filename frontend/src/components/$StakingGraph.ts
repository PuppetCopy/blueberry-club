import { Behavior, replayLatest, combineArray } from "@aelea/core"
import { $text, component, motion, MOTION_NO_WOBBLE, style } from "@aelea/dom"
import { $column, $NumberTicker, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { TREASURY_ARBITRUM, USD_PRECISION } from "@gambitdao/gbc-middleware"
import { formatReadableUSD, unixTimeTzOffset, intervalInMsMap, readableNumber, expandDecimals, formatFixed, IAccountQueryParamApi, ITimerange, intervalListFillOrderMap } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { map, multicast, now, skipRepeats,  fromPromise, skipRepeatsWith, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { LastPriceAnimationMode, LineStyle, SeriesMarker, Time, BarPrice, CrosshairMode, PriceScaleMode, MouseEventParams } from "lightweight-charts-baseline"
import { $card } from "../elements/$common"
import { IAllRewards, IPricefeedHistory, IPriceFeedHistoryMap, IStake, queryRewards, queryStakingEvents } from "../logic/query"
import { treasuryContract } from "../logic/stakingGraph"
import { ITreasuryTick } from "../types"
import { $Chart } from "./chart/$Chart"

export interface ITreasuryChart extends Partial<ITimerange> {
  walletLink: IWalletLink

  graphInterval: number

  priceFeedHistoryMap: Stream<IPriceFeedHistoryMap>
}


export const $StakingGraph = (config: ITreasuryChart)  => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {


  const queryParams: IAccountQueryParamApi & Partial<ITimerange> = {
    from: config.from || undefined,
    account: TREASURY_ARBITRUM
  }

  const historicRewards = replayLatest(multicast(fromPromise(queryRewards(queryParams))))
  
  const stakingEvents = fromPromise(queryStakingEvents(queryParams))


  // const accountBalanceState = replayLatest(multicast(accountTokenBalances))

  const stakingRewardsState =  replayLatest(multicast(treasuryContract.stakingRewards))


  const historicPortfolio = replayLatest(multicast(combineArray((staked, { gmx, glp, eth }, historicRewards, stakingRewardsState) => {
    const source = [
      ...gmx,
      // ...glp,

      ...staked.stakeGlps,
      ...staked.stakeGmxes,

      // rewards
      ...historicRewards.stakeGmxes,
      ...historicRewards.feeGmxTrackerClaims,
      ...historicRewards.feeGlpTrackerClaims,
      // ...historicRewards.stakedGmxTrackerClaims,
      // ...historicRewards.stakedGlpTrackerClaims,
    ].sort((a, b) => getTime(a) - getTime(b))
    
    const gmxPrice = BigInt(gmx[gmx.length - 1].c)
    const glpPrice = glp[glp.length - 1].c


    const seed: ITreasuryTick = {
      time: getTime(source[0]),
      gmxPrice,
      glpPrice,
      value: 0,
      valueWithRewards: 0n,
      valueWithRewardsUsd: 0,
      // esGmx: 0,
      // balanceEth: assetMap.eth.balanceUsd,
      glpUsd: 0n,
      gmxUsd: 0n,
      glp: 0n,
      gmx: 0n,
    }


    const filledGap = intervalListFillOrderMap({
      seed, source, getTime,
      interval: Math.floor(config.graphInterval / 1000),
      fillMap: fillRewards
    })

    const oldestTick = filledGap[filledGap.length - 1]

    const yearInMs = intervalInMsMap.MONTH * 12
    const endForecast = {
      ...oldestTick,
      time: Math.floor((Date.now() + yearInMs) / 1000)
    }

    const apr = formatFixed(stakingRewardsState.totalAprPercentage, 2)
    const perc = (apr / 100) / (yearInMs / config.graphInterval)


    const filledForecast = intervalListFillOrderMap({
      seed: oldestTick,
      source: [oldestTick, endForecast],
      getTime: (x) => x.time, 
      interval: Math.floor(config.graphInterval / 1000),
      fillMap (prev, next) {
        return { ...prev, value: prev.value + prev.value * perc }
      },
      fillGapMap(prev, next) {
        return { ...prev, value: prev.value + prev.value * perc }
      }
    })


    return { filledGap, staked, gmx, glp, filledForecast, historicRewards }
  }, stakingEvents, config.priceFeedHistoryMap, historicRewards, stakingRewardsState)))


  const hasSeriesFn = (cross: MouseEventParams): boolean => {
    const mode = !!cross?.seriesPrices?.size
    return mode
  }
  const pnlCrosshairMoveMode = skipRepeats(map(hasSeriesFn, pnlCrosshairMove))
  const pnlCrossHairChange = skipRepeats(map(change => {
    const newLocal = change.seriesPrices.entries()
    const newLocal_1 = newLocal.next()
    const value = newLocal_1?.value
    return value ? value[1] : null
  }, pnlCrosshairMove))
  const crosshairWithInitial = startWith(false, pnlCrosshairMoveMode)

  const lastTickFromHistory = <T extends {time: number}>(historicPnl: T[]) => map((cross: MouseEventParams) => {
    return historicPnl.find(tick => cross.time === tick.time)!
  })

  
  const chartPnLCounter = multicast(switchLatest(combineArray((mode, graph) => {
    if (mode) {
      return map(change => change, pnlCrossHairChange)
    } else {
      return now(graph.filledGap[graph.filledGap.length -1].value)
    }
  }, crosshairWithInitial, historicPortfolio)))

  return [
    $card(style({ padding: 0, width: '100%', flex: 'none', overflow: 'hidden', height: '300px', position: 'relative' }))(
      $row(style({ position: 'absolute', alignItems: 'center', zIndex: 10, left: 0, right: 0, pointerEvents: 'none', padding: '8px 26px' }))(
        $row(layoutSheet.spacing, style({ flex: 1, alignItems: 'flex-start' }))(
          switchLatest(map(({ esGmxInStakedGmx, totalRewardsUsd, totalEsGmxRewards }) => {
            
            return $column(layoutSheet.spacingTiny)(
              $text(style({ color: pallete.foreground, fontSize: '.65em', textAlign: 'center' }))('Compounding Rewards'),
              $row(layoutSheet.spacing)(
                $row(layoutSheet.spacing, style({ pointerEvents: 'all' }))(
                  $row(layoutSheet.spacingTiny, style({ alignItems: 'baseline' }))(
                    $text(style({ fontWeight: 'bold', fontSize: '1em' }))(`${readableNumber(formatFixed(esGmxInStakedGmx, 18))}`),
                    $text(style({ fontSize: '.75em', color: pallete.foreground, fontWeight: 'bold' }))(`esGMX`),
                  ),
                ),
              ),
            )
            // return $column(style({ alignItems: 'flex-start' }))(
            //   $row(style({ alignItems: 'baseline' }))(
            //     $row(layoutSheet.spacing, style({ pointerEvents: 'all' }))(
            //       $row(layoutSheet.spacingTiny, style({ alignItems: 'baseline' }))(
            //         $text(style({ fontWeight: 'bold', fontSize: '1em' }))(`${readableNumber(formatFixed(esGmxInStakedGmx, 18))}`),
            //         $text(style({ fontSize: '.75em', color: pallete.foreground, fontWeight: 'bold' }))(`esGMX`),
            //       ),
            //     )
            //   ),
            //   $text(style({ color: pallete.foreground, fontSize: '.65em', textAlign: 'center' }))('Staked esGMX')
            // )
          }, stakingRewardsState))
        ),
        $column(
          $text(style({ color: pallete.foreground, fontSize: '.65em', textAlign: 'center' }))('Total Hodlings'),
          $row(style({ fontSize: '2em', alignItems: 'baseline' }))(
            $text(style({ fontSize: '.45em', color: pallete.foreground, margin: '5px' }))('$'),
            $NumberTicker({
              textStyle: {
                fontWeight: 'bold',
                fontFamily: 'RelativeMono'
              },
              value$: map(Math.round, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, chartPnLCounter)),
              incrementColor: pallete.positive,
              decrementColor: pallete.negative
            }),
          ),
        ),
        $row(layoutSheet.spacing, style({ flex: 1, placeContent: 'flex-end' }))(
          switchLatest(map(({ totalEthRewards, totalEsGmxRewards, totalAvaxRewards }) => {
            
            return $column(layoutSheet.spacingTiny)(
              $text(style({ color: pallete.foreground, fontSize: '.65em', textAlign: 'center' }))('Pending Rewards'),
              $row(layoutSheet.spacing)(
                $row(layoutSheet.spacing, style({ pointerEvents: 'all' }))(
                  $row(layoutSheet.spacingTiny, style({ alignItems: 'baseline' }))(
                    $text(style({ fontWeight: 'bold', fontSize: '1em', color: pallete.positive }))(`+${readableNumber(formatFixed(totalEsGmxRewards, 18))}`),
                    $text(style({ fontSize: '.75em', color: pallete.foreground, fontWeight: 'bold' }))(`esGMX`),
                  ),
                ),
                $row(layoutSheet.spacing, style({ pointerEvents: 'all' }))(
                  $row(layoutSheet.spacingTiny, style({ alignItems: 'baseline' }))(
                    $text(style({ fontWeight: 'bold', fontSize: '1em', color: pallete.positive }))(`+${readableNumber(formatFixed(totalEthRewards, 18))}`),
                    $text(style({ fontSize: '.75em', color: pallete.foreground, fontWeight: 'bold' }))(`ETH`),
                  ),
                ),
                $row(layoutSheet.spacing, style({ pointerEvents: 'all' }))(
                  $row(layoutSheet.spacingTiny, style({ alignItems: 'baseline' }))(
                    $text(style({ fontWeight: 'bold', fontSize: '1em', color: pallete.positive }))(`+${readableNumber(formatFixed(totalAvaxRewards, 18))}`),
                    $text(style({ fontSize: '.75em', color: pallete.foreground, fontWeight: 'bold' }))(`AVAX`),
                  ),
                ),
              ),
            )
          }, stakingRewardsState))
        )
      ),
      switchLatest(
        combineArray((data) => {
          // const startDate = new Date(data[0].time * 1000)
          // const endDate = new Date(data[data.length - 1].time * 1000)
            

          return $Chart({
            initializeSeries: map((api) => {
              const lastTick = data.filledGap[data.filledGap.length - 1]


              const seriesForecast = api.addAreaSeries({
                baseLineWidth: 1,
                priceLineWidth: 1,
                priceLineVisible: false,
                lastValueVisible: false,
                lineWidth: 2,
                topColor: pallete.foreground,
                bottomColor: 'transparent',
                lastPriceAnimation: LastPriceAnimationMode.Disabled,
                // autoscaleInfoProvider: () => {},
                // title: 'Forecast',
                lineStyle: LineStyle.LargeDashed,
                lineColor: pallete.foreground,
              })

              seriesForecast.priceScale().applyOptions({
                scaleMargins: {
                  top: 0.41,
                  bottom: 0
                }
              })



              const glpSeries = api.addAreaSeries({
                lineWidth: 2,
                lineColor: pallete.primary,
                topColor: pallete.primary,
                bottomColor: 'transparent',
                baseLineVisible: false,
                priceLineVisible: false
              })

              const rewards = [
                ...data.historicRewards.feeGlpTrackerClaims,
                ...data.historicRewards.feeGmxTrackerClaims,
                ...data.historicRewards.stakedGlpTrackerClaims,
                ...data.historicRewards.stakedGmxTrackerClaims,
              ].reduce((seed, next) => {

                seed[next.timestamp] ??= {}
                seed[next.timestamp][next.__typename] = next

                return seed
              }, {} as any)


              const addGlps = Object.entries(rewards)
                .map(([time, obj]): SeriesMarker<Time> => {

                  // @ts-ignore
                  const stakedGmxUsd = (obj['StakedGlpTrackerClaim']?.amountUsd || 0n) + (obj['StakedGmxTrackerClaim']?.amountUsd || 0n)
                  // @ts-ignore
                  const feeGmxUsd = (obj['FeeGlpTrackerClaim']?.amountUsd || 0n) + (obj['FeeGmxTrackerClaim']?.amountUsd || 0n)

                  const rewardUsd = formatReadableUSD(stakedGmxUsd + feeGmxUsd)
                  const esGmxMsg = stakedGmxUsd ? `+$${rewardUsd}` : ''

                  return {
                    color: pallete.foreground,
                    position: "aboveBar",
                    shape: "circle",
                    size: 1,
                    time: unixTimeTzOffset(Number(time)),
                    text: `${esGmxMsg}`
                  }
                })



              const forecastData = data.filledForecast.filter(x => x.time > lastTick.time)
              // const rewardsData = data.filledGap.map(x => ({ time: x.time, value: x.valueWithRewardsUsd }))
              // // @ts-ignore
              // rewardsSeries.setData(rewardsData)
              // @ts-ignore
              seriesForecast.setData(forecastData)
              // @ts-ignore
              glpSeries.setData(data.filledGap)

              const from = data.filledGap[0].time as Time
              const to = (data.filledGap[data.filledGap.length - 1].time + (intervalInMsMap.HR24 * 12 / 1000)) as Time
              // series.coordinateToPrice()
              setTimeout(() => {
                glpSeries.setMarkers([...addGlps].sort((a, b) => Number(a.time) - Number(b.time)))
                api.timeScale().setVisibleRange({ from, to })
              }, 35)


              return glpSeries
            }),
            chartConfig: {
              localization: {
                priceFormatter: (priceValue: BarPrice) => {
                  return `$${readableNumber(priceValue)}`
                }
              },
              layout: {
                fontFamily: "RelativeMono",
                backgroundColor: 'transparent',
                textColor: pallete.foreground,
                fontSize: 11
              },
              crosshair: {
                mode: CrosshairMode.Magnet,
                horzLine: {
                  // visible: false,
                  labelBackgroundColor: pallete.foreground,
                  labelVisible: false,
                  color: pallete.foreground,
                  width: 1,
                  style: LineStyle.SparseDotted,
                },
                vertLine: {
                  color: pallete.foreground,
                  labelBackgroundColor: pallete.foreground,
                  width: 1,
                  style: LineStyle.SparseDotted,
                }
              },
              rightPriceScale: {
                mode: PriceScaleMode.Normal,
                autoScale: true,

                visible: false,
                scaleMargins: {
                  top: 0.45,
                  bottom: 0,
                }
              },
              // overlayPriceScales: {
              //   invertScale: true
              // },
              // handleScale: false,
              // handleScroll: false,
              timeScale: {
                // rightOffset: 110,
                secondsVisible: false,
                timeVisible: true,
                rightOffset: 0,
                fixLeftEdge: true,
                // fixRightEdge: true,
                // visible: false,
                rightBarStaysOnScroll: true,
              },
            },
            containerOp: style({
              position: 'absolute', left: 0, top: 0, right: 0, bottom: 0
            }),
          })({
            crosshairMove: pnlCrosshairMoveTether(
              skipRepeatsWith((a, b) => a.point?.x === b.point?.x),
              multicast
            )
          })
            
        }, historicPortfolio)
      )
    ),
    
    { pnlCrosshairMove }
  ]
})



function getTime(next: IPricefeedHistory | IStake | IAllRewards): number {
  return Number(next.timestamp)
}

function fillRewards (prev: ITreasuryTick, next: IPricefeedHistory | IStake | IAllRewards): ITreasuryTick {
  if (next.__typename === 'StakeGmx') {
    const addGmx = BigInt(next.amount)
    const addGmxUsd = formatFixed(prev.gmxPrice * addGmx / USD_PRECISION, 30)
    const isWalletStaked = addGmxUsd > 1000
    const gmx = isWalletStaked ? prev.gmx + addGmx : prev.gmx
    const gmxUsd = (prev.gmxPrice * gmx / USD_PRECISION)

    const valueWithRewards = prev.gmx + addGmx

    return { ...prev, time: next.timestamp, gmxUsd, gmx, valueWithRewards }
  }

  if (next.__typename === 'StakeGlp') {
    const addGlp = next.amount
    const glp = prev.glp + BigInt(addGlp)
    const glpUsd = expandDecimals(prev.glpPrice * glp / USD_PRECISION, 12)

    return { ...prev, time: next.timestamp, glp, glpUsd }
  }

  if (next.__typename === 'StakedGlpTrackerClaim' || next.__typename === 'StakedGmxTrackerClaim' || next.__typename === 'FeeGmxTrackerClaim' || next.__typename === 'FeeGlpTrackerClaim') {
    const addAmountUsd = formatFixed(BigInt(next.amountUsd), 30)
    const value = prev.value + addAmountUsd

    return { ...prev, time: next.timestamp, value }
  }

  if (next.__typename === 'PricefeedHistory') {

    if (next.feed === '_0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a') {
      const balanceGmx = prev.gmxPrice * prev.gmx / USD_PRECISION
      const balanceEsGmx = prev.gmxPrice * prev.valueWithRewards / USD_PRECISION
      const value = formatFixed(balanceGmx + prev.glpUsd, 30)
      const valueWithRewardsUsd = formatFixed(balanceEsGmx + prev.glpUsd, 30)

      return { ...prev, time: next.timestamp, value, valueWithRewardsUsd, gmxPrice: BigInt(next.c) }
    }

    if (next.feed === '_0x321F653eED006AD1C29D174e17d96351BDe22649') {
      const glpPrice = next.c
      const balanceGlp = expandDecimals(glpPrice * prev.glp / USD_PRECISION, 12)
      const gmxBalance = prev.gmxUsd

      const value = formatFixed(gmxBalance + balanceGlp, 30)
      const time = Number(next.id)

      return { ...prev, time, value, glpPrice }
    }

    if (next.feed === '_0x82af49447d8a07e3bd95bd0d56f35241523fbab1') {
      const glpPrice = next.c
      const balanceGlp = expandDecimals(glpPrice * prev.glp / USD_PRECISION, 12)
      const gmxBalance = prev.gmxUsd

      const value = formatFixed(gmxBalance + balanceGlp, 30)
      const time = Number(next.id)

      return { ...prev, time, value, glpPrice }
    }



  }



  return { ...prev, time: next.timestamp }
}

export function bnToHex(n: bigint) {
  return '0x' + n.toString(16)
}
