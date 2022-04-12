import { Behavior, O, Op } from "@aelea/core"
import { $element, $node, $Node, $text, attr, component, eventElementTarget, IBranch, INode, NodeComposeFn, nodeEvent, style, styleBehavior, stylePseudo } from "@aelea/dom"
import { $column, $Field, $icon, $row, $TextField, Input, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { $xCross } from "@gambitdao/ui-components"
import { constant, empty, map, merge, mergeArray, multicast, now, scan, skip, snapshot, startWith, switchLatest, tap } from "@most/core"
import { append, remove } from "@most/prelude"
import { $label as $LabelNode } from "../../common/$TextField"
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

export interface ISelect<T> extends Input<T> {
  options: T[]

  $container: NodeComposeFn<$Node>
  $$option: Op<T, $Node>
}


export const $Select = <T>({ options, $$option, disabled, $container, value, validation }: ISelect<T>) => component((
  [select, selectTether]: Behavior<IBranch, T>
) => {

  return [
    $container(
      ...options.map(item => {

        const selectBehavior = selectTether(
          nodeEvent('click'),
          constant(item)
        )

        const $opt = switchLatest($$option(now(item)))
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


export interface IMultiselect<T> extends ISelect<T> {

}





export interface IDropdown<T> {
  multiselect?: boolean
  select: ISelect<T>
  $selection: Op<T, $Node>
  $container?: NodeComposeFn<$Node>
  $option?: NodeComposeFn<$Node>

  openMenuOp?: Op<MouseEvent, MouseEvent>
}



export const $defaultOptionContainer = $row(layoutSheet.spacingSmall, style({ alignItems: 'center', padding: '15px 25px', width: '100%' }), style({ cursor: 'pointer' }), stylePseudo(':hover', { backgroundColor: pallete.middleground }))
export const $defaultSelectContainer = $column(layoutSheet.spacingTiny, style({
  minWidth: '80px', overflow: 'hidden',
  border: `1px solid ${pallete.middleground}`, borderRadius: '20px',
  backgroundColor: pallete.background,
  boxShadow: `rgb(0 0 0 / 21%) 1px 1px 14px`
}))


export const $Dropdown = <T>({
  $container = $column(layoutSheet.spacingTiny),
  $selection,
  $option = $defaultOptionContainer,
  select,
  openMenuOp = O()
}: IDropdown<T>) => component((
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

  const $floatingContainer = $defaultSelectContainer(
    style({
      zIndex: 50,
      position: 'absolute', top: 'calc(100% + 5px)'
    })
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

        return $floatingContainer(
          $Select({
            ...select,
            $container: select.$container,
            $$option: O(select.$$option, map($option)),
          // $option: map(x => $selectableOption($text(String(x))))
          })({ select: pickTether() })
        )
      }, isOpenState))
    ),

    {
      select: pick
    }
  ]
})


export const $defaultDropMultiSelectContainer = $row(layoutSheet.spacingTiny, style({ padding: `15px`, borderBottom: `1px solid ${pallete.message}` }))
export const $defaultDropMultiSelectOption = $row(layoutSheet.spacingSmall,
  style({
    borderRadius: '15px', overflow: 'hidden', border: `1px solid ${pallete.message}`,
    alignItems: 'center', padding: '8px', width: '100%'
  }),
  stylePseudo(':hover', { backgroundColor: pallete.middleground })
)
export const $defaultChip = $row(style({ border: `1px solid ${pallete.foreground}`, padding: '8px', cursor: 'default', alignItems: 'center', borderRadius: '22px' }))



export interface IMultiselectDrop<T> extends Input<T[]> {
  selectDrop: Omit<IMultiselect<T>, 'value'>
  $label?: $Node
  placeholder?: string

  $container?: NodeComposeFn<$Node>
  $dropdownContainer?: NodeComposeFn<$Node>

  $chip?: NodeComposeFn<$Node>
  $$chip: Op<T, $Node>

  openMenuOp?: Op<MouseEvent, MouseEvent>
}

export const $DropMultiSelect = <T>({
  $container = $defaultDropMultiSelectContainer,
  $$chip,
  placeholder,
  $label = empty(),
  $chip = $defaultChip,
  selectDrop,
  openMenuOp = O(),
  value
}: IMultiselectDrop<T>
) => component((
  [pick, pickTether]: Behavior<T, T>,
  [openMenu, openMenuTether]: Behavior<INode, any>,

  [focusStyle, interactionTether]: Behavior<IBranch, true>,
  [dismissstyle, dismissTether]: Behavior<IBranch, false>,
  [blur, blurTether]: Behavior<IBranch, FocusEvent>,
  [focusField, focusFieldTether]: Behavior<IBranch, FocusEvent>,
  [inputSearch, inputSearchTether]: Behavior<IBranch<HTMLInputElement>, string>,
  [clickOptionRemove, clickOptionRemoveTether]: Behavior<INode, T>,
) => {

  const openTrigger = mergeArray([
    focusField,
    openMenu
  ])

  

  const isOpenState = multicast(switchLatest(map(isOpen => {
    if (isOpen) {
      return startWith(true, skip(1, constant(false, eventElementTarget('click', window))))
    }
    return now(false)
  }, mergeArray([constant(false, pick), openTrigger]))))

  const openMenuBehavior = openMenuTether(
    nodeEvent('click'),
    openMenuOp
  )

  const selection = multicast(switchLatest(
    map(initSeedList => {
      return skip(1, scan((seed, next) => {
        const matchedIndex = seed.indexOf(next)

        if (matchedIndex === -1) {
          return append(next, seed)
        }

        return remove(matchedIndex, seed)
      }, initSeedList, mergeArray([pick, clickOptionRemove])))
    }, value)
  ))
  
  const sl = tap(console.log, merge(selection, value))

  return [
    $LabelNode(layoutSheet.flex, layoutSheet.spacingTiny, style({ display: 'flex', flex: 1, flexDirection: 'row' }))(
      $row(style({ alignSelf: 'flex-start', cursor: 'pointer', paddingBottom: '1px' }))(
        $label
      ),

      switchLatest(map(valueList => {
        const $content = $container(layoutSheet.flex, layoutSheet.spacing, style({ alignItems: 'center', position: 'relative', flexWrap: 'wrap' }))(
          ...valueList.map(token => {

            return $chip(
              switchLatest($$chip(now(token))),
              $icon({
                  
                $content: $xCross, width: '32px',
                svgOps: O(
                  style({ padding: '6px', cursor: 'pointer' }),
                  clickOptionRemoveTether(nodeEvent('click'), tap(x => x.preventDefault()), constant(token))
                ),
                viewBox: '0 0 32 32'
              })
            )
          }),
            
          $row(style({ alignItems: 'center', flex: '1', alignSelf: 'stretch' }))(
            $element('input')(
              placeholder ? attr({ placeholder }) : O(),

              style({
                border: 'none',
                fontSize: '1em',
                alignSelf: 'stretch',
                outline: 'none',
                minHeight: '36px',
                flex: '1 0 150px',
                color: pallete.message,
                background: 'transparent',
              }),

              inputSearchTether(
                nodeEvent('input'),
                map(inputEv => {
                  if (inputEv.target instanceof HTMLInputElement) {
                    const text = inputEv.target.value
                    return text || ''
                  }
                  return ''
                })
              ),

              blurTether(nodeEvent('blur')),
              focusFieldTether(nodeEvent('focus')),

            )(),
            $icon({ $content: $caretDown, width: '18px', svgOps: style({ marginTop: '3px', minWidth: '18px', marginLeft: '6px' }), viewBox: '0 0 32 32' }),
          ),



          switchLatest(map((show) => {
            if (!show) {
              return empty()
            }

            const $floatingContainer = selectDrop.$container(
              style({
                padding: '8px', zIndex: 50, left: 0,
                position: 'absolute', top: 'calc(100% + 5px)'
              })
            )

            const optionSelection = selectDrop.options.filter(n => valueList.indexOf(n) === -1)

            if (optionSelection.length === 0) {
              return $floatingContainer($text('Nothing to select'))
            }

            
            return $Select({
              ...selectDrop,
              $container: $floatingContainer,
              options: optionSelection,
              value: empty(),
              // $container: ,
              // $option: map(x => $selectableOption($text(String(x))))
            })({
              select: pickTether()
            })
          }, isOpenState))
        )

        return $content
      }, sl)),
        
    ),

    {
      selection 
    }
  ]
})

