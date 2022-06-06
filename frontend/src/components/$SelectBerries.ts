import { Behavior } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IToken } from "@gambitdao/gbc-middleware"
import { constant, delay, empty, map, merge, startWith, tap } from "@most/core"
import { $berryByToken } from "../logic/common"
import { $berryTileId } from "./$common"
import { $ButtonSecondary } from "./form/$Button"
import { $DropMultiSelect, $defaultSelectContainer, $defaultChip } from "./form/$Dropdown"


export interface ISelectBerries {
  label?: string
  placeholder?: string

  options: IToken[]
}

export const $SelectBerries = (config: ISelectBerries) => component((
  [select, selectTether]: Behavior<(IToken | 'ALL')[], (IToken | 'ALL')[]>,
  [selectAll, selectAllTether]: Behavior<any, any>
) => {

  const $selectAllOption = $text(style({ paddingLeft: '15px' }))('All')

  const allSelection = constant(config.options, selectAll)
  const value = delay(100, startWith([], allSelection))

  return [
    $DropMultiSelect({
      ...config,
      value,
      $label: config.label ? $text(style({ width: '130px' }))(config.label) : undefined,
      $chip: $defaultChip(style({ padding: 0, overflow: 'hidden' })),
      $$chip: map(token => {

        if (token === 'ALL') {
          return empty()
        }

        return $row(style({ alignItems: 'center', gap: '8px', color: pallete.message }))(
          style({ borderRadius: '50%' }, $berryByToken(token, 34)),
          $text(String(token.id)),
        )
      }),
      selectDrop: {
        $container: $defaultSelectContainer(style({ padding: '10px', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 0, flexWrap: 'wrap', width: '100%', maxHeight: '400px', overflow: 'auto', flexDirection: 'row' })),
        $$option: map((token) => {

          if (token === 'ALL') {
            return $ButtonSecondary({ $content: $text('Select All') })({
              click: selectAllTether()
            })
          }

          return $berryTileId(token)
        }),
        list: [
          'ALL' as const,
          ...config.options
        ]
      }
    })({
      selection: selectTether()
    }),

    {
      select: merge(allSelection, select)
    }
  ]
})