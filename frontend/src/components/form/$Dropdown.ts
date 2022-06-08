import { Behavior, combineObject, O, Op, replayLatest } from "@aelea/core"
import { $element, $Node, $text, attr, component, eventElementTarget, IBranch, INode, NodeComposeFn, nodeEvent, style, styleBehavior, styleInline, stylePseudo } from "@aelea/dom"
import { $column, $Field, $icon, $row, Field, Input, layoutSheet, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { $xCross } from "@gambitdao/ui-components"
import { constant, delay, empty, filter, map, merge, mergeArray, multicast, never, now, scan, skip, skipRepeats, snapshot, startWith, switchLatest, take, tap } from "@most/core"
import { append, remove } from "@most/prelude"
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
  list: T[]
  value: Stream<T>;

  $container: NodeComposeFn<$Node>
  $$option: Op<T, $Node>
}


export const $Select = <T>({ list, $$option, $container }: ISelect<T>) => component((
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

        return selectBehavior($opt)
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
  value: ISelect<T>
  $selection: $Node
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
  value,
  openMenuOp = O()
}: IDropdown<T>) => component((
  [select, selectTether]: Behavior<T, T>,
  [openMenu, openMenuTether]: Behavior<INode, any>,
  [targetIntersection, targetIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,

) => {


  const openTrigger = constant(true, mergeArray([openMenu]))
  const windowClick = switchLatest(map(open => take(1, skip(1, eventElementTarget('click', window))), openTrigger))

  const closeTrigger = constant(false, mergeArray([windowClick]))

  const isOpen = skipRepeats(merge(closeTrigger, openTrigger))

  const clickBehavior = O(
    openMenuTether(
      nodeEvent('click'),
      openMenuOp,
    ),
    targetIntersectionTether(
      observer.intersection(),
    )
  )

  return [
    $container(
      clickBehavior($selection),

      switchLatest(map(show => {
        if (!show) {
          return empty()
        }

        const dropBehavior = O(
          styleInline(
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
            ...value,
            $container: value.$container(style({
              zIndex: 50,
              position: 'absolute',
              display: 'none'
            })),
            $$option: O(value.$$option, map($option)),
          })({
            select: selectTether()
          })
        )

      }, isOpen))
    ),

    {
      select
    }
  ]
})


export const $defaultDropMultiSelectContainer = $row(layoutSheet.spacingTiny, style({ padding: `15px`, borderBottom: `1px solid ${pallete.message}` }))
export const $defaultDropMultiSelectOption = $row(layoutSheet.spacingSmall,
  style({
    overflow: 'hidden', border: `1px solid ${pallete.message}`,
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
  $label = empty(),
  $chip = $defaultChip,
  selectDrop,
  placeholder,
  validation = never,
  value,
  closeOnSelect = true,
  openMenu = empty()
}: IMultiselectDrop<T>
) => component((
  [pick, pickTether]: Behavior<T, T>,
  [targetIntersection, targetIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,

  [interaction, interactionTether]: Behavior<IBranch, true>,
  [blur, blurTether]: Behavior<IBranch, false>,

  [focusField, focusFieldTether]: Behavior<IBranch, FocusEvent>,
  [inputSearch, inputSearchTether]: Behavior<IBranch<HTMLInputElement>, string>,
  [clickOptionRemove, clickOptionRemoveTether]: Behavior<INode, T>,
) => {


  const openTrigger = mergeArray([focusField, constant(true, openMenu)])

  const closeTrigger = constant(false, mergeArray([delay(300, blur), closeOnSelect ? pick : empty(),]))

  const isOpen = mergeArray([openTrigger, closeTrigger])

  const multicastValidation = O(validation, multicast)


  const focus = startWith(false, merge(interaction, blur))


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

  const selectionChange = merge(selection, value)

  const alert = validation(selectionChange)

  const state = combineObject({ focus, alert })


  return [
    $column(layoutSheet.flex, layoutSheet.spacingTiny, style({ display: 'flex', flex: 1,  position: 'relative' }))(

      $column(layoutSheet.flex, layoutSheet.spacingTiny, style({ display: 'flex', flexDirection: 'row', position: 'relative' }))(
        $row(style({ alignSelf: 'flex-start', cursor: 'pointer', paddingBottom: '1px' }))(
          $label
        ),

        $container(
          styleBehavior(
            map(({ focus, alert }) => {
              if (alert) {
                return { borderColor: pallete.negative }
              }

              return focus ? { borderColor: pallete.primary } : null
            }, state)
          ),
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

              interactionTether(interactionOp),
              blurTether(dismissOp),

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
            styleInline(
              map(([rect]) => {
                const { bottom } = rect.intersectionRect

                const bottomSpcace = window.innerHeight - bottom
                const goDown = bottomSpcace > bottom
                console.log(goDown)



                return goDown
                  ? {
                    top: 'calc(100% + -1px)',
                    borderTopLeftRadius: 0, borderTopRightRadius: 0,
                    display: 'flex'
                  } : {
                    bottom: 'calc(100% + -1px)',
                    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                    display: 'flex'
                  }
              }, targetIntersection),

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
        }, selectionChange, isOpen)),
      ),

      $text(style({ color: pallete.negative, fontSize: '.75em', minHeight: '17px' }))(
        map(msg => msg ? msg : '', alert)
      )
    ),

    {
      selection, alert
    }
  ]
})


export const interactionOp = O(
  (src: $Node) => merge(nodeEvent('focus', src), nodeEvent('pointerover', src)),
  constant(true)
)

export const dismissOp = O(
  (src: $Node) => merge(nodeEvent('blur', src), nodeEvent('pointerout', src)),
  filter(x => document.activeElement !== x.target,), // focused elements cannot be dismissed
  constant(false)
)

