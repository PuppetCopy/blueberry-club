import { Behavior } from "@aelea/core"
import { $Node, component, eventElementTarget, INode, NodeComposeFn, nodeEvent, style, styleInline } from '@aelea/dom'
import { $row, observer, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, switchLatest, empty, map, skipRepeats, startWith, never, skip, tap, zip } from "@most/core"
import { invertColor } from "./common"




export interface TooltipConfig {
  $anchor: $Node
  $content: $Node
  $container?: NodeComposeFn<$Node>,
}




export const $Tooltip = ({ $anchor, $content, $container = $row }: TooltipConfig) => component((
  [hover, hoverTether]: Behavior<INode, boolean>,
  [targetIntersection, targetIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,
  [contentIntersection, contentIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,
) => {


  const isTouchDevice = 'ontouchstart' in window

  return [
    $container(
      hoverTether(
        nodeEvent(isTouchDevice ? 'pointerenter' :'pointerenter'),
        map(enterEvent => {

          // prevent selection highlighting
          if (isTouchDevice) {
            enterEvent.preventDefault()
          }
          

          const target = enterEvent.currentTarget
          if (!(target instanceof HTMLElement)) {
            throw new Error('invalid Target element')
          }

          const pointerLeave = isTouchDevice
            ? skip(1, eventElementTarget('pointerdown', window)) 
            : eventElementTarget('pointerleave', target)
          return startWith(true, constant(false, pointerLeave))
          // return startWith(true, never())
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
          contentIntersectionTether(
            observer.intersection()
          ),
          style({
            zIndex: 5160,
            position: 'absolute',
            visibility: 'hidden',
            background: pallete.background,
            border: pallete.middleground,
            boxShadow: '1px 1px 5px #0000007a',
            padding: '8px',
            maxWidth: '250px',
            borderRadius: '8px',
            fontWeight: 'normal',
            color: pallete.message,
            // fontSize: '.75em',
          }),
          styleInline(
            zip(([contentRect], [rect]) => {
              const { bottom, top, left, right } = rect.intersectionRect
              const { width } = contentRect.boundingClientRect

              const bottomSpcace = window.innerHeight - bottom
              const goDown = bottomSpcace > bottom
              const rootWidth = contentRect.rootBounds?.width || 0


              const leftOffset = right + width > window.innerWidth ? window.innerWidth - width - 20 : 0

              return {
                top: (goDown ? bottom + 5 : top - 5) + 'px',
                left: width / 2 + leftOffset + 'px',
                visibility: 'visible',
                transform: `translate(-50%, ${goDown ? 0 : -100}%)`,
              }
            }, contentIntersection, targetIntersection)
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
