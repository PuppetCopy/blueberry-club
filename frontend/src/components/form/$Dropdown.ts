import { Behavior, O, Op } from "@aelea/core"
import { $Node, component, eventElementTarget, IBranch, INode, NodeComposeFn, nodeEvent, style, styleBehavior, stylePseudo } from "@aelea/dom"
import { $column, $row, Input, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, merge, mergeArray, multicast, now, scan, skip, startWith, switchLatest } from "@most/core"
import { append, remove } from "@most/prelude"


export const buttonPrimaryStyle = style({
  color: 'white', whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px',
  padding: '12px 24px', fontWeight: 'bold', borderWidth: '1px', borderColor: pallete.message
})

export const secondaryButtonStyle = style({
  backgroundImage: 'linear-gradient(45deg,  #8A5FCF 21%, #D298ED 100%)',
  boxShadow: `2px 1000px 1px ${pallete.background} inset`,
  backgroundOrigin: 'border-box',
  backgroundClip: 'content-box, border-box',
  border: '1px solid transparent',
  borderRadius: '50px'
})

export interface ISelect<T> extends Input<T> {
  options: T[]

  $container?: NodeComposeFn<$Node>

  optionOp: Op<T, $Node>
}


export const $Select = <T>({ options, optionOp, $container = $column, value, disabled, validation }: ISelect<T>) => component((
  [select, selectTether]: Behavior<IBranch, T>
) => {

  return [
    $container(
      ...options.map(item => {

        const selectBehavior = selectTether(
          nodeEvent('click'),
          constant(item)
        )

        const $opt = switchLatest(optionOp(now(item)))
        const disableStyleBehavior = styleBehavior(map(isDisabled => ({ pointerEvents: isDisabled ? 'none' : 'all' }), disabled || empty()))
        const $val = disableStyleBehavior($opt)

        return selectBehavior($val)
      })
    ),

    {
      select
    }
  ]
})


export interface IMultiselect<T> extends Input<T[]> {
  select: ISelect<T>
}


export const $MultiSelect = <T>(config: IMultiselect<T>) => component((
  [select, selectTether]: Behavior<T, T>
) => {

  return [
    $Select({ ...config.select })({ select: selectTether() }),

    {
      selection: switchLatest(map(seedList => {

        return scan((seed, next) => {
          const matchedIndex = seed.indexOf(next)

          if (matchedIndex === -1) {
            return append(next, seed)
          }

          return remove(matchedIndex, seed)
        }, seedList, select)
      }, config.value))
    }
  ]
})



export interface IDropdown<T> {
  select: Omit<ISelect<T>, '$value'>
  $selection: Op<T, $Node>
  $container?: NodeComposeFn<$Node>
  $option?: NodeComposeFn<$Node>

  openMenuOp?: Op<MouseEvent, MouseEvent>
}



export const $defaultOptionContainer = $row(layoutSheet.spacingSmall, style({ alignItems: 'center', padding: '15px 25px', width: '100%' }), style({ cursor: 'pointer' }), stylePseudo(':hover', { backgroundColor: pallete.middleground }))
export const $defaultDropdownContainer = $column(layoutSheet.spacingTiny)
export const $defaultSelectContainer = $column(layoutSheet.spacingTiny, style({
  minWidth: '80px', overflow: 'hidden',
  border: `1px solid ${pallete.middleground}`, borderRadius: '20px',
  backgroundColor: pallete.background,
  boxShadow: `rgb(0 0 0 / 21%) 1px 1px 14px`
}))


export const $Dropdown = <T>({
  $container = $defaultDropdownContainer,
  $selection, $option = $defaultOptionContainer,
  select, openMenuOp = O() }: IDropdown<T>) => component((
  [pick, pickTether]: Behavior<T, T>,
  [openMenu, openMenuTether]: Behavior<INode, any>,
) => {

  const isOpenState = multicast(switchLatest(map(isOpen => {
    if (isOpen) {
      return startWith(true, skip(1, constant(false, eventElementTarget('click', window))))
    }
    return now(false)
  }, mergeArray([constant(false, pick), openMenu]))))

  const openMenuBehavior = openMenuTether(
    nodeEvent('click'),
    openMenuOp
  )
  
  return [
    $container(style({ position: 'relative' }))(
      openMenuBehavior(switchLatest(
        $selection(merge(pick, select.value))
      )),

      switchLatest(map(show => {
        if (!show) {
          return empty()
        }

        return $Select({
          ...select,
          optionOp: O(select.optionOp, map($option)),
          $container: (select.$container || $defaultSelectContainer)(
            style({
              zIndex: 50,
              position: 'absolute', top: 'calc(100% + 5px)'
            })
          ),
        // $option: map(x => $selectableOption($text(String(x))))
        })({ select: pickTether() })
      }, isOpenState))
    ),

    {
      select: pick
    }
  ]
})

