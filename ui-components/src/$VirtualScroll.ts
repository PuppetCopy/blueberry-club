
import { Behavior, combineObject } from '@aelea/core'
import { $Branch, $custom, $Node, $text, component, IBranch, NodeComposeFn, style } from '@aelea/dom'
import { $column, layoutSheet, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { zipState } from '@gambitdao/gmx-middleware'
import { filter, join, loop, map, mergeArray, multicast, scan, startWith, until } from "@most/core"
import { Stream } from '@most/types'


export type ScrollRequest = number

export type IScrollPagableReponse = {
  $items: $Branch[]
  pageSize: number
  offset: number
}

export type ScrollResponse = $Branch[] | IScrollPagableReponse

export interface QuantumScroll {
  insertAscending?: boolean
  dataSource: Stream<ScrollResponse>
  $container?: NodeComposeFn<$Node>
  $loader?: $Node
  $emptyMessage?: $Node
}


export const $defaultVScrollLoader = $text(style({ color: pallete.foreground, padding: '3px 10px' }))('loading...')
export const $defaultVScrollContainer = $column(layoutSheet.spacing)
const $defaultEmptyMessage = $column(layoutSheet.spacing, style({ padding: '20px' }))(
  $text('No items to display')
)


export const $VirtualScroll = ({
  dataSource,
  $container = $defaultVScrollContainer,
  $emptyMessage = $defaultEmptyMessage,
  $loader = $defaultVScrollLoader,
  insertAscending = false
}: QuantumScroll) => component((
  [intersecting, intersectingTether]: Behavior<IBranch, IntersectionObserverEntry>,
) => {

  const scrollIndex: Stream<ScrollRequest> = scan(seed => seed + 1, 0, intersecting)



  const intersectedLoader = intersectingTether(
    observer.intersection({ threshold: 1 }),
    map(entryList => entryList[0]),
    filter(entry => {
      return entry.isIntersecting === true
    }),
  )

  const $observerloader = $custom('observer')(intersectedLoader)(
    $loader
  )

  const dataSourceMc = multicast(dataSource)
  const loadState = zipState({ data: dataSourceMc, scrollIndex })

  const displayState = {
    isLoading: true
  }

  const $itemLoader = loop((seed, state) => {
    const itemCount = Array.isArray(state.data) ? state.data.length : state.data.$items.length

    if (state.scrollIndex === 0 && itemCount === 0) {
      return { seed, value: $defaultEmptyMessage }
    }

    if (Array.isArray(state.data)) {
      return { seed, value: mergeArray(state.data) }
    }



    const hasMoreItems = state.data.pageSize === itemCount

    const $items = hasMoreItems
      ? [...state.data.$items, $observerloader]
      : state.data.$items


    return { seed, value: mergeArray($items) }
  }, displayState, loadState)

  return [
    $container(
      map(node => ({ ...node, insertAscending })),
    )(
      until(dataSourceMc, $loader),
      join($itemLoader)
    ),

    { scrollIndex }
  ]
})