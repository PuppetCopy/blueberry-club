import { Behavior, replayLatest, combineArray } from "@aelea/core"
import { $text, component, motion, MOTION_NO_WOBBLE, style } from "@aelea/dom"
import { $column, $NumberTicker, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IWalletLink } from "@gambitdao/wallet-link"
import {
  intervalTimeMap, readableNumber, formatFixed, IRequestTimerangeApi, unixTimestampNow, intervalListFillOrderMap,
  IStake, getTokenUsd, ITokenDescription, div, getDenominator, formatReadableUSD,
  BASIS_POINTS_DIVISOR, readableDate, ARBITRUM_ADDRESS, CHAIN_ADDRESS_MAP, getTokenDescription
} from "@gambitdao/gmx-middleware"
import { empty, map, multicast, now, skipRepeats, skipRepeatsWith, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import {
  LastPriceAnimationMode, LineStyle, Time, BarPrice, CrosshairMode,
  PriceScaleMode, MouseEventParams, SeriesMarker
} from "lightweight-charts"
import { $card, $responsiveFlex } from "../elements/$common"
import { IRewardsStream } from "../logic/contract"
import { IAsset } from "@gambitdao/gbc-middleware"
import { $Chart } from "./chart/$Chart"
import { getIntervalBasedOnTimeframe } from "@gambitdao/ui-components"
import { getMappedValue } from "../logic/common"

export interface IValueInterval extends IAsset {
  price: bigint
  change: bigint
}


export interface IStakingFeedDescription {
  tokenDescription: ITokenDescription
  feedAddress: string
  tokenAddress: string
}


export interface ITreasuryChart extends Partial<IRequestTimerangeApi> {
  walletLink: IWalletLink
  sourceList: Stream<IStake[]>
  stakingInfo: IRewardsStream
}



export const $StakingGraph = (config: ITreasuryChart) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {


  const historicPortfolio = replayLatest(multicast(combineArray((chain, stakingInfo, sourceList) => {
    const source: IStake[] = sourceList.sort((a, b) => a.timestamp - b.timestamp)

    const from = source[0].timestamp
    const to = source[sourceList.length - 1].timestamp // unixTimestampNow()
    const interval = getIntervalBasedOnTimeframe(160, from, to)


    const seed: { time: number, change: number, value: number, sourceMap: { [k: string]: IValueInterval } } = {
      value: 0,
      sourceMap: {},
      change: 0,
      time: source[0].timestamp
    }

    const accumulatedAssetMap: { [k: string]: bigint } = {}

    const filledGap = intervalListFillOrderMap({
      seed,
      source,
      getTime: x => x.timestamp,
      interval,
      fillMap: (prev, next) => {

        const prevSource = prev.sourceMap[next.token] || {
          balance: 0n,
          balanceUsd: 0n,
          price: 0n,
          change: 0n,
        }

        const nextSource = { ...prevSource }

        const sourceMap = {
          ...prev.sourceMap,
          [next.token]: nextSource
        }


        const desc = getTokenDescription(next.token.slice(1) as any)
        const amountRatio = div(next.amount, getDenominator(desc.decimals)) / BASIS_POINTS_DIVISOR
        const tokenPrice = div(next.amountUsd, amountRatio) / BASIS_POINTS_DIVISOR

        nextSource.balance = nextSource.balance + next.amount
        nextSource.price = tokenPrice
        const nextBalanceUsd = getTokenUsd(next.amount, tokenPrice, desc.decimals)
        nextSource.balanceUsd = prevSource.balanceUsd + nextBalanceUsd
        nextSource.change = nextBalanceUsd

        console.log(
          readableDate(next.timestamp),
          next.id,
          desc.symbol,
          formatReadableUSD(nextSource.balanceUsd),
          'change',
          formatReadableUSD(nextBalanceUsd),
        )


        const value = formatFixed(Object.values(sourceMap).reduce((s, n) => s + n.balanceUsd, 0n), 30)
        const change = formatFixed(Object.values(sourceMap).reduce((s, n) => s + n.change, 0n), 30)


        return {
          sourceMap, value, change,
          time: next.timestamp
        }
      },
    })

    const oldestTick = filledGap[filledGap.length - 1]

    const yearInMs = intervalTimeMap.MONTH * 12
    const endForecast = {
      ...oldestTick,
      value: 0,
      time: unixTimestampNow() + yearInMs
    }

    const apr = formatFixed(stakingInfo.totalAprPercentage, 2)
    const perc = (apr / 100) / (yearInMs / interval)



    const filledForecast = intervalListFillOrderMap({
      seed: oldestTick,
      source: [oldestTick, endForecast],
      getTime: (x) => x.time,
      interval,
      fillMap(prev) {
        return { ...prev, value: prev.value + prev.value * perc }
      },
      fillGapMap(prev) {
        return { ...prev, value: prev.value + prev.value * perc }
      }
    })

    endForecast.value = filledForecast[filledForecast.length - 2].value


    return {
      filledForecast, sourceList, chain, from, to,
      filledGap: filledGap.map(x => ({ time: x.time, value: x.value, change: x.change }))
    }
  }, config.walletLink.network, config.stakingInfo, config.sourceList)))


  const hasSeriesFn = (cross: MouseEventParams): boolean => {
    const mode = !!cross?.seriesData?.size
    return mode
  }

  const pnlCrosshairMoveMode = skipRepeats(map(hasSeriesFn, pnlCrosshairMove))

  const pnlCrossHairChange = skipRepeats(map(change => {
    const newLocal = change.seriesData.entries()
    const newLocal_1 = newLocal.next()
    const value = newLocal_1?.value
    return value ? value[1] : null
  }, pnlCrosshairMove))

  const crosshairWithInitial = startWith(false, pnlCrosshairMoveMode)

  const chartPnLCounter = multicast(switchLatest(combineArray((mode, graph) => {
    if (mode) {
      return map(change => change, pnlCrossHairChange)
    } else {
      return now(graph.filledGap[graph.filledGap.length - 1].value)
    }
  }, crosshairWithInitial, historicPortfolio)))

  return [
    $card(style({ padding: 0, width: '100%', flex: 'none', overflow: 'hidden', height: '300px', position: 'relative' }))(
      $responsiveFlex(style({ position: 'absolute', alignItems: 'center', zIndex: 10, left: 0, right: 0, pointerEvents: 'none', padding: '8px 26px' }))(
        $column(style({ flex: 1, alignItems: 'center' }))(
          $text(style({ color: pallete.foreground, fontSize: '.65em', textAlign: 'center' }))('Total Staked'),
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
        $row(layoutSheet.spacing, style({ placeContent: 'flex-end' }))(
          $row(layoutSheet.spacing, style({ flex: 1, alignItems: 'flex-start' }))(
            screenUtils.isDesktopScreen
              ? switchLatest(map(({ esGmxInStakedGmx }) => {

                return $column(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                  $text(style({ color: pallete.foreground, fontSize: '.65em' }))('Compounding Rewards'),
                  $row(layoutSheet.spacing)(
                    $row(layoutSheet.spacing, style({ pointerEvents: 'all' }))(
                      $row(layoutSheet.spacingTiny, style({ alignItems: 'baseline' }))(
                        $text(style({ fontWeight: 'bold', fontSize: '1em' }))(`${readableNumber(formatFixed(esGmxInStakedGmx, 18))}`),
                        $text(style({ fontSize: '.75em', color: pallete.foreground, fontWeight: 'bold' }))(`esGMX`),
                      ),
                    ),
                  ),
                )
              }, config.stakingInfo))
              : empty()
          ),
          switchLatest(map((stakingInfo) => {

            return $column(layoutSheet.spacingTiny)(
              $text(style({ color: pallete.foreground, fontSize: '.65em', textAlign: 'center' }))('Pending Rewards'),
              $row(layoutSheet.spacing)(
                $row(layoutSheet.spacing, style({ pointerEvents: 'all' }))(
                  $row(layoutSheet.spacingTiny, style({ alignItems: 'baseline' }))(
                    $text(style({ fontWeight: 'bold', fontSize: '1em', color: pallete.positive }))(`+${readableNumber(formatFixed(stakingInfo.totalEsGmxRewards, 18))}`),
                    $text(style({ fontSize: '.75em', color: pallete.foreground, fontWeight: 'bold' }))(`esGMX`),
                  ),
                ),
                $row(layoutSheet.spacing, style({ pointerEvents: 'all' }))(
                  $row(layoutSheet.spacingTiny, style({ alignItems: 'baseline' }))(
                    $text(style({ fontWeight: 'bold', fontSize: '1em', color: pallete.positive }))(`+${readableNumber(formatFixed(stakingInfo.totalFeeRewards, 18))}`),
                    $text(style({ fontSize: '.75em', color: pallete.foreground, fontWeight: 'bold' }))(`ETH`),
                  ),
                ),
              ),
            )
          }, config.stakingInfo))
        )
      ),
      switchLatest(
        combineArray(({ filledGap, filledForecast, sourceList, chain, from, to }) => {

          return $Chart({
            initializeSeries: map((api) => {
              const lastTick = filledGap[filledGap.length - 1]


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

              const timeframe = filledForecast[filledForecast.length - 1].time - filledForecast[0].time
              const markerInterval = timeframe / 10


              if (filledGap.length) {
                const markers = intervalListFillOrderMap({
                  seed: {
                    time: filledGap[0].time,
                    value: 0,
                  },
                  source: sourceList,
                  getTime: x => x.timestamp,
                  interval: markerInterval,
                  fillMap: (prev, obj) => {
                    return { value: 0 }
                  },
                  fillGapMap: (prev, next) => {
                    return { value: 0 }
                  },
                  squashMap: (prev, next) => {

                    const token: ARBITRUM_ADDRESS = next.token.slice(1) as any

                    if (token.toLowerCase() === getMappedValue(CHAIN_ADDRESS_MAP, chain, 'ES_GMX')) {
                      const desc = getTokenDescription(token as any)
                      const amountRatio = div(next.amount, getDenominator(desc.decimals)) / BASIS_POINTS_DIVISOR
                      const tokenPrice = div(next.amountUsd, amountRatio) / BASIS_POINTS_DIVISOR

                      const nextBalanceUsd = getTokenUsd(next.amount, tokenPrice, desc.decimals)

                      return { value: prev.value + formatFixed(nextBalanceUsd, 30) }
                    }


                    return prev
                  }
                })
                  .filter(x => x.value).map((tick): SeriesMarker<any> => {
                    const rewardUsd = readableNumber(tick.value)
                    const esGmxMsg = `+${rewardUsd}`

                    return {
                      color: pallete.positive,
                      position: "aboveBar",
                      shape: "circle",
                      size: 1,
                      time: tick.time + markerInterval,
                      text: `${esGmxMsg}`
                    }
                  })

                setTimeout(() => {
                  glpSeries.setMarkers(markers)
                  api.timeScale().fitContent()
                }, 135)

              }



              const forecastData = filledForecast.filter(x => x.time > lastTick.time)

              // @ts-ignore
              seriesForecast.setData(forecastData)

              // @ts-ignore
              glpSeries.setData(filledGap)

              const from = filledGap[0].time as Time
              const to = (filledGap[filledGap.length - 1].time + markerInterval) as Time
              // series.coordinateToPrice()
              setTimeout(() => {
                api.timeScale().setVisibleRange({ from, to: to + (markerInterval * 3 as any) })
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
                  top: 0.41,
                  bottom: 0
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
                rightOffset: 150,
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

