import { Behavior, Op } from "@aelea/core"
import { component, IBranch, style, nodeEvent, eventElementTarget, styleInline, $text, $Node } from "@aelea/dom"
import { Input, $row, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { readableNumber } from "@gambitdao/gmx-middleware"
import { combine, skipRepeats, snapshot, until, mergeArray, now, multicast, join, map } from "@most/core"

export interface LeverageSlider extends Input<number> {
  thumbSize?: number

  thumbDisplayOp: Op<number, string>
}

export const $ButterflySlider = ({ value, thumbSize = 34, thumbDisplayOp }: LeverageSlider) => component((
  [sliderDimension, sliderDimensionTether]: Behavior<IBranch<HTMLInputElement>, number>,
  [thumbePositionDelta, thumbePositionDeltaTether]: Behavior<IBranch<HTMLInputElement>, number>
) => {


  const change = multicast(skipRepeats(combine((slider, thumb) => thumb / slider, sliderDimension, thumbePositionDelta)))

  const positive = map(n => {
    if (n === 0) {
      return null
    }

    return n > 0 ? true : false
  }, change)

  const sizePx = thumbSize + 'px'


  const $range = $row(sliderDimensionTether(observer.resize({}), map(res => res[0].contentRect.width)), style({ placeContent: 'center', backgroundColor: pallete.background, height: '2px', position: 'relative', zIndex: 10 }))

  const changeBehavior = thumbePositionDeltaTether(
    nodeEvent('pointerdown'),
    snapshot((current, downEvent) => {

      const target = downEvent.currentTarget

      if (!(target instanceof HTMLElement)) {
        throw new Error('no target event captured')
      }

      const drag = until(eventElementTarget('pointerup', window.document), eventElementTarget('pointermove', window.document))

      return map(moveEvent => {

        const maxWidth = target.parentElement!.parentElement!.clientWidth

        const deltaX = ((moveEvent.clientX - downEvent.clientX) * 2) + current

        moveEvent.preventDefault()


        return Math.abs(deltaX) > maxWidth ? deltaX > 0 ? maxWidth : -maxWidth : deltaX

      }, drag)
    }, mergeArray([now(0), multicast(thumbePositionDelta)])),
    join
  )

  const $thumb = $row(
    changeBehavior,
    style({
      width: thumbSize + 'px',
      height: thumbSize + 'px',
      position: 'absolute',
      background: pallete.background,
      borderRadius: '50%',
      cursor: 'grab',
      left: '-15px',
      alignItems: 'center',
      placeContent: 'center',
      border: `1px solid ${pallete.foreground}`,
    }),

    styleInline(map(isPositive => {

      if (isPositive === null) {
        return { right: 'auto' }
      }

      if (isPositive) {
        return { left: 'auto', right: `-${thumbSize / 2}px`, border: `1px solid ${pallete.positive}` }
      }

      return { left: `-${thumbSize / 2}px`, border: `1px solid ${pallete.negative}` }
    }, positive))
  )(
    $text(style({ fontSize: '11px' }))(thumbDisplayOp(change))
  )


  const sliderStyle = styleInline(map(n => {
    const width = Math.abs(n) + 'px'
    const background = n === 0 ? '' : n > 0 ? `linear-gradient(90deg, transparent 10%, ${pallete.positive} 100%)` : `linear-gradient(90deg, ${pallete.negative} 0%, transparent 100%)`

    return { width, background }
  }, thumbePositionDelta))


  return [
    $range(
      $row(style({ alignItems: 'center', position: 'relative' }), sliderStyle)(
        $thumb
      )
    ),
    {
      change
    }
  ]
})
