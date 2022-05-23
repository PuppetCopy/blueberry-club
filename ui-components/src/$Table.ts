import { Behavior, O, Op } from "@aelea/core"
import { $Node, component, INode, nodeEvent, style, stylePseudo } from '@aelea/dom'
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { chain, constant, map, merge, never, now, scan, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $caretDown } from "./$icons"
import { $VirtualScroll, IScrollPagableReponse, QuantumScroll, ScrollRequest, ScrollResponse } from "./$VirtualScroll"



export type TablePageResponse<T> = T[] | Omit<IScrollPagableReponse, '$items'> & { data: T[] }

export interface TableOption<T, FilterState> {
  columns: TableColumn<T>[]

  dataSource: Stream<TablePageResponse<T>>
  scrollConfig?: Omit<QuantumScroll, 'dataSource'>

  bodyContainerOp?: Op<INode, INode>

  rowOp?: Op<INode, INode>
  cellOp?: Op<INode, INode>
  headerCellOp?: Op<INode, INode>
  bodyCellOp?: Op<INode, INode>

  sortChange?: Stream<ISortBy<T>>
  filterChange?: Stream<FilterState>
  $sortArrowDown?: $Node
}

export interface TableColumn<T> {
  $head: $Node
  $body: Op<T, $Node>
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




export const $Table = <T, FilterState = never>({
  dataSource, columns, scrollConfig, cellOp,
  headerCellOp, bodyCellOp,
  bodyContainerOp = O(),
  rowOp = O(),
  sortChange = never(),
  filterChange = never(),
  $sortArrowDown = $caretDown
}: TableOption<T, FilterState>) => component((
  [scrollIndex, scrollIndexTether]: Behavior<ScrollRequest, ScrollRequest>,
  [sortByChange, sortByChangeTether]: Behavior<INode, keyof T>
) => {


  const cellStyle = O(
    style({ padding: '3px 6px', overflowWrap: 'break-word' }),
    layoutSheet.flex,
  )

  const $cellHeader = $row(
    cellStyle,
    layoutSheet.spacingSmall,
    style({ fontSize: '15px', alignItems: 'center', color: pallete.foreground, }),
    cellOp || O(),
    headerCellOp || O()
  )

  const cellBodyOp = O(
    cellStyle,
    cellOp || O(),
    bodyCellOp || O()
  )

  const $rowContainer = $row(layoutSheet.spacingSmall)

  const $rowHeaderContainer = $rowContainer(
    style({ overflowY: 'scroll' }), stylePseudo('::-webkit-scrollbar', { backgroundColor: 'transparent', width: '6px' })
  )

  const sortBy = chain((state) => {
    const changeState = scan((seed, change): ISortBy<T> => {
      const direction = seed.name === change ?
        seed.direction === 'asc' ? 'desc' : 'asc'
        : 'desc'
      
      return { direction, name: change }
    }, state, sortByChange)

    return startWith(state, changeState)
  }, sortChange)

  const $header = $rowHeaderContainer(
    ...columns.map(col => {

      if (col.sortBy) {
        const behavior = sortByChangeTether(
          nodeEvent('click'),
          constant(col.sortBy)
        )

        return $cellHeader(behavior, col.columnOp || O())(
          style({ cursor: 'pointer' }, col.$head),
          switchLatest(map(s => {

            return $column(style({ cursor: 'pointer' }))(
              $icon({ $content: $sortArrowDown, fill: s.name === col.sortBy ? s.direction === 'asc' ? pallete.foreground : '' : pallete.foreground, svgOps: style({ transform: 'rotate(180deg)' }), width: '8px', viewBox: '0 0 32 19.43' }),
              $icon({ $content: $sortArrowDown, fill: s.name === col.sortBy ? s.direction === 'desc' ? pallete.foreground : '' : pallete.foreground, width: '8px', viewBox: '0 0 32 19.43' })
            )
          }, sortBy))
        )
      }
            
      const $headCell = $cellHeader(col.columnOp || O())(
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
        const $items = (Array.isArray(res) ? res : res.data).map(rowData => $rowContainer(
          ...columns.map(col => O(cellBodyOp, col.columnOp || O())(
            switchLatest(col.$body(now(rowData)))
          ))
        ))

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
    $column(bodyContainerOp)(
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
