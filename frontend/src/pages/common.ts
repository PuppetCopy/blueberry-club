import { $text, style } from "@aelea/dom"
import { $row, $seperator } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"


export const $metricEntry = (label: string, value: string) => $row(style({ fontSize: '.75em', alignItems: 'center' }))(
  $text(style({ color: pallete.foreground, flex: 1 }))(label),
  $text(style({ fontWeight: 'bold' }))(value),
)

export const $seperator2 = style({ backgroundColor: colorAlpha(pallete.foreground, .15), alignSelf: 'stretch', display: 'block' }, $seperator)

