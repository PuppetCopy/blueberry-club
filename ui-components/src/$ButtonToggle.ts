import { Behavior, Op } from "@aelea/core"
import { $Node, $text, component, INode, NodeComposeFn, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map, merge, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"

export interface IButtonToggle<T> {
  options: T[]
  selected: Stream<T>

  $button?: NodeComposeFn<$Node>
  $$option?: Op<T, $Node>
}

const $toggleBtn = $row(style({ placeContent: 'center', border: `2px solid ${pallete.horizon}`, padding: '6px 8px', alignItems: 'center', cursor: 'pointer', backgroundColor: pallete.background }))
const $container = $row(style({ backgroundColor: pallete.background }))


const defaultOption = map(<T>(o: T) => $text(String(o)))

export const $ButtonToggle = <T>({ options, selected, $$option = defaultOption, $button = $toggleBtn }: IButtonToggle<T>) => component((
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
                ? { border: `2px solid ${pallete.message}`, cursor: 'default' }
                : { color: pallete.foreground }
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

