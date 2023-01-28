import { Behavior, Op } from "@aelea/core"
import { $Node, $text, component, INode, NodeComposeFn, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { invertColor } from "./common"

export interface IButtonToggle<T> {
  options: T[]
  selected: Stream<T>

  $container?: NodeComposeFn<$Node>
  $button?: NodeComposeFn<$Node>

  $$option?: Op<T, $Node>
}

export const $defaulButtonToggleBtn = $row(style({
  placeContent: 'center', fontSize: '.75em', fontWeight: 'bold',
  borderRadius: '12px', padding: '6px 8px', alignItems: 'center', border: '1px solid transparent',
  cursor: 'pointer'
}))

export const $defaulButtonToggleContainer = $row(layoutSheet.spacingSmall, style({
  borderRadius: '12px', padding: '6px',
  border: `1px solid ${pallete.horizon}`, backgroundColor: pallete.background
}))


const defaultOption = map(<T>(o: T) => $text(String(o)))

export const $ButtonToggle = <T>({ options, selected, $$option = defaultOption, $button = $defaulButtonToggleBtn, $container = $defaulButtonToggleContainer }: IButtonToggle<T>) => component((
  [select, sampleSelect]: Behavior<INode, T>
) => {

  return [
    $container(
      ...options.map(opt =>
        $button(
          sampleSelect(
            nodeEvent('click'),
            constant(opt)
          ),
          styleBehavior(
            map(selectedOpt => {
              return selectedOpt === opt
                ? { borderColor: pallete.middleground, cursor: 'default' }
                : null
            }, selected)
          )
        )(
          switchLatest(
            $$option(now(opt))
          )
        )
      )
    ),

    { select }
  ]
})

