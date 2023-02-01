import { Behavior } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IToken } from "@gambitdao/gbc-middleware"
import { constant, delay, empty, map, merge, never, now, startWith, switchLatest, tap } from "@most/core"
import { $berryByToken } from "../logic/common"
import { $berryTileId } from "./$common"
import { $ButtonSecondary } from "./form/$Button"
import { $DropMultiSelect, $defaultSelectContainer, $defaultChip, IMultiselectDrop } from "./form/$Dropdown"


export interface ISelectBerries {
  label?: string
  placeholder?: string

  validation?: IMultiselectDrop<IToken>['validation']

  options: IToken[]
}

export const $SelectBerries = (config: ISelectBerries) => component((
  [select, selectTether]: Behavior<IToken[], IToken[]>,
  [selectAll, selectAllTether]: Behavior<any, any>,
  [alert, alertTether]: Behavior<string | null, string | null>,


) => {

  const allSelection = constant(config.options, selectAll)
  const value = startWith([], allSelection)

  return [
    switchLatest(map((list) => {
      return $DropMultiSelect({
        ...config,
        value: now(list),
        validation: config.validation,
        $label: config.label ? $text(style({ width: '130px' }))(config.label) : undefined,
        $chip: $defaultChip(style({ padding: 0, overflow: 'hidden' })),
        $$chip: map(token => {

          return $row(style({ alignItems: 'center', gap: '8px', color: pallete.message }))(
            style({ borderRadius: '50%' }, $berryByToken(token)),
            $text(String(token.id)),
          )
        }),
        selectDrop: {
          $container: $defaultSelectContainer(style({ padding: '10px', flexWrap: 'wrap', width: '100%', maxHeight: '400px', overflow: 'auto', flexDirection: 'row' })),
          $$option: map((token) => {

            // @ts-ignore
            if (token === 'ALL') {
              return $ButtonSecondary({ $content: $text('Select All') })({
                click: selectAllTether()
              })
            }

            return style({ cursor: 'pointer' }, $berryTileId(token))
          }),
          list: [
            'ALL' as never,
            ...config.options
          ]
        }
      })({
        selection: selectTether(),
        alert: alertTether()
      })
    }, value)),

    {
      select: merge(allSelection, select),
      alert
    }
  ]
})