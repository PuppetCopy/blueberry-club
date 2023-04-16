import { combineArray } from "@aelea/core"
import { $text, style } from "@aelea/dom"
import { $row, layoutSheet, $column } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { LAB_CHAIN, IAttributeMappings, GBC_ADDRESS } from "@gambitdao/gbc-middleware"
import { unixTimestampNow } from "@gambitdao/gmx-middleware"
import { $IntermediateTx } from "@gambitdao/ui-components"
import { empty, join, map, now, periodic } from "@most/core"
import { Stream } from "@most/types"
import { $labItem } from "../../logic/common"
import { ContractFactory, ContractTransactionResponse } from "ethers"



export function $displayMintEvents(contract: Stream<ContractFactory>, ctxStream: Stream<Promise<ContractTransactionResponse>>) {
  return join(combineArray((lab, ctx) => {

    return $IntermediateTx({
      query: now(ctx),
      chain: LAB_CHAIN,
      $$success: map(tx => {

        return $column(
          ...tx.logs.filter(address => address.address === GBC_ADDRESS.LAB).map(log => {
            const parsedLog = lab.interface.parseLog({ data: log.data, topics: [...log.topics] })

            if (parsedLog === null) {
              console.warn('Could not parse log', log)
              return empty()
            }

            const labItemId: number = parsedLog.args.id.toNumber()
            const amount: number = parsedLog.args.amount.toNumber()

            return $column(layoutSheet.spacing)(
              $text(style({ color: pallete.positive }))(`Minted ${amount} ${IAttributeMappings[labItemId]}`),
              $row(layoutSheet.spacing, style({ flexWrap: 'wrap' }))(...Array(amount).fill($labItem({ id: labItemId }))),
            )
          })
        )
      }),
    })({})
  }, contract, ctxStream))
}

export const timeChange = map(_ => unixTimestampNow(), periodic(1000))

