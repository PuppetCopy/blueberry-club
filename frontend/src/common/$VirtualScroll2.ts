
import { Behavior, combineObject } from '@aelea/core'
import { $Branch, $custom, $Node, $text, component, IBranch, NodeComposeFn, style } from '@aelea/dom'
import { $column, designSheet, layoutSheet, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { zipState } from '@gambitdao/gmx-middleware'
import { filter, join, loop, map, mergeArray, scan } from "@most/core"
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
}


export const $defaultVScrollLoader = $text(style({ color: pallete.foreground, padding: '3px 10px' }))('loading...')
export const $defaultVScrollContainer = $column(layoutSheet.spacing)


export const $VirtualScroll = (config: QuantumScroll) => component((
  [intersecting, intersectingTether]: Behavior<IBranch, IntersectionObserverEntry>,
) => {

  const scrollIndex: Stream<ScrollRequest> = scan(seed => seed + 1, 0, intersecting)


  const $container = (config.$container || $defaultVScrollContainer)(
    map(node => ({ ...node, insertAscending: config.insertAscending || false })),
  )

  const intersectedLoader = intersectingTether(
    observer.intersection({ threshold: 1 }),
    map(entryList => entryList[0]),
    filter(entry => {
      return entry.isIntersecting === true
    }),
  )

  const $loader = config.$loader || $defaultVScrollLoader
  const $observerloader = $custom('observer')(intersectedLoader)(
    $loader
  )

  const loadState = zipState({ data: config.dataSource, scrollIndex })

  const displayState = {
    isLoading: true
  }

  const $itemLoader = loop((seed, state) => {
    if (Array.isArray(state.data)) {
      return { seed, value: mergeArray(state.data) }
    }

    const hasMoreItems = state.data.pageSize === state.data.$items.length

    const $items = hasMoreItems
      ? [...state.data.$items, $observerloader]
      : state.data.$items


    return { seed, value: mergeArray($items) }
  }, displayState, loadState)

  return [
    $container(
      join($itemLoader)
    ),

    { scrollIndex }
  ]
})