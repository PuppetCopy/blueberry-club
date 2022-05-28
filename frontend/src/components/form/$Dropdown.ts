import { Behavior, O, Op } from "@aelea/core"
import { $element, $Node, $text, attr, component, eventElementTarget, IBranch, INode, NodeComposeFn, nodeEvent, style, styleBehavior, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, Input, layoutSheet, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { $xCross } from "@gambitdao/ui-components"
import { constant, empty, map, merge, mergeArray, multicast, now, scan, skip, skipRepeats, snapshot, startWith, switchLatest, tap } from "@most/core"
import { append, remove } from "@most/prelude"
import { Stream } from "@most/types"
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
  list: T[]

  $container: NodeComposeFn<$Node>
  $$option: Op<T, $Node>
}


export const $Select = <T>({ list, $$option, disabled, $container, value, validation }: ISelect<T>) => component((
  [select, selectTether]: Behavior<IBranch, T>
) => {

  return [
    $container(
      ...list.map(item => {

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
  $container = $column(layoutSheet.spacingTiny, style({ position: 'relative' })),
  $selection,
  $option = $defaultOptionContainer,
  select,
  openMenuOp = O()
}: IDropdown<T>) => component((
  [pick, pickTether]: Behavior<T, T>,
  [openMenu, openMenuTether]: Behavior<INode, any>,
  [targetIntersection, targetIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,

) => {

  const isOpenState = multicast(switchLatest(map(isOpen => {
    if (isOpen) {
      return startWith(true, skip(1, constant(false, eventElementTarget('click', window))))
    }
    return now(false)
  }, mergeArray([constant(false, pick), openMenu]))))

  const openMenuBehavior = O(
    openMenuTether(
      nodeEvent('click'),
      openMenuOp
    ),
    targetIntersectionTether(
      observer.intersection(),
    ),
  )




  return [
    $container(
      openMenuBehavior(switchLatest(
        $selection(merge(pick, select.value))
      )),

      switchLatest(map(show => {
        if (!show) {
          return empty()
        }

        const dropBehavior = O(
          styleBehavior(
            map(([rect]) => {
              const { bottom } = rect.intersectionRect

              const bottomSpcace = window.innerHeight - bottom
              const goDown = bottomSpcace > bottom

              return {
                [goDown ? 'top' : 'bottom']: 'calc(100% + 5px)',
                display: 'flex'
              }
            }, targetIntersection)
          ),
        )

        return dropBehavior(
          $Select({
            ...select,
            $container: select.$container(style({
              zIndex: 50,
              position: 'absolute',
              display: 'none'
            })),
            $$option: O(select.$$option, map($option)),
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
  placeholder?: string
  closeOnSelect?: boolean

  selectDrop: Omit<IMultiselect<T>, 'value'>
  $label?: $Node

  $container?: NodeComposeFn<$Node>
  $dropdownContainer?: NodeComposeFn<$Node>

  $chip?: NodeComposeFn<$Node>
  $$chip: Op<T, $Node>
  openMenu?: Stream<any>
}

export const $DropMultiSelect = <T>({
  $container = $defaultDropMultiSelectContainer,
  $$chip,
  placeholder,
  $label = empty(),
  $chip = $defaultChip,
  selectDrop,
  value,
  closeOnSelect = false,
  openMenu = empty()
}: IMultiselectDrop<T>
) => component((
  [pick, pickTether]: Behavior<T, T>,
  [targetIntersection, targetIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,

  [focusField, focusFieldTether]: Behavior<IBranch, FocusEvent>,
  [inputSearch, inputSearchTether]: Behavior<IBranch<HTMLInputElement>, string>,
  [clickOptionRemove, clickOptionRemoveTether]: Behavior<INode, T>,
) => {

  const windowClick = eventElementTarget('click', window)


  const openTrigger = constant(true, mergeArray([
    focusField,
    openMenu
  ]))

  const closeTrigger = constant(false, closeOnSelect ? pick : empty())

  const isOpen = skipRepeats(merge(closeTrigger, openTrigger))



  const selection = switchLatest(
    map(initSeedList => {
      return skip(1, scan((seed, next) => {
        const matchedIndex = seed.indexOf(next)

        if (matchedIndex === -1) {
          return append(next, seed)
        }

        return remove(matchedIndex, seed)
      }, initSeedList, mergeArray([pick, clickOptionRemove])))
    }, value)
  )

  const selectionChange = multicast(merge(selection, value))

  return [
    $column(layoutSheet.flex, layoutSheet.spacingTiny, style({ display: 'flex', flex: 1, flexDirection: 'row', position: 'relative' }))(
      $row(style({ alignSelf: 'flex-start', cursor: 'pointer', paddingBottom: '1px' }))(
        $label
      ),

      $container(
        targetIntersectionTether(
          observer.intersection(),
          multicast
        ),
        layoutSheet.flex, layoutSheet.spacing, style({ alignItems: 'center', position: 'relative', flexWrap: 'wrap' })
      )(
        switchLatest(map(valueList => {
          return mergeArray(valueList.map(token => {

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
          }))
        }, selectionChange)),

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

            focusFieldTether(
              nodeEvent('pointerdown')
            ),

          )(),
          $icon({ $content: $caretDown, width: '18px', svgOps: style({ marginTop: '3px', minWidth: '18px', marginLeft: '6px' }), viewBox: '0 0 32 32' }),
        ),
      ),

      switchLatest(snapshot((selectedList, show) => {
        if (!show) {
          return empty()
        }

        const $floatingContainer = selectDrop.$container(
          style({
            padding: '8px', zIndex: 50, left: 0,
            position: 'absolute'
          })
        )

        const optionSelection = selectDrop.list.filter(n => selectedList.indexOf(n) === -1)

        if (optionSelection.length === 0) {
          return $floatingContainer($text('Nothing to select'))
        }

        const dropBehavior = O(
          styleBehavior(
            map(([rect]) => {
              const { bottom } = rect.intersectionRect

              const bottomSpcace = window.innerHeight - bottom
              const goDown = bottomSpcace > bottom

              return {
                [goDown ? 'top' : 'bottom']: 'calc(100% + 5px)',
                display: 'flex'
              }
            }, targetIntersection)
          ),
        )

        return dropBehavior(
          $Select({
            ...selectDrop,
            $container: $floatingContainer,
            list: optionSelection,
            value: empty(),
          })({
            select: pickTether()
          })
        )
      }, selectionChange, isOpen))
    ),

    {
      selection
    }
  ]
})

