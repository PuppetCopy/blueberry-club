import { Behavior, combineArray, replayLatest } from "@aelea/core"
import { $Branch, $node, $text, attr, component, motion, MOTION_NO_WOBBLE, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $NumberTicker, $row, $seperator, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { USD_PRECISION } from "@gambitdao/gbc-middleware"
import { expandDecimals, intervalInMsMap, readableNumber, unixTimeTzOffset, shortenAddress, formatFixed, formatReadableUSD, ARBITRUM_ADDRESS } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { empty, fromPromise, map, mergeArray, multicast, now, skipRepeats, skipRepeatsWith, startWith, switchLatest } from "@most/core"
import { BarPrice, CrosshairMode, LineStyle, MouseEventParams, SeriesMarker, Time } from "lightweight-charts-baseline"
import { $Chart } from "../components/chart/$Chart"
import { $anchor, $card } from "../elements/$common"
import { fillIntervalGap } from "../logic/common"
import { gmxPriceHistory, IGlpStat, IStake, IUniswapSwap, queryStakedEsGMX } from "../logic/query"
import { ITreasuryAsset, trasuryBalances } from "../logic/contract"
import { $eth, $tokenIconMap } from "../common/$icons"
import { Stream } from "@most/types"



export function bnToHex(n: bigint) {
  return '0x' + n.toString(16)
}




interface ITreasury {
  walletLink: IWalletLink
  parentRoute: Route
  // walletStore: cstate.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}


interface ITreasuryTick {
  time: number
  value: number
  amountGmx: bigint
  amountGlp: bigint
  balanceEth: bigint
  balanceGmx: bigint
  balanceGlp: bigint
  gmxPrice: bigint
  glpPrice: bigint
}


export const $Treasury = ({ walletLink, parentRoute }: ITreasury) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {


  const treasuryRef = $anchor(attr({ href: 'https://arbiscan.io/address/0xDe2DBb7f1C893Cc5E2f51CbFd2A73C8a016183a0' }), style({ fontSize: '.65em' }))(
    $text(shortenAddress('0xDe2DBb7f1C893Cc5E2f51CbFd2A73C8a016183a0'))
  )


  type ITreasuryMetric = {
    $iconPath: $Branch
    label: string
    symbol: string
    asset: Stream<ITreasuryAsset>
  }

  const $treasuryMetric = ({ label, $iconPath, asset, symbol }: ITreasuryMetric) => $node(layoutSheet.spacingSmall, style({ display: 'flex', placeContent: 'center', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', flex: 1 }))(
    $column(layoutSheet.spacingSmall)(
      $row(layoutSheet.spacingSmall)(
        $icon({ $content: $iconPath, viewBox: '0 0 32 32', width: '24px' }),
        $text(style({ fontWeight: 'bold' }))(label),
      ),
      $seperator,
      $column(layoutSheet.spacingTiny, style({ alignItems: 'baseline', fontSize: '25px' }))(
        $row(layoutSheet.spacingTiny, style({ alignItems: 'baseline' }) )(
          $text(style({ fontWeight: 'bold' }))(
            map(t => readableNumber(formatFixed(t.balance, 18)), asset)
          ),
          $text(style({ fontSize: '.75em' }))(symbol),
        ),
        $text(style({ fontSize: '.75em' }))(map(t => '$' +  formatReadableUSD(t.balanceUsd), asset)),
      ),
    )
  )


  


  const stakedEsGMX = queryStakedEsGMX()
  const gmxPriceHistoryquery = gmxPriceHistory()

  const fillRewards = (prev: ITreasuryTick, next: IUniswapSwap | IStake | IGlpStat): ITreasuryTick => {
    if (next.__typename === 'StakeGmx') {
      const amountGmx = prev.amountGmx + BigInt(next.amount)
      const balanceGmx = (prev.gmxPrice * amountGmx / USD_PRECISION)
      const value = formatFixed(balanceGmx + prev.balanceGlp + prev.balanceEth, 30)

      return { ...prev, time: next.timestamp, value, balanceGmx, amountGmx }
    }

    if (next.__typename === 'StakeGlp') {
      const amountGlp = BigInt(next.amount)
      const balanceGlp = expandDecimals((prev.glpPrice * amountGlp / USD_PRECISION), 12)
      
      const value = formatFixed(balanceGlp + prev.balanceGmx + prev.balanceEth, 30)

      return { ...prev, time: next.timestamp, value, amountGlp, balanceGlp }
    }

    if (next.__typename === 'UniswapPrice') {
      const balanceGmx = (prev.gmxPrice * prev.amountGmx / USD_PRECISION)
      const value = formatFixed(balanceGmx + prev.balanceGlp + prev.balanceEth, 30)

      return { ...prev, time: next.timestamp, value, gmxPrice: BigInt(next.value) }
    }

    if (next.__typename === 'GlpStat') {
      const glpPrice = BigInt(next.aumInUsdg) ? BigInt(next.aumInUsdg) * USD_PRECISION / BigInt(next.glpSupply) : 0n
      const balanceGlp = expandDecimals((glpPrice * prev.amountGlp / USD_PRECISION), 12)
      const gmxBalance = prev.balanceGmx

      const value = formatFixed(gmxBalance + balanceGlp + prev.balanceEth, 30)
      const time = Number(next.id)

      return { ...prev, time, value, glpPrice }
    }

    return prev
  }

  const historicPortfolio = replayLatest(multicast(combineArray((assetMap, staked, { uniswapPrices, glpStats }) => {

    const parsedGlpStats = glpStats.filter(a => a.id !== 'total').sort((a, b) => getTime(a) - getTime(b))
    const source = [...uniswapPrices, ...parsedGlpStats, ...staked.stakeGlps, ...staked.stakeGmxes]
      .sort((a, b) => getTime(a) - getTime(b))
      .slice(500)
    
    
    const gmxPrice = BigInt(uniswapPrices[uniswapPrices.length - 1].value)
    const glpPrice = BigInt(parsedGlpStats[0].glpSupply)

    const seed: ITreasuryTick = {
      time: getTime(source[0]),
      gmxPrice,
      glpPrice: glpPrice ? glpPrice / BigInt(glpStats[0].aumInUsdg) : 0n,
      value: 0,
      balanceEth: assetMap.eth.balanceUsd,
      balanceGlp: 0n,
      balanceGmx: 0n,
      amountGlp: 0n,
      amountGmx: 0n,
    }


    const filledGap = fillIntervalGap({
      seed, source, getTime,
      interval: Math.floor(intervalInMsMap.HR2 / 1000),
      fillMap: fillRewards,
      fillGapMap: fillRewards,
      // squashMap: (prev, next) => prev
    })

    // const forecastInterval = Math.floor(intervalInMsMap.HR24 / 1000)

    const interval = Math.floor(intervalInMsMap.HR24 / 1000)
    const endForecast = {
      ...filledGap[filledGap.length - 1],
      time: filledGap[filledGap.length - 1].time + interval * 365
    }

    // const filledForecast = fillIntervalGap({
    //   seed: filledGap[filledGap.length - 1], source: [endForecast],
    //   getTime: (x) => x.time, 
    //   interval: interval,
    //   fillMap: (prev, next) => prev,
    //   fillGapMap: (prev, next) => {
    //     return { ...prev, value: prev.value + 500 }
    //   },
    // })


    return { filledGap, staked, uniswapPrices, glpStats }
  }, trasuryBalances, fromPromise(stakedEsGMX), fromPromise(gmxPriceHistoryquery))))


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


  const ethAsset = map(x => x.eth, trasuryBalances)
  const gmxAsset = map(x => x.gmx, trasuryBalances)
  const glpAsset = map(x => x.glp, trasuryBalances)

  return [
    $column(layoutSheet.spacingBig)(

      $column(style({ placeContent:'center', alignItems: 'center' }))(
        $text(style({ fontSize: '2em', fontWeight: 'bold' }))('Treasury'),
        $text(style({ fontSize: '.65em', color: pallete.foreground }))('WORK IN PROGRESS')
      ),

      $card(style({ flexDirection: screenUtils.isMobileScreen ? 'column' : 'row', minHeight: '158px' }))(
        $row(layoutSheet.spacing, style({ flex: 2 }))(
          $treasuryMetric({
            label: 'GMX',
            symbol: 'GMX',
            asset: gmxAsset,
            $iconPath: $tokenIconMap[ARBITRUM_ADDRESS.GMX],
          }),
          style({ margin: screenUtils.isDesktopScreen ? '-30px 0' : '-30px 0 -16px', backgroundColor: colorAlpha(pallete.foreground, .15) }, $seperator),
          $treasuryMetric({
            label: 'GLP',
            symbol: 'GLP',
            asset: glpAsset,
            $iconPath: $tokenIconMap[ARBITRUM_ADDRESS.GLP],
          })
        ),
        style({ margin: screenUtils.isDesktopScreen ? '-30px 0' : '0 -30px', backgroundColor: colorAlpha(pallete.foreground, .15) }, $seperator),
        $treasuryMetric({
          label: 'Ethereum',
          symbol: 'ETH',
          asset: ethAsset,
          $iconPath: $eth,
        }),
      ),
      $card(style({ padding: 0, overflow: 'hidden', height: '350px', position: 'relative', display: 'block', flex: 'none' }))(
        $row(style({ position: 'absolute', zIndex: 10, left: 0, right: 0, padding: '26px', placeContent: 'center' }))(
          $column(
            $row(style({ fontSize: '2em', alignItems: 'baseline' }))(
              $NumberTicker({
                textStyle: {
                  fontWeight: 'bold',
                  fontFamily: 'RelativeMono'
                },
                value$: map(Math.round, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, chartPnLCounter)),
                incrementColor: pallete.positive,
                decrementColor: pallete.negative
              }),
              $text(style({ fontSize: '.75em', color: pallete.foreground }))('$'),
            ),
            $text(style({ color: pallete.foreground, fontSize: '.75em', textAlign: 'center' }))('Total Holdings')
          )
        ),
        switchLatest(
          combineArray((data) => {
          // const startDate = new Date(data[0].time * 1000)
          // const endDate = new Date(data[data.length - 1].time * 1000)
            

            const lastTick = data.filledGap[data.filledGap.length -1]

            return $Chart({
              initializeSeries: map((api) => {
                const series = api.addAreaBaselineSeries({
                  baseLineWidth: 1,
                  // lineColor: colorAlpha(pallete.positive, .5),
                  priceLineWidth: 1,
                  // lineStyle: LineStyle.Dotted,
                  topFillColor1: pallete.positive,
                  topFillColor2: 'transparent',
                  bottomFillColor1: 'transparent',
                  bottomFillColor2: colorAlpha(pallete.primary, .3),
                  bottomLineColor: pallete.primary,
                  // topLineColor: pallete.positive,
                  baseValue: {
                    type: 'price',
                    // price: lastTick,
                    price: lastTick.value,
                  },
                  lineWidth: 2,
                  baseLineVisible: false,
                  lastValueVisible: false,
                  priceLineVisible: false,
                })

                // series.createPriceLine({
                //   price: lastTick.value,
                //   color: pallete.foreground,
                //   lineWidth: 1,
                //   axisLabelVisible: true,
                //   title: '',
                //   lineStyle: LineStyle.SparseDotted,
                // })
                // const seriesForecast = api.addLineSeries({
                //   baseLineWidth: 1,
                //   priceLineWidth: 1,
                //   priceLineVisible: false,
                //   lineWidth: 2,
                //   title: 'Forecast',
                //   lineStyle: LineStyle.SparseDotted,
                //   color: pallete.foreground,
                // })

                const addGlps = data.staked.stakeGlps
                  .map((ip): SeriesMarker<Time> => {
                    return {
                      color: pallete.foreground,
                      position: "aboveBar",
                      shape: "arrowUp",
                      size: .15,
                      time: unixTimeTzOffset(ip.timestamp),
                      text:  'GLP +' + readableNumber(Number(formatFixed(BigInt(ip.amount), 18)))
                    }
                  })

                const addGmxs = data.staked.stakeGmxes
                  .filter(staked => formatFixed(BigInt(staked.amount), 18) > 200)
                  .map((ip): SeriesMarker<Time> => {
                    return {
                      color: pallete.foreground,
                      position: "aboveBar",
                      shape: 'arrowUp',
                      size: .15,
                      time: unixTimeTzOffset(ip.timestamp),
                      text:  'GMX +' + readableNumber(Number(formatFixed(BigInt(ip.amount), 18)))
                    }
                  })



                // const newLocal = data.filledForecast.filter(x => x.time > lastTick.time)
                // @ts-ignore
                series.setData([
                  ...data.filledGap,
                  // ...newLocal
                ])
                // // @ts-ignore
                // seriesForecast.setData(data.filledForecast)

                setTimeout(() => {
                  series.setMarkers([...addGlps, ...addGmxs].sort((a, b) => Number(a.time) - Number(b.time)))

                }, 144)
                api.timeScale().fitContent()

                series.applyOptions({
                  scaleMargins: {
                    top: 0.35,
                    bottom: 0,
                  }
                })

                return series
              }),
              chartConfig: {
                localization: {
                  priceFormatter: (priceValue: BarPrice) => {
                    return  `$${readableNumber(priceValue)}`
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
                  // mode: PriceScaleMode.Logarithmic,
                  autoScale: true,
                  visible: true,
                },
                handleScale: false,
                handleScroll: false,
                timeScale: {
                // rightOffset: 110,
                  secondsVisible: false,
                  timeVisible: true,
                  rightOffset: 0,
                  // fixLeftEdge: true,
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
          }, historicPortfolio))
      )
    )
  ]
})


function getTime(next: IUniswapSwap | IGlpStat | IStake): number {
  if (next.__typename === 'GlpStat') {
    return Number(next.id) || 0
  }
  return Number(next.timestamp)
}

