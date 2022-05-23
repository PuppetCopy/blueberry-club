import { Behavior, O } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IBerryIdentifable } from "@gambitdao/gbc-middleware"
import { constant, map, merge, startWith } from "@most/core"
import { $berryById } from "../logic/common"
import { $berryTileId } from "./$common"
import { $ButtonSecondary } from "./form/$Button"
import { $DropMultiSelect, $defaultSelectContainer, $defaultChip } from "./form/$Dropdown"


export interface ISelectBerries {
  label?: string
  placeholder?: string

  options: IBerryIdentifable[]
}

export const $SelectBerries = (config: ISelectBerries) => component((
  [select, selectTether]: Behavior<(IBerryIdentifable | 'ALL')[], (IBerryIdentifable | 'ALL')[]>,
  [selectAll, selectAllTether]: Behavior<any, any>
) => {

  const $selectAllOption = $text(style({ paddingLeft: '15px' }))('All')

  const allSelection = constant(config.options, selectAll)
  const value = startWith([], allSelection)

  return [
    $DropMultiSelect({
      ...config,
      value,
      $label: config.label ? $text(style({ width: '130px' }))(config.label) : undefined,
      $chip: $defaultChip(style({ padding: 0, overflow: 'hidden' })),
      $$chip: map(token => {

        if (token === 'ALL') {
          return $selectAllOption
        }

        return $row(style({ alignItems: 'center', gap: '8px', color: pallete.message }))(
          style({ borderRadius: '50%' }, $berryById(token.id, token, 34)),
          $text(String(token.id)),
        )
      }),
      selectDrop: {
        $container: $defaultSelectContainer(style({ padding: '10px', gap: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 0, flexWrap: 'wrap', width: '100%', maxHeight: '400px', overflow: 'auto', flexDirection: 'row' })),
        $$option: map((token) => {

          if (token === 'ALL') {
            return $ButtonSecondary({
              buttonOp: O(style({ marginRight: '10px' })),
              $content: $text('Select All')
            })({
              click: selectAllTether()
            })
          }

          return $berryTileId(token.id, token)
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