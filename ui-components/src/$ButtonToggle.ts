import { Behavior, Op } from "@aelea/core"
import { $Node, $text, component, INode, NodeComposeFn, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { invertColor } from "./common"

export interface IButtonToggle<T> {
  $container?: NodeComposeFn<$Node>
  options: T[]
  selected: Stream<T>

  $button?: NodeComposeFn<$Node>
  $$option?: Op<T, $Node>
}

const $toggleBtn = $row(style({ placeContent: 'center', borderRadius: '12px',  padding: '6px 8px', alignItems: 'center', cursor: 'pointer', backgroundColor: pallete.background }))
const $defaultContainer = $row(layoutSheet.spacingSmall, style({ borderRadius: '12px', padding: '6px', border: `1px solid ${pallete.horizon}`, backgroundColor: pallete.background }))


const defaultOption = map(<T>(o: T) => $text(String(o)))

export const $ButtonToggle = <T>({ options, selected, $$option = defaultOption, $button = $toggleBtn, $container = $defaultContainer }: IButtonToggle<T>) => component((
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
              const color = invertColor(pallete.message, false)
              return selectedOpt === opt
                ? { backgroundColor: pallete.primary, color: color, cursor: 'default' }
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

