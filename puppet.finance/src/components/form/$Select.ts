import { Op, Behavior } from "@aelea/core"
import { NodeComposeFn, $Node, component, IBranch, nodeEvent } from "@aelea/dom"
import { constant, switchLatest, now } from "@most/core"
import { Stream } from "@most/types"
import { $defaultSelectContainer } from "./$Dropdown"

export interface ISelect<T> {
  list: T[]
  value: Stream<T>;

  $container?: NodeComposeFn<$Node>
  $$option: Op<T, $Node>
}


export const $Select = <T>({ list, $$option, $container = $defaultSelectContainer }: ISelect<T>) => component((
  [select, selectTether]: Behavior<IBranch, T>
) => {

  return [
    $container(
      ...list.map(item => {

        const selectBehavior = selectTether(
          nodeEvent('click'),
          constant(item)
        )

        const $opt = switchLatest($$option(now(item)))

        return selectBehavior($opt)
      })
    ),

    {
      select
    }
  ]
})
