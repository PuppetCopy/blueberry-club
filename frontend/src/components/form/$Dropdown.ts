import { Behavior, O, Op } from "@aelea/core"
import { $Node, component, eventElementTarget, IBranch, INode, NodeComposeFn, nodeEvent, style, styleBehavior, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, Input, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map, merge, mergeArray, multicast, now, skip, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $caretDown } from "../../elements/$icons"


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

export interface ISelect<T> {
  options: T[]

  $container: NodeComposeFn<$Node>
  $option: Op<T, $Node>

  optionOp?: Op<INode, INode>
  $changeSelect?: Stream<T>
}



export const $Select = <T>({ options, optionOp = O(), $option, $container }: ISelect<T>) => component((
  [select, selectTether]: Behavior<IBranch, T>
) => {

  return [
    $container(
      ...options.map(item => {

        const selectBehavior = selectTether(
          nodeEvent('click'),
          constant(item)
        )

        const $opt = switchLatest($option(now(item)))
        const $val = optionOp($opt)

        return selectBehavior($val)
      })
    ),

    {
      select
    }
  ]
})



export interface IDropdown<T> extends Input<T> {
  select: Omit<ISelect<T>, '$value'>
  $selection: Op<T, $Node>

  openMenuOp?: Op<MouseEvent, MouseEvent>
}


export const $Dropdown = <T>({ value, disabled, validation, $selection, select, openMenuOp = O() }: IDropdown<T>) => component((
  [pick, pickTether]: Behavior<T, T>,
  [openMenu, openMenuTether]: Behavior<INode, any>,
) => {

  const isOpenState = multicast(switchLatest(map(isOpen => {
    if (isOpen) {
      return startWith(true, skip(1, constant(false, eventElementTarget('click', window))))
    }
    return now(false)
  }, mergeArray([constant(false, pick), openMenu]))))

  const $option = $row(layoutSheet.spacingSmall, style({ alignItems: 'center', padding: '15px 25px' }))
  const $selectableOption = $option(style({ cursor: 'pointer' }), stylePseudo(':hover', { backgroundColor: pallete.background }))

  const $caretDownIcon = $icon({ $content: $caretDown, width: '13px', svgOps: style({ marginTop: '2px' }), viewBox: '0 0 7.84 3.81' })

  
  // const disabledBehavior: Op<IBranch, IBranch> = disabled ? styleInline(map(isDisabled => isDisabled ? { opacity: ".15", pointerEvents: 'none' } : { opacity: "1", pointerEvents: 'all' }, config.disabled)) : O()


  const $container = select.$container(
    style({
      overflow: 'hidden', backgroundColor: pallete.horizon, zIndex: 50,
      border: `1px solid ${pallete.middleground}`, borderRadius: '20px', position: 'absolute', top: 'calc(100% + 5px)', display: 'none', left: 0
    }),
    styleBehavior(
      map(state => ({ display: state ? 'flex' : 'none' }), isOpenState)
    )
  )

  const openMenuBehavior = openMenuTether(
    nodeEvent('click'),
    openMenuOp
  )
  
  return [
    $column(style({ position: 'relative' }))(
      openMenuBehavior(switchLatest(
        $selection(merge(pick, value))
      )),

      $Select({
        ...select,
        $container,
        optionOp: $selectableOption
        // $option: map(x => $selectableOption($text(String(x))))
      })({ select: pickTether() })
    ),

    {
      select: pick
    }
  ]
})

