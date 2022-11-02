import { Behavior, O } from "@aelea/core"
import { $Node, $text, component, eventElementTarget, INode, NodeComposeFn, nodeEvent, style, styleInline } from '@aelea/dom'
import { $column, $row, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, mergeArray, switchLatest, empty, map, skipRepeats, startWith, filter, now } from "@most/core"




export interface TooltipConfig {
  $anchor: $Node
  $content: $Node
  $container?: NodeComposeFn<$Node>,
}




export const $Tooltip = ({ $anchor, $content, $container = $column(style({ position: 'relative' })) }: TooltipConfig) => component((
  [hover, hoverTether]: Behavior<INode, boolean>,
  [targetIntersection, targetIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,
) => {





  return [
    $container(
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
      targetIntersectionTether(
        observer.intersection(),
      )
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
