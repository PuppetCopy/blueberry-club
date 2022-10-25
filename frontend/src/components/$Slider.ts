import { Behavior, combineArray, combineObject, Op } from "@aelea/core"
import { component, IBranch, style, nodeEvent, eventElementTarget, styleInline, $Node, NodeComposeFn, $text, drawLatest, styleBehavior } from "@aelea/dom"
import { Input, $row, observer } from "@aelea/ui-components"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import { skipRepeats, snapshot, until, multicast, join, map, now, tap } from "@most/core"
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

  const $rangeWrapper = $row(sliderDimensionTether(observer.resize({}), map(res => res[0].contentRect.width)), style({ height: '2px', background: pallete.background, position: 'relative', zIndex: 10 }))

  
  const state = multicast(combineObject({ value, min, max }))

  const sliderStyle = styleInline(combineArray(({ min, max, value }, color) => {
    const gutterColor = colorAlpha(pallete.background, .35)
    const minArea = `${gutterColor} ${min * 100}%,`
    const valArea = `${color} ${min * 100}% ${value * 100}%,`
    const freeArea = `${pallete.background} ${value * 100}% ${max * 100}%,`
    const maxArea = `${gutterColor} ${max * 100}%`

    const background = `linear-gradient(90deg, ${minArea} ${valArea} ${freeArea} ${maxArea}`
    return { background }
  }, state, map(x => colorAlpha(x, .5), color)))

  return [
    $rangeWrapper(sliderStyle)(
      $row(
        styleInline(map(({ value }) => ({ left: `${Math.min(Math.max(value, 0), 1) * 100}%` }), state)),
        style({ width: '0px', top: '50%', position: 'absolute', transition: 'left 175ms cubic-bezier(0.25, 0.8, 0.25, 1) 0s', alignItems: 'center', placeContent: 'center' })
      )(
        $thumb(
          styleBehavior(map(({ color, disabled }) => disabled ? { borderColor: 'transparent', pointerEvents: disabled ? 'none' : 'all' } : { borderColor: color }, combineObject({ disabled, color }))),
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
              }, state, combineObject({ downEvent, sliderDimension }))
            },
            join,
            skipRepeats,
            multicast
          ),
          style({ width: thumbSize + 'px' })
        )(
          $text(thumbText(value))
        )
      )
    ),
    {
      change: thumbePositionDelta
    }
  ]
})
