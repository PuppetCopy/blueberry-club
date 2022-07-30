import { Behavior, Op } from "@aelea/core"
import { $Node, $text, component, INode, NodeComposeFn, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { secondaryButtonStyle } from "../components/form/$Button"
import { $ButtonToggle as $BtnToggle, IButtonToggle } from "@gambitdao/ui-components"



const $defaultToggleContainer = $row(
  // secondaryButtonStyle,
  style({})
)

const $defaultToggleButton = $row(
  secondaryButtonStyle,
  style({ borderColor: pallete.horizon, outline: 'red', padding: '4px 8px' })
)

const defaultOption = map(<T>(o: T) => $text(String(o)))

export const $ButtonToggle = <T>(config: IButtonToggle<T>) => component((
  [select, sampleSelect]: Behavior<T, T>
) => {

  return [
    $BtnToggle({
      ...config,
      // $button: $defaultToggleButton
    })({
      select: sampleSelect()
    }),

    { select }
  ]
})


