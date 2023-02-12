import { Behavior, combineArray, combineObject, Op } from "@aelea/core"
import { component, IBranch, style, nodeEvent, eventElementTarget, styleInline, $Node, NodeComposeFn, $text, drawLatest, styleBehavior } from "@aelea/dom"
import { Input, $row, observer, screenUtils, $column } from "@aelea/ui-components"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import { invertColor } from "@gambitdao/ui-components"
import { skipRepeats, snapshot, until, multicast, join, map, now, tap, mergeArray } from "@most/core"
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
// line - height: 0.8;
// margin - top: 3px;
export const $defaultThumb = $row(
  style({
    whiteSpace: 'pre-wrap',
    textAlign: 'center',
    position: 'absolute',
    fontWeight: 'bolder',
    background: pallete.background,
    borderRadius: '50px',
    cursor: 'grab',
    lineHeight: .9,
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
  thumbSize = 40,
  color = now(pallete.primary),
  step = 0,
  disabled = now(false),
  min = now(0),
  max = now(1),
}: LeverageSlider) => component((
  [sliderDimension, sliderDimensionTether]: Behavior<IBranch<HTMLInputElement>, ResizeObserverEntry>,
  [thumbePositionDelta, thumbePositionDeltaTether]: Behavior<IBranch<HTMLInputElement>, number>
) => {

  const $rangeWrapper = $row(style({ height: '2px', pointerEvents: 'none', background: pallete.background, position: 'relative' }))


  const state = multicast(combineObject({ value, min, max }))

  const sliderStyle = styleInline(combineArray(({ min, max, value }, color) => {
    const gutterColor = colorAlpha(pallete.background, .35)
    const minArea = `${colorAlpha(color, .35)} ${min * 100}%,`
    const valArea = `${color} ${min * 100}% ${value * 100}%,`
    const freeArea = `${invertColor(pallete.message) } ${value * 100}% ${max * 100}%,`
    const maxArea = `${gutterColor} ${max * 100}%`

    const background = `linear-gradient(90deg, ${minArea} ${valArea} ${freeArea} ${maxArea}`
    return { background }
  }, state, color))


  return [
    $column(style({ minHeight: '26px', zIndex: 0, touchAction: 'none', placeContent: 'center', cursor: 'pointer' }))(
      sliderDimensionTether(observer.resize({}), map(res => res[0])),
      thumbePositionDeltaTether(
        nodeEvent('pointerdown'),
        downSrc => {

          return snapshot(({ sliderDimension, state: { value, max, min } }, downEvent) => {
            const dragEnd = eventElementTarget('pointerup', window.document)
            const dragStart = eventElementTarget('pointermove', window.document)
            const drag = until(dragEnd, dragStart)
            const rectWidth = sliderDimension.contentRect.width

            const hasTouchedBar = downEvent.target === sliderDimension.target


            if (hasTouchedBar) {
              const initialOffset = now(Math.min(Math.max(downEvent.offsetX / rectWidth, min), max))
              const moveDelta = drawLatest(map(moveEvent => {
                const deltaX = (moveEvent.clientX - downEvent.clientX) + downEvent.offsetX

                moveEvent.preventDefault()

                const val = deltaX / rectWidth

                const cVal = Math.min(Math.max(val, min), max)
                const steppedVal = step > 0 ? cVal / step * step : cVal

                return steppedVal
              }, drag))

              return mergeArray([initialOffset, moveDelta])
            }

            return drawLatest(map(moveEvent => {
              const normalisedValue = Math.min(Math.max(value, min), max)
              const deltaX = (moveEvent.clientX - downEvent.clientX) + (rectWidth * normalisedValue)

              moveEvent.preventDefault()

              const val = deltaX / rectWidth

              const cVal = Math.min(Math.max(val, min), max)
              const steppedVal = step > 0 ? cVal / step * step : cVal

              return steppedVal
            }, drag))
          }, combineObject({ state, sliderDimension }), downSrc)
        },
        join
      )
    )(
      $rangeWrapper(sliderStyle)(
        $row(
          styleInline(map(({ value }) => ({ left: `${Math.min(Math.max(value, 0), 1) * 100}%` }), state)),
          style({ width: '0px', top: '50%', position: 'absolute', transition: 'left 175ms cubic-bezier(0.25, 0.8, 0.25, 1) 0s', alignItems: 'center', placeContent: 'center' }),
        )(
          $thumb(
            styleBehavior(map(({ color, disabled }) => disabled ? { borderColor: 'transparent', pointerEvents: disabled ? 'none' : 'all' } : { borderColor: color, pointerEvents: 'all' }, combineObject({ disabled, color }))),
            style({ width: thumbSize + 'px', height: thumbSize + 'px' }),
          )(
            $text(style({ paddingTop: '2px' }))(thumbText(value))
          )
        )
      )
    ),
    {
      change: thumbePositionDelta
    }
  ]
})
