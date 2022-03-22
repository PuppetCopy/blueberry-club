import { Behavior, O, Op } from "@aelea/core"
import { $node, $Node, component, INode, nodeEvent, style } from "@aelea/dom"
import { $column, $icon, $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, startWith, switchLatest } from "@most/core"
import { $caretDown } from "../elements/$icons"

interface IBreadcrumbs {
  index?: number

  $titleOp?: Op<INode, INode>
  $contentOp?: Op<INode, INode>

  sections: {
    $title: $Node,
    $content: $Node
  }[]
}




export const $Breadcrumbs = ({ sections, index, $contentOp = O(), $titleOp = O() }: IBreadcrumbs) => component((
  [changeIndex, changeIndexTether]: Behavior<INode, number>
) => {

  const $headline = $row(style({ padding: '20px', cursor: 'pointer' }))
  const $content = $node(style({ padding: '20px', whiteSpace: 'pre-wrap' }))

  return [
    $column(
      ...sections.map((row, idx) => {

        const selectSectionBehavior = changeIndexTether(
          nodeEvent('click'),
          constant(idx)
        )

        const selection = startWith(index, changeIndex)

        const isLast = idx === sections.length - 1

        return $column(
          $headline(style({ fontWeight: 900, placeContent: 'space-between', alignItems: 'center', borderBottom: isLast ? '' : `1px solid ${pallete.foreground}` }), selectSectionBehavior, $titleOp)(
            row.$title,
            $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
          ),
          switchLatest(map(selectedIndex => selectedIndex === idx ? $content(style({ border: `1px solid ${pallete.foreground}` }))($contentOp)(row.$content) : empty(), selection)),
        )
      })
    ),
    
    { index: changeIndex }
  ]
})