
import { Behavior } from '@aelea/core'
import { $Branch, $custom, $Node, $text, component, IBranch, NodeComposeFn, style } from '@aelea/dom'
import { $column, designSheet, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { chain, empty, filter, loop, map, merge, mergeArray, scan, skip, startWith, switchLatest } from "@most/core"
import { Stream } from '@most/types'


export type ScrollRequest = number

export type IScrollPagableReponse = {
  $items: $Branch[]
  pageSize: number
  offset: number
}

export type ScrollResponse = $Branch[] | IScrollPagableReponse

export interface QuantumScroll {
  $container?: NodeComposeFn<$Node>

  insertAscending?: boolean

  dataSource: Stream<ScrollResponse>

  $loader?: $Node

}


const $defaultLoader = $text(style({ color: pallete.foreground, padding: '3px 10px' }))('loading...')


export const $VirtualScroll = (config: QuantumScroll) => component((
  [intersecting, intersectingTether]: Behavior<IBranch, IntersectionObserverEntry>,
) => {

  const scrollReuqestWithInitial: Stream<ScrollRequest> = skip(1, scan(seed => seed + 1, -1, intersecting))

  const $loader = config.$loader || $defaultLoader

  const $container = (config.$container || $column)(
    designSheet.customScroll,
    style({ overflow: 'auto' }),
    map(node => ({ ...node, insertAscending: config.insertAscending || false })),
  )

  const intersectedLoader = intersectingTether(
    observer.intersection({ threshold: 1 }),
    map(entryList => entryList[0]),
    filter(entry => {
      return entry.isIntersecting === true
    }),
  )

  const $observer = $custom('observer')(intersectedLoader)()

  const loadState = merge(
    map(data => ({ $intermediate: $observer, data }), config.dataSource),
    map(() => ({ $intermediate: $loader, }), scrollReuqestWithInitial)
  )

  const $itemLoader = loop((seed, state) => {

    if ('data' in state && state.data) {

      if (Array.isArray(state.data)) {
        return { seed, value: empty() }
      }

      const hasMoreItems = state.data.pageSize === state.data.$items.length
      console.log(hasMoreItems)
      const value = hasMoreItems ? state.$intermediate : empty()

      return { seed, value }
    }

    return { seed, value: state.$intermediate }
  }, {}, loadState)

  return [
    $container(
      chain($list => {
        const $items = Array.isArray($list) ? $list : $list.$items
        return mergeArray($items)
      }, config.dataSource),
      switchLatest(
        startWith($observer, $itemLoader)
      )
    ),

    { scrollIndex: scrollReuqestWithInitial }
  ]
})