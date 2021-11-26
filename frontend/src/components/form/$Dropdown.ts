import { Behavior, O, Op } from "@aelea/core"
import { $Node, $text, component, eventElementTarget, IBranch, nodeEvent, style, styleBehavior, styleInline, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, Input, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, mergeArray, multicast, now, skip, snapshot, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $caretDown } from "../../elements/$icons"
import { $ButtonSecondary } from "./$Button"


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

  $value: Op<T, $Node>
  $changeSelect?: Stream<T>
}




export const $Select = <T>({ list, $value }: ISelect<T>) => component((
  [select, selectTether]: Behavior<IBranch, T>
) => {

  return [
    mergeArray(
      list.map(item => {

        const selectBehavior = selectTether(
          nodeEvent('click'),
          constant(item)
        )


        const $val = $value(now(item))
        return selectBehavior(
          switchLatest($val)
        )
      }).reverse()
    ),

    {
      select
    }
  ]
})

export interface IDropdown<T> extends Partial<Input<T>> {
  select: Omit<ISelect<T>, '$value'>

  $noneSelected?: $Node
}


export const $Dropdown = <T>(config: IDropdown<T>) => component((
  [select, selectTether]: Behavior<T, T>,
  [openMenu, openMenuTether]: Behavior<PointerEvent, boolean>,
) => {

  const isOpenState = multicast(switchLatest(map(isOpen => {
    if (isOpen) {
      return startWith(true, skip(1, constant(false, eventElementTarget('click', window))))
    }
    return now(false)
  }, mergeArray([constant(false, select), openMenu]))))

  const $option = $row(layoutSheet.spacingSmall, style({ alignItems: 'center', padding: '15px 25px' }))
  const $selectableOption = $option(style({ cursor: 'pointer' }), stylePseudo(':hover', { backgroundColor: pallete.background }))

  const $caretDownIcon = $icon({ $content: $caretDown, width: '13px', svgOps: style({ marginTop: '2px' }), viewBox: '0 0 7.84 3.81' })
  const $selection = switchLatest(
    mergeArray([
      map(val =>
        $option(
          $text(String(val)),
          $caretDownIcon,
        )
      , mergeArray([select, config.value ?? empty()])),
      config.$noneSelected ? now($option(config.$noneSelected, $caretDownIcon)) : empty()
    ])
  )
  
  const disabledBehavior: Op<IBranch, IBranch> = config.disabled ? styleInline(map(isDisabled => isDisabled ? { opacity: ".15", pointerEvents: 'none' } : { opacity: "1", pointerEvents: 'all' }, config.disabled)) : O()

  
  return [
    $column(disabledBehavior, style({ position: 'relative' }))(
      $ButtonSecondary({
        $content: $selection,
        buttonOp: O(style({ padding: '0px' }), styleInline(map(isOpen => (isOpen ? { borderColor: pallete.primary } : { borderColor: '' }), isOpenState)))
      })({
        click: openMenuTether(
          snapshot((ss) => {
            return !ss
          }, startWith(false, isOpenState))
        )
      }),

      $column(
        style({ overflow: 'hidden', backgroundColor: pallete.horizon, border: `1px solid ${pallete.middleground}`, borderRadius: '20px', position: 'absolute', top: 'calc(100% + 5px)', display: 'none', left: 0 }),
        styleBehavior(
          map(state => ({ display: state ? 'flex' : 'none' }), isOpenState)
        )
      )(
        $Select({
          ...config.select,
          $value: map(x => $selectableOption($text(String(x))))
        })({
          select: selectTether()
        })
      )
    ),

    {
      select
    }
  ]
})

