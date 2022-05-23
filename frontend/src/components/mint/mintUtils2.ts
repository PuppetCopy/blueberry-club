import { combineArray } from "@aelea/core"
import { $text, style, $node } from "@aelea/dom"
import { $row, layoutSheet, $column } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { ContractReceipt } from "@ethersproject/contracts"
import { GBCLab } from "@gambitdao/gbc-contracts"
import { USE_CHAIN, IAttributeMappings } from "@gambitdao/gbc-middleware"
import { unixTimestampNow } from "@gambitdao/gmx-middleware"
import { $IntermediatePromise, $alert, $spinner, $txHashRef } from "@gambitdao/ui-components"
import { parseError } from "@gambitdao/wallet-link"
import { join, now, startWith, fromPromise, switchLatest, map, periodic } from "@most/core"
import { Stream } from "@most/types"
import { $labItem } from "../../logic/common"

export interface IMintEvent {
  amount: number
  contractReceipt: Promise<ContractReceipt>
  txHash: Promise<string>
}

export function $displayMintEvents(contract: Stream<GBCLab>, minev: Stream<Promise<IMintEvent>>) {
  return join(combineArray((lab, event) => {
    const contractAction = event.then(me => me.txHash)
    const contractReceipt = event.then(me => me.contractReceipt)

    return $IntermediatePromise({
      query: now(contractReceipt),
      $$fail: map(res => {
        const error = parseError(res)

        return $alert($text(error.message))
      }),
      $loader: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
        $spinner,
        $text(startWith('Awaiting Approval', map(() => 'Minting...', fromPromise(contractAction)))),
        $node(style({ flex: 1 }))(),
        switchLatest(map(txHash => $txHashRef(txHash, USE_CHAIN), fromPromise(contractAction)))
      ),
      $$done: map(tx => {
        if (tx?.logs.length === 0) {
          return $alert($text('Unable to reach subgraph'))
        }


        return $column(
          ...tx.logs.map(log => {
            const parsedLog = lab.interface.parseLog(log)
            const labItemId: number = parsedLog.args.id.toNumber()
            const amount: number = parsedLog.args.amount.toNumber()

            return $column(layoutSheet.spacing)(
              $row(style({ placeContent: 'space-between' }))(
                $text(style({ color: pallete.positive }))(`Minted ${amount} ${IAttributeMappings[labItemId]}`),
                $txHashRef(tx.transactionHash, USE_CHAIN)
              ),
              $row(layoutSheet.spacing, style({ flexWrap: 'wrap' }))(...Array(amount).fill($labItem(labItemId))),
            )
          })
        )
      }),
    })({})
  }, contract, minev))
}

export const timeChange = map(_ => unixTimestampNow(), periodic(1000))

