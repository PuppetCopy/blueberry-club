import { combineArray } from "@aelea/core"
import { $text, style } from "@aelea/dom"
import { $row, layoutSheet, $column } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { BaseContract, ContractTransaction } from "@ethersproject/contracts"
import { LAB_CHAIN, IAttributeMappings } from "@gambitdao/gbc-middleware"
import { unixTimestampNow } from "@gambitdao/gmx-middleware"
import { $IntermediateTx } from "@gambitdao/ui-components"
import { join, map, now, periodic } from "@most/core"
import { Stream } from "@most/types"
import { $labItem } from "../../logic/common"



export function $displayMintEvents(contract: Stream<BaseContract>, ctxStream: Stream<Promise<ContractTransaction>>) {
  return join(combineArray((lab, ctx) => {

    return $IntermediateTx({
      query: now(ctx),
      chain: LAB_CHAIN,
      $$success: map(tx => {

        return $column(
          ...tx.logs.filter(address => lab.address === address.address).map(log => {
            const parsedLog = lab.interface.parseLog(log)
            const labItemId: number = parsedLog.args.id.toNumber()
            const amount: number = parsedLog.args.amount.toNumber()

            return $column(layoutSheet.spacing)(
              $text(style({ color: pallete.positive }))(`Minted ${amount} ${IAttributeMappings[labItemId]}`),
              $row(layoutSheet.spacing, style({ flexWrap: 'wrap' }))(...Array(amount).fill($labItem(labItemId))),
            )
          })
        )
      }),
    })({})
  }, contract, ctxStream))
}

export const timeChange = map(_ => unixTimestampNow(), periodic(1000))

