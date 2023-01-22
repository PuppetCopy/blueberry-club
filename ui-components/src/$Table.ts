import { Behavior, O, Op } from "@aelea/core"
import { $Node, $svg, attr, component, INode, NodeComposeFn, nodeEvent, style } from '@aelea/dom'
import { $column, $icon, $row, designSheet, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { chain, constant, map, merge, never, now, scan, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $VirtualScroll, IScrollPagableReponse, QuantumScroll, ScrollRequest, ScrollResponse } from "./$VirtualScroll"



export type TablePageResponse<T> = T[] | Omit<IScrollPagableReponse, '$items'> & { page: T[] }

export interface TableOption<T, FilterState> {
  $container?: NodeComposeFn<$Node>

  columns: TableColumn<T>[]

  dataSource: Stream<TablePageResponse<T>>
  scrollConfig?: Omit<QuantumScroll, 'dataSource'>

  $rowContainer?: NodeComposeFn<$Node>
  $headerRowContainer?: NodeComposeFn<$Node>
  $bodyRowContainer?: NodeComposeFn<$Node>

  $cell?: NodeComposeFn<$Node>
  $bodyCell?: NodeComposeFn<$Node>
  $headerCell?: NodeComposeFn<$Node>

  sortChange?: Stream<ISortBy<T>>
  filterChange?: Stream<FilterState>
  $sortArrowDown?: $Node
}

export interface TableColumn<T> {
  $head: $Node
  $$body: Op<T, $Node>
  sortBy?: keyof T,

  columnOp?: Op<INode, INode>
}

export interface IPageRequest {
  page: ScrollRequest,
  pageSize: number
}

export interface ISortBy<T> {
  direction: 'asc' | 'desc'
  name: keyof T
}


const $caretDown = $svg('path')(attr({ d: 'M4.616.296c.71.32 1.326.844 2.038 1.163L13.48 4.52a6.105 6.105 0 005.005 0l6.825-3.061c.71-.32 1.328-.84 2.038-1.162l.125-.053A3.308 3.308 0 0128.715 0a3.19 3.19 0 012.296.976c.66.652.989 1.427.989 2.333 0 .906-.33 1.681-.986 2.333L18.498 18.344a3.467 3.467 0 01-1.14.765c-.444.188-.891.291-1.345.314a3.456 3.456 0 01-1.31-.177 2.263 2.263 0 01-1.038-.695L.95 5.64A3.22 3.22 0 010 3.309C0 2.403.317 1.628.95.98c.317-.324.68-.568 1.088-.732a3.308 3.308 0 011.24-.244 3.19 3.19 0 011.338.293z' }))()

export const $defaultTableCell = $row(
  layoutSheet.spacingSmall,
  style({ padding: '6px 0', flex: 1, alignItems: 'center', overflowWrap: 'break-word' }),
)

export const $defaultTableHeaderCell = $defaultTableCell(
  style({ fontSize: '15px', alignItems: 'center', padding: '12px 0', color: pallete.foreground, })
)
export const $defaultTableRowContainer = screenUtils.isDesktopScreen
  ? $row(layoutSheet.spacing, style({ padding: `2px 16px` }))
  : $row(layoutSheet.spacingSmall, style({ padding: `2px 10px` }))



export const $defaultTableContainer = $column(designSheet.customScroll, style({ overflow: 'auto scroll' }))

export const $Table = <T, FilterState = never>({
  dataSource, columns, scrollConfig,
  $cell = $defaultTableCell,
  $bodyCell = $cell,
  $headerCell = $defaultTableHeaderCell,
  $container = $defaultTableContainer,
  $rowContainer = $defaultTableRowContainer,
  $headerRowContainer = $rowContainer,
  $bodyRowContainer = $rowContainer,
  sortChange = never(),
  filterChange = never(),
  $sortArrowDown = $caretDown
}: TableOption<T, FilterState>) => component((
  [scrollIndex, scrollIndexTether]: Behavior<ScrollRequest, ScrollRequest>,
  [sortByChange, sortByChangeTether]: Behavior<INode, keyof T>
) => {



  const sortBy = chain((state) => {
    const changeState = scan((seed, change): ISortBy<T> => {
      const direction = seed.name === change ?
        seed.direction === 'asc' ? 'desc' : 'asc'
        : 'desc'

      return { direction, name: change }
    }, state, sortByChange)

    return startWith(state, changeState)
  }, sortChange)

  const $header = $headerRowContainer(
    ...columns.map(col => {

      if (col.sortBy) {
        const behavior = sortByChangeTether(
          nodeEvent('click'),
          constant(col.sortBy)
        )

        return $headerCell(col.columnOp || O(), behavior)(
          style({ cursor: 'pointer' }, col.$head),
          switchLatest(map(s => {

            return $column(style({ cursor: 'pointer' }))(
              $icon({ $content: $sortArrowDown, fill: s.name === col.sortBy ? s.direction === 'asc' ? pallete.foreground : '' : pallete.foreground, svgOps: style({ transform: 'rotate(180deg)' }), width: '8px', viewBox: '0 0 32 19.43' }),
              $icon({ $content: $sortArrowDown, fill: s.name === col.sortBy ? s.direction === 'desc' ? pallete.foreground : '' : pallete.foreground, width: '8px', viewBox: '0 0 32 19.43' })
            )
          }, sortBy))
        )
      }

      const $headCell = $headerCell(col.columnOp || O())(
        col.$head
      )

      return $headCell
    })
  )

  const requestPageFilters = merge(sortByChange, filterChange)

  const $body = switchLatest(map(() => {
    return $VirtualScroll({
      ...scrollConfig,
      dataSource: map((res): ScrollResponse => {
        const $items = (Array.isArray(res) ? res : res.page).map(rowData => {

          return $bodyRowContainer(
            ...columns.map(col => {
              return $bodyCell(col.columnOp || O())(
                switchLatest(col.$$body(now(rowData)))
              )
            })
          )
        })

        if (Array.isArray(res)) {
          return $items
        } else {
          return {
            $items,
            offset: res.offset,
            pageSize: res.pageSize
          }
        }

      }, dataSource)
    })({
      scrollIndex: scrollIndexTether()
    })
  }, startWith(null, requestPageFilters)))

  return [
    $container(
      $header,
      $body,
    ),

    {
      scrollIndex,
      sortBy,
      filterChange
    }
  ]

})
