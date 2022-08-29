import { Behavior, combineArray, combineObject, Op } from "@aelea/core"
import { component, IBranch, style, nodeEvent, eventElementTarget, styleInline, $Node, NodeComposeFn, $text, drawLatest, styleBehavior } from "@aelea/dom"
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
  color?: Stream<string>
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
    transition: 'border 250ms ease-in',
    borderStyle: 'solid',
    borderWidth: '1px',
  })
)

export const $Slider = ({
  value, thumbText,
  $thumb = $defaultThumb,
  thumbSize = 50,
  color = now(pallete.primary),
  step = 0,
  disabled = now(false),
  min = now(0),
  max = now(1),
}: LeverageSlider) => component((
  [sliderDimension, sliderDimensionTether]: Behavior<IBranch<HTMLInputElement>, number>,
  [thumbePositionDelta, thumbePositionDeltaTether]: Behavior<IBranch<HTMLInputElement>, number>
) => {

  const $rangeWrapper = $row(sliderDimensionTether(observer.resize({}), map(res => res[0].contentRect.width)), style({ backgroundColor: pallete.background, height: '2px', position: 'relative', zIndex: 10 }))

  const sliderStyle = styleInline(combineArray((n, color) => {
    const width = `${n * 100}%`
    const background = `linear-gradient(90deg, transparent 10%, ${color} 100%)`

    return { width, background }
  }, value, color))



  return [
    $rangeWrapper(
      $row(style({
        placeContent: 'flex-end', top: '50%',
        transition: 'width 175ms cubic-bezier(0.25, 0.8, 0.25, 1)'
      }), sliderStyle)(
        $row(style({ width: '0px', alignItems: 'center', placeContent: 'center' }))(
          $thumb(styleBehavior(map(color => ({ borderColor: color }), color)))(
            thumbePositionDeltaTether(
              nodeEvent('pointerdown'),
              downEvent => {
                return snapshot(({ value, max, min }, { downEvent, sliderDimension }) => {
                  const drag = until(eventElementTarget('pointerup', window.document), eventElementTarget('pointermove', window.document))

                  return drawLatest(map(moveEvent => {
                    const normalisedValue = Math.min(Math.max(value, min), max)
                    const deltaX = (moveEvent.clientX - downEvent.clientX) + (sliderDimension * normalisedValue)

                    moveEvent.preventDefault()

                    const val = deltaX / sliderDimension

                    const cVal = Math.min(Math.max(val, min), max)
                    const steppedVal = step > 0 ? cVal / step * step : cVal

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
