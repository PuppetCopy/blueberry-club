import { Behavior, Op } from "@aelea/core"
import { $Node, $text, component, INode, NodeComposeFn, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map, merge, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"

export interface IButtonToggle<T> {
  options: T[]
  selected: Stream<T | null>
  $option?: Op<T, $Node>
  $toggleOption?: NodeComposeFn<$Node>
  $container: NodeComposeFn<$Node>
}



const defaultOption = map(<T>(o: T) => $text(String(o)))

export const $Toggle = <T>({ options, selected, $option = defaultOption, $container }: IButtonToggle<T>) => component((
  [select, sampleSelect]: Behavior<INode, T>
) => {

  

  return [
    $container(
      ...options.map(opt => {

        const selectBehavior = sampleSelect(
          nodeEvent('click'),
          constant(opt)
        )

        return selectBehavior(switchLatest(          
          $option(now(opt))
        ))
      })
    ),

    { select }
  ]
})