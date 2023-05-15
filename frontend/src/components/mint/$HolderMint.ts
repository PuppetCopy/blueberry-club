import { Behavior, replayLatest, combineArray, combineObject } from "@aelea/core"
import { component, style, $text } from "@aelea/dom"
import { $column, layoutSheet, $row } from "@aelea/ui-components"
import { abi, blueberrySubgraph, IToken, LabItemSale, MintRule, } from "@gambitdao/gbc-middleware"
import { $alert, $IntermediatePromise, $spinner } from "@gambitdao/ui-components"
import { IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { awaitPromises, switchLatest, empty, multicast, startWith, snapshot, map, now } from "@most/core"
import { $SelectBerries } from "../$SelectBerries"
import { $ButtonPrimary } from "../form/$Button"
import { $displayMintEvents } from "./mintUtils2"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { CHAIN } from "@gambitdao/const"
import { formatFixed } from "@gambitdao/gmx-middleware"
import { connectContract, contractReader, simulateContract, waitForTransactionReceipt } from "../../logic/common"
import { Chain, SimulateContractReturnType, TransactionReceipt, WaitForTransactionReceiptReturnType, parseAbi } from "viem"

interface MintCmp {
  chainList: CHAIN[],

  item: LabItemSale
  mintRule: MintRule
  walletLink: IWalletLink
}

export const $HolderMint = (config: MintCmp) => component((
  [clickMintWhitelist, clickMintWhitelistTether]: Behavior<PointerEvent, Promise<TransactionReceipt>>,
  [selectTokensForWhitelist, selectTokensForWhitelistTether]: Behavior<IToken[], IToken[]>,
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,

  [alert, alertTether]: Behavior<string | null, string | null>,
) => {



  const gbcReader = contractReader(connectContract(config.walletLink.client, config.mintRule.contractAddress, abi.gbc))

  const saleConnect = connectContract(config.walletLink.client, config.mintRule.contractAddress, abi.holder)
  const saleReader = contractReader(saleConnect)


  const owner = multicast(awaitPromises(switchLatest(map(wallet => {
    if (wallet === null) {
      return null
    }

    return blueberrySubgraph.owner(now({ id: wallet.account.address }))
  }, config.walletLink.wallet))))

  const $noBerriesOwnedMsg = $alert($text(`Connected account does not own any GBC's`))
  const chosenTokens = replayLatest(multicast(startWith([], selectTokensForWhitelist)))

  const ownerTokenList = combineArray(async (owner) => {
    if (owner === null) {
      return []
    }

    const eligibleTokensForMint: IToken[] = []

    const sliceCount = 7

    for (let index = 0; index < owner.ownedTokens.length; index = index + sliceCount) {
      const batch = owner.ownedTokens.slice(index, index + sliceCount)
      await Promise.all(batch.map(async token => {
        const isUsed = saleReader('isNftUsed', BigInt(token.id))

        if (!isUsed) {
          eligibleTokensForMint.push(token)
        }

      }))
    }

    return eligibleTokensForMint
  }, owner)



  return [
    $column(layoutSheet.spacing)(
      $row(layoutSheet.spacing, style({ alignItems: 'flex-end', placeContent: 'space-between' }))(


        $IntermediatePromise({
          query: ownerTokenList,
          $loader: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $spinner,
            $text(style({ fontSize: '.75em' }))('Loading unused tokens...')
          ),
          $$done: map(list => {
            return $SelectBerries({
              placeholder: 'Select Berries',
              validation: map(list => {

                if (list.length > config.mintRule.accountLimit) {
                  return `Exceeding address limit of ${config.mintRule.accountLimit}`
                }

                return null
              }),
              options: list
            })({
              select: selectTokensForWhitelistTether(),
              alert: alertTether()
            })
          })
        })({
        }),


        $column(layoutSheet.spacingBig)(
          $IntermediateConnectButton({
            chainList: config.chainList,
            $$display: map(w3p => {

              const disablePrimary = combineArray((msg, tokens) => msg || tokens.length === 0, alert, chosenTokens)
              const ownerGbcList = gbcReader('walletOfOwner', w3p.account.address)

              return $column(
                $ButtonPrimary({
                  disabled: startWith(true, disablePrimary),
                  $content: switchLatest(
                    combineArray((chosenTokens) => {
                      if (chosenTokens.length === 0) {
                        return $text('Select amount')
                      }

                      const cost = BigInt(chosenTokens.length) * config.mintRule.cost
                      const costUsd = formatFixed(cost, 18)


                      return $text(`Mint (${cost > 0n ? costUsd + 'ETH' : 'Free'})`)

                    }, chosenTokens)
                  ),
                })({
                  click: clickMintWhitelistTether(
                    snapshot(async params => {
                      const idList = params.chosenTokens.map(x => BigInt(x.id)).slice(0, 90)
                      const cost = BigInt(params.chosenTokens.length) * config.mintRule.cost

                      const sim = await simulateContract(params.saleConnect, {
                        functionName: 'mint',
                        value: cost,
                        args: [idList]
                      })

                      const hash = w3p.writeContract<typeof params.saleConnect.abi, 'mint', Chain>(sim.request)

                      const newLocal = waitForTransactionReceipt(params.saleConnect.client, hash)
                      return newLocal
                    }, combineObject({ chosenTokens, saleConnect })),
                    // switchLatest
                  )
                }),

                switchLatest(map(list => {
                  return list.length === 0 ? $noBerriesOwnedMsg : empty()
                }, ownerGbcList))
              )
            }),
            walletLink: config.walletLink
          })({
            walletChange: walletChangeTether(),
          })
        )

      ),


      // switchLatest(
      //   map(res => {
      //     const cost = BigInt(res.length) * config.mintRule.cost
      //     const request = saleSim({ functionName: 'mint', value: cost, args: [res] })

      //     return $spinner
      //   }, clickMintWhitelist)
      // ),

      $displayMintEvents(clickMintWhitelist)
    ),



    { walletChange }
  ]
})