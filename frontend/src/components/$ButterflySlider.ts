import { Behavior, combineObject, Op } from "@aelea/core"
import { component, IBranch, style, nodeEvent, eventElementTarget, styleInline, $Node, NodeComposeFn, $text, drawLatest } from "@aelea/dom"
import { Input, $row, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { skipRepeats, snapshot, until, multicast, join, map, now } from "@most/core"
import { Stream } from "@most/types"

export interface LeverageSlider extends Input<number> {
  step?: number

  $thumb?: NodeComposeFn<$Node>
  thumbText: Op<number, string>

  disabled?: Stream<boolean>
  min?: Stream<number>
  max?: Stream<number>

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

export const $Slider = ({
  value, thumbText,
  $thumb = $defaultThumb,
  thumbSize = 50,
  negativeColor = pallete.negative,
  positiveColor = pallete.positive,
  step = 0,
  disabled = now(false),
  min = now(0),
  max = now(1),
}: LeverageSlider) => component((
  [sliderDimension, sliderDimensionTether]: Behavior<IBranch<HTMLInputElement>, number>,
  [thumbePositionDelta, thumbePositionDeltaTether]: Behavior<IBranch<HTMLInputElement>, number>
) => {

  const $rangeWrapper = $row(sliderDimensionTether(observer.resize({}), map(res => res[0].contentRect.width)), style({ backgroundColor: pallete.background, height: '2px', position: 'relative', zIndex: 10 }))

  const sliderStyle = styleInline(map((n) => {
    const width = `${n * 100}%`
    const background = n === 0 ? '' : n > 0 ? `linear-gradient(90deg, transparent 10%, ${positiveColor} 100%)` : `linear-gradient(90deg, ${negativeColor} 0%, transparent 100%)`

    return { width, background }
  }, value))



  return [
    $rangeWrapper(
      $row(style({
        placeContent: 'flex-end', top: '50%',
        // transition: 'width 275ms cubic-bezier(0.25, 0.8, 0.25, 1)'
      }), sliderStyle)(
        $row(style({ width: '0px', alignItems: 'center', placeContent: 'center' }))(
          $thumb(
            thumbePositionDeltaTether(
              nodeEvent('pointerdown'),
              downEvent => {
                return snapshot(({ value, max, min }, { downEvent, sliderDimension }) => {
                  const drag = until(eventElementTarget('pointerup', window.document), eventElementTarget('pointermove', window.document))

                  return drawLatest(map(moveEvent => {
                    const deltaX = (moveEvent.clientX - downEvent.clientX) + (sliderDimension * value)

                    moveEvent.preventDefault()

                    const val = deltaX / sliderDimension

                    const cVal = Math.min(Math.max(val, min), max)
                    const steppedVal = step > 0 ? Math.round(cVal / step) * step : cVal

                    return steppedVal
                  }, drag))
                }, combineObject({ value, min, max }), combineObject({ downEvent, sliderDimension }))
              },
              join,
              skipRepeats,
              multicast
            ),
            // thumbDimensionTether(observer.resize()),
            // styleInline(combineArray((isPositive, isDisabled) => {

            //   if (isPositive) {
            //     return { left: 'auto', right: `-${thumbSize}px`, ...(isDisabled ? { pointerEvents: 'none', border: `1px solid transparent` } as const : { pointerEvents: 'all', border: `1px solid ${positiveColor}` }) }
            //   }

            //   return { right: 'auto', left: `-${thumbSize}px`, ...(isDisabled ? { pointerEvents: 'none', border: `1px solid transparent` } as const : { pointerEvents: 'all', border: `1px solid ${negativeColor}` }) }
            // }, positive, disabled)),
            style({ width: thumbSize + 'px' })
          )(
            $text(thumbText(value))
          )
        )
      )
    ),
    {
      change: thumbePositionDelta
    }
  ]
})
