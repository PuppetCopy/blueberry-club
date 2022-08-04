import { Behavior, combineArray, Op } from "@aelea/core"
import { component, IBranch, style, nodeEvent, eventElementTarget, styleInline, $Node, NodeComposeFn, $text, styleBehavior, drawLatest } from "@aelea/dom"
import { Input, $row, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { combine, skipRepeats, snapshot, until, mergeArray, multicast, join, map, switchLatest, now } from "@most/core"
import { Stream } from "@most/types"

export interface LeverageSlider extends Input<number> {
  step?: number

  $thumb?: NodeComposeFn<$Node>
  thumbText: Op<number, string>

  disabled?: Stream<boolean>

  thumbSize?: number
  positiveColor?: string
  negativeColor?: string
}


export const $defaultThumb = $row(
  style({
    position: 'absolute',
    fontWeight: 'bold',
    background: pallete.background,
    borderRadius: '50px',
    width: '50px',
    cursor: 'grab',
    padding: '5px',
    fontSize: '.75em',
    alignItems: 'center',
    placeContent: 'center',
    transition: 'border 500ms ease-in',
    border: `1px solid ${pallete.foreground}`,
  })
)

export const $ButterflySlider = ({ value, thumbText, $thumb = $defaultThumb, thumbSize = 50, negativeColor = pallete.negative, disabled = now(false), positiveColor = pallete.positive, step = 0.01 }: LeverageSlider) => component((
  [sliderDimension, sliderDimensionTether]: Behavior<IBranch<HTMLInputElement>, number>,
  [thumbePositionDelta, thumbePositionDeltaTether]: Behavior<IBranch<HTMLInputElement>, number>
) => {


  const change = multicast(skipRepeats(combine((slider, thumb) => thumb / slider, sliderDimension, thumbePositionDelta)))



  const $range = $row(sliderDimensionTether(observer.resize({}), map(res => res[0].contentRect.width)), style({ placeContent: 'center', backgroundColor: pallete.background, height: '2px', position: 'relative', zIndex: 10 }))

  const latestPositiondelta = combine((val, sliderWidth) => {
    const constraintValue = val > 0 ? Math.min(val, 1) : Math.max(val, -1)
    return constraintValue * sliderWidth
  }, value, sliderDimension)

  const positive = map(n => n > 0, latestPositiondelta)

  const sliderStyle = styleInline(map((n) => {
    const width = Math.abs(n) + 'px'
    const background = n === 0 ? '' : n > 0 ? `linear-gradient(90deg, transparent 10%, ${positiveColor} 100%)` : `linear-gradient(90deg, ${negativeColor} 0%, transparent 100%)`

    return { width, background }
  }, mergeArray([latestPositiondelta, thumbePositionDelta])))

  // function round(number: number, increment: number, offset: number) {
  //   return Math.ceil((number - offset) / increment) * increment + offset
  // }

  return [
    $range(
      $row(style({ alignItems: 'center', position: 'relative' }), sliderStyle)(
        $thumb(
          thumbePositionDeltaTether(
            nodeEvent('pointerdown'),
            snapshot((current, downEvent) => {

              const target = downEvent.currentTarget

              if (!(target instanceof HTMLElement)) {
                throw new Error('no target event captured')
              }

              const drag = until(eventElementTarget('pointerup', window.document), eventElementTarget('pointermove', window.document))

              return drawLatest(map(moveEvent => {

                const maxWidth = target.parentElement!.parentElement!.clientWidth

                const deltaX = ((moveEvent.clientX - downEvent.clientX) * 2) + current

                moveEvent.preventDefault()

                return Math.abs(deltaX) > maxWidth ? deltaX > 0 ? maxWidth : -maxWidth : deltaX

              }, drag))
            }, mergeArray([latestPositiondelta, multicast(thumbePositionDelta)])),
            join
          ),
          // thumbDimensionTether(observer.resize()),
          styleInline(combineArray((isPositive, isDisabled) => {

            if (isPositive) {
              return { left: 'auto', right: `-${thumbSize / 2}px`, ...(isDisabled ? { pointerEvents: 'none', border: `1px solid transparent` } as const : { pointerEvents: 'all', border: `1px solid ${positiveColor}` }) }
            }

            return { right: 'auto', left: `-${thumbSize / 2}px`, ...(isDisabled ? { pointerEvents: 'none', border: `1px solid transparent` } as const : { pointerEvents: 'all', border: `1px solid ${negativeColor}` }) }
          }, positive, disabled)),
          style({ width: thumbSize + 'px' })
        )(
          $text(thumbText(value))
        )
      )
    ),
    {
      change
    }
  ]
})
