import { $node, $Node, component, nodeEvent, INode, style, styleBehavior, NodeComposeFn } from '@aelea/dom'
import { O, Behavior } from '@aelea/core'
import { pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, merge, multicast, switchLatest, take, tap, until, zip } from "@most/core"
import { Stream } from "@most/types"
import { colorAlpha } from "@aelea/ui-components-theme"
import { observer } from '@aelea/ui-components'


interface IPocus {
  $target: $Node
  $popContent: Stream<$Node>

  $container?: NodeComposeFn<$Node>
  offset?: number
  padding?: number
  dismiss?: Stream<any>
}

export const $Popover = ({ $popContent, offset = 30, padding = 76, dismiss = empty(), $container = $node, $target }: IPocus) => component((
  [overlayClick, overlayClickTether]: Behavior<INode, any>,
  [targetIntersection, targetIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,
  [popoverContentDimension, popoverContentDimensionTether]: Behavior<INode, ResizeObserverEntry[]>,
) => {


  const $$popContentMulticast = multicast($popContent)

  const $overlay = $node(
    style({
      position: 'absolute', zIndex: 99999,
      top: 0, left: 0, right: 0, bottom: 0
    }),
    overlayClickTether(
      nodeEvent('click')
    ),
    styleBehavior(
      zip(([contentResize], [IntersectiontargetRect]) => {
        const { y, x, bottom } = IntersectiontargetRect.intersectionRect
        const rootWidth = IntersectiontargetRect.rootBounds?.width || 0

        const width = Math.max(contentResize.contentRect.width, IntersectiontargetRect.intersectionRect.width) + (padding * 2) + offset
        const targetHeight = IntersectiontargetRect.intersectionRect.height
        const contentHeight = contentResize.contentRect.height
        const height = contentHeight + targetHeight + offset

        const placedWidth = x + contentResize.contentRect.width

        const leftOffset = placedWidth > rootWidth ? rootWidth - placedWidth - 20 : 0

        const left = x + (IntersectiontargetRect.intersectionRect.width / 2) + leftOffset + 'px'

        const bottomSpace = window.innerHeight - bottom
        const popDown = bottomSpace > bottom
        const top = (popDown ? y + (height / 2) : y - ((height - padding) / 2)) + 'px'


        return {
          backgroundImage: `radial-gradient(${width}px ${height + padding * 2}px at top ${top} left ${left}, ${pallete.background} ${width / 2}px, ${colorAlpha(pallete.horizon, .45)})`,
          // backdropFilter: 'blur(2px)'
        }
      }, popoverContentDimension, targetIntersection)
    )
  )

  const contentOps = O(
    popoverContentDimensionTether(
      observer.resize({})
    ),
    styleBehavior(
      zip(([contentRect], [rect]) => {
        const { y, x, width, bottom } = rect.intersectionRect
        const rootWidth = rect.rootBounds?.width || 0

        const bottomSpcace = window.innerHeight - bottom
        const goDown = bottomSpcace > bottom

        const top = (goDown ? bottom + offset : y - offset) + 'px'

        const placedWidth = x + contentRect.contentRect.width

        const leftOffset = placedWidth > rootWidth ? rootWidth - placedWidth - 20 : 0

        const left = x + leftOffset + (width / 2) + 'px'

        return {
          top, left,
          visibility: 'visible',
          transform: `translate(-50%, ${goDown ? '0' : '-100%'})`
        }
      }, popoverContentDimension, targetIntersection)
    ),
    style({ zIndex: 100000, position: 'absolute', visibility: 'hidden' }),
  )

  const dismissOverlay = until(merge(overlayClick, dismiss))


  const $popover = switchLatest(
    map($content => {
      return dismissOverlay(
        merge(
          $overlay(),
          contentOps($content),
        )
      )
    }, $$popContentMulticast)
  )


  const targetOp = O(
    targetIntersectionTether(
      observer.intersection()
    ),
    styleBehavior(
      merge(
        constant({ zIndex: 100000, position: 'relative' }, $$popContentMulticast),
        constant(null, overlayClick)
      )
    )
  )

  return [
    $container(
      targetOp($target),
      $popover,
    ),

    { overlayClick }
  ]
})

