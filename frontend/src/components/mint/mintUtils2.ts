import { $Node, $text, style } from "@aelea/dom"
import { $row, layoutSheet, $column } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { LAB_CHAIN, IAttributeMappings, GBC_ADDRESS } from "@gambitdao/gbc-middleware"
import { unixTimestampNow, } from "@gambitdao/gmx-middleware"
import { $IntermediateTx } from "@gambitdao/ui-components"
import { empty, map, periodic } from "@most/core"
import { Stream } from "@most/types"
import { $labItem } from "../../logic/common"
import { Chain, TransactionReceipt, decodeEventLog } from "viem"
import { Abi } from "abitype"
import { Op } from "@aelea/core"


export function $displayMintEvents<TAbi extends Abi>(abi: TAbi, ctxStream: Stream<Promise<TransactionReceipt>>, mapFn: Op<TransactionReceipt, $Node>) {
  return $IntermediateTx({
    query: ctxStream,
    chain: LAB_CHAIN,
    $$success: map(tx => {
  
      return $column(
        ...tx.logs.filter(address => address.address === GBC_ADDRESS.LAB).map(log => {
          const parsedLog = decodeEventLog({
            abi,
            data: log.data,
            topics: log.topics
          })

          if (parsedLog === null) {
            console.warn('Could not parse log', log)
            return empty()
          }
          

          const labItemId = parsedLog.args?.id
          const amount = parsedLog.args?.amount

          return $column(layoutSheet.spacing)(
            $text(style({ color: pallete.positive }))(`Minted ${amount} ${IAttributeMappings[labItemId]}`),
            $row(layoutSheet.spacing, style({ flexWrap: 'wrap' }))(...Array(amount).fill($labItem({ id: labItemId }))),
          )
        })
      )
    }),
  })({})
}

export const timeChange = map(_ => unixTimestampNow(), periodic(1000))

