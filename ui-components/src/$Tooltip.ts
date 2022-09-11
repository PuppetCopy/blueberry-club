import { Behavior, O } from "@aelea/core"
import { $Node, $text, component, eventElementTarget, INode, nodeEvent, style, styleInline } from '@aelea/dom'
import { $column, $row, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, mergeArray, switchLatest, empty, map, skipRepeats, startWith, filter, now } from "@most/core"




export interface TooltipConfig {
  $anchor: $Node
  $content: $Node
}




export const $Tooltip = ({ $anchor, $content }: TooltipConfig) => component((
  [hover, hoverTether]: Behavior<INode, boolean>,
  [targetIntersection, targetIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,
) => {





  return [

    $column(
      hoverTether(
        nodeEvent('pointerenter'),
        map(enterEvent => {

          const target = enterEvent.currentTarget
          if (!(target instanceof HTMLElement)) {
            throw new Error('invalid Target element')
          }

          const pointerLeave = eventElementTarget('pointerleave', target)
          return startWith(true, constant(false, pointerLeave))
        }),
        switchLatest,
        skipRepeats,
      ),
      // hoverTether(
      //   src => {
      //     const enter = constant(true, nodeEvent('pointerenter', src))
      //     const leave = constant(false, nodeEvent('pointerleave', src))
      //     return mergeArray([enter, leave])
      //   }
      // ),
      targetIntersectionTether(
        observer.intersection(),
      ), style({ position: 'relative' })
    )(
      $anchor,
      switchLatest(map(show => {
        if (!show) {
          return empty()
        }

        return $row(
          style({
            zIndex: 60,
            position: 'absolute',
            display: 'none',
            background: pallete.background,
            border: pallete.middleground,
            padding: '8px',
            minWidth: '150px',
            borderRadius: '8px',
            left: 0,
            // fontSize: '.75em',
          }),
          styleInline(
            map(([rect]) => {
              const { bottom } = rect.intersectionRect

              const bottomSpcace = window.innerHeight - bottom
              const goDown = bottomSpcace > bottom

              return {
                [goDown ? 'top' : 'bottom']: 'calc(100% + 5px)',
                display: 'flex'
              }
            }, targetIntersection)
          ),
        )(
          $content
        )
      }, hover))
    ),
    {
      hover
    }
  ]

})
