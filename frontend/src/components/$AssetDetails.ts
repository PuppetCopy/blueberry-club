import { Behavior, combineArray } from "@aelea/core"
import { $Branch, $Node, component, style, $text, $element, attr } from "@aelea/dom"
import { $row, layoutSheet, $icon, $column } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { formatReadableUSD, formatFixed } from "@gambitdao/gmx-middleware"
import { CHAIN } from "@gambitdao/wallet-link"
import { switchLatest, skipRepeatsWith, multicast, map } from "@most/core"
import { Stream } from "@most/types"
import { MouseEventParams, LineStyle, BarPrice, PriceScaleMode, Time } from "lightweight-charts-baseline"
import { $responsiveFlex } from "../elements/$common"
import { IAsset } from "../types"
import { IValueInterval } from "./$StakingGraph"
import { $Chart } from "./chart/$Chart"


type ITreasuryMetric = {
  $iconPath: $Branch
  label: string
  chain: CHAIN
  symbol: string
  asset: Stream<IAsset>
  $distribution: $Node
  priceChart: Stream<IValueInterval[]>
  // entry: bigint
}

const EMPTY_MESSAGE = '-'


export function readableNumber(ammount: number) {
  const parts = ammount.toString().split('.')
  const [whole = '', decimal = ''] = parts

  if (whole === '' && decimal === '') {
    return EMPTY_MESSAGE
  }

  if (whole.replace(/^-/, '') === '0' || whole.length < 3) {
    const shortDecimal = decimal.slice(0, 2)
    return whole + (shortDecimal ? '.' + shortDecimal  : '')
  }


  return Number(whole).toLocaleString()
}

export const $AssetDetails = ({ label, $iconPath, asset, symbol, $distribution, priceChart, chain }: ITreasuryMetric) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>
) => [

  $responsiveFlex(style({ flex: 1, alignItems: 'center' }), layoutSheet.spacingBig)(
    
    $row(layoutSheet.spacing, style({ flex: 1, }))(
      $row(style({ position:'relative' }))(
        $icon({ $content: $iconPath, viewBox: '0 0 32 32', svgOps: style({ marginTop: '3px' }), width: '34px' }),
        $element('img')(attr({ src: `/assets/${chain === CHAIN.ARBITRUM ? 'arbitrum' : 'avalanche'}.svg` }), style({ width: '18px', padding: '3px', borderRadius: '50%', backgroundColor: pallete.background, position: 'absolute', right: '-8px', top: '-4px' }))(),
      ),
      // $node(style({ flex: 1 }))(),
      $column(layoutSheet.spacingTiny, style({ flex: 1, alignItems: 'baseline' }))(
        $row(layoutSheet.spacingTiny, style({ alignItems: 'baseline' }) )(
          $text(style({ fontWeight: 'bold' }))(
            map(t => readableNumber(formatFixed(t.balance, 18)), asset)
          ),
          $text(style({ fontSize: '.75em', color: pallete.foreground, fontWeight: 'bold' }))(symbol),
        ),
        $text(style({ fontSize: '.75em' }))(map(t => '$' +  formatReadableUSD(t.balanceUsd), asset)),
      )
    ),

    $row(layoutSheet.spacingBig, style({ flex: 3, width: '100%' }))(
      $row(style({ flex: 1, minHeight: '75px', position: 'relative' }))(
        switchLatest(
          combineArray((data) => {

            
            const baselinePrice = formatFixed(BigInt(data[0].price.c), 30)


            return $Chart({
              initializeSeries: map((api) => {

                const series = api.addBaselineSeries({
                  baseLineWidth: 1,
                  priceLineWidth: 1,
                  topLineColor: pallete.positive,
                  topFillColor1: colorAlpha(pallete.positive, .3),
                  topFillColor2: 'transparent',
                  bottomLineColor: pallete.negative,
                  bottomFillColor1: 'transparent',
                  bottomFillColor2: colorAlpha(pallete.negative, .3),
                  baseValue: {
                    type: 'price',
                    price: baselinePrice,
                  },
                  baseLineStyle: LineStyle.Dotted,
                  baseLineColor: 'red',
                  lineWidth: 1,
                  baseLineVisible: true,
                  // lastValueVisible: false,
                  priceLineVisible: false,
                })

                series.createPriceLine({
                  price: baselinePrice,
                  color: pallete.foreground,
                  lineWidth: 1,
                  axisLabelVisible: true,
                  title: '',
                  lineStyle: LineStyle.SparseDotted,
                })


                const newLocal = data.map(y => ({ time: y.time as Time, value: formatFixed(y.price.c, 30) }))
                //.slice(0, 305)

                series.setData(newLocal)
                setTimeout(() => {
                  api.timeScale().fitContent()
                }, 100)


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
                rightPriceScale: {
                  mode: PriceScaleMode.Normal,
                  autoScale: true,
                  // visible: true,
                  scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                  }
                },
                overlayPriceScales: {
                  invertScale: true
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
                  visible: true,
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
          }, priceChart)
        )
      ),
      $column(style({ flex: 1, maxWidth: '300px' }))(
        $distribution,
      ),
    )

  )

])