import { Behavior, replayLatest, combineArray, combineObject } from "@aelea/core"
import { component, style, $text } from "@aelea/dom"
import { $column, layoutSheet, $row } from "@aelea/ui-components"
import { formatFixed } from "@ethersproject/bignumber"
import { ContractTransaction } from "@ethersproject/contracts"
import { blueberrySubgraph, IToken, LabItemSale, MintRule, } from "@gambitdao/gbc-middleware"
import { $alert, $IntermediatePromise, $spinner } from "@gambitdao/ui-components"
import { IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { awaitPromises, switchLatest, empty, multicast, startWith, snapshot, map, now } from "@most/core"
import { $SelectBerries } from "../$SelectBerries"
import { $ButtonPrimary } from "../form/$Button"
import { $displayMintEvents } from "./mintUtils2"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { connectLab } from "../../logic/contract/gbc"
import { Holder__factory } from "@gambitdao/gbc-contracts"
import { readContract } from "../../logic/common"
import { CHAIN } from "@gambitdao/gmx-middleware"

interface MintCmp {
  chainList: CHAIN[],

  item: LabItemSale
  mintRule: MintRule
  walletLink: IWalletLink
}

export const $HolderMint = (config: MintCmp) => component((
  [clickMintWhitelist, clickMintWhitelistTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,
  [selectTokensForWhitelist, selectTokensForWhitelistTether]: Behavior<IToken[], IToken[]>,
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,

  [alert, alertTether]: Behavior<string | null, string | null>,
) => {
  const contract = connectLab(config.walletLink.provider)

  const sale = readContract(Holder__factory, config.walletLink.provider, config.mintRule.contractAddress)

  const owner = multicast(awaitPromises(switchLatest(map(wallet => {
    if (wallet === null) {
      return null
    }

    return blueberrySubgraph.owner(now({ id: wallet.address }))
  }, config.walletLink.wallet))))

  const $noBerriesOwnedMsg = $alert($text(`Connected account does not own any GBC's`))
  const chosenTokens = replayLatest(multicast(startWith([], selectTokensForWhitelist)))

  const ownerTokenList = combineArray(async (owner, sale) => {
    if (owner === null) {
      return []
    }

    const eligibleTokensForMint: IToken[] = []

    const sliceCount = 7

    for (let index = 0; index < owner.ownedTokens.length; index = index + sliceCount) {
      const batch = owner.ownedTokens.slice(index, index + sliceCount)
      await Promise.all(batch.map(async token => {
        const isUsed = await sale.isNftUsed(token.id)

        if (!isUsed) {
          eligibleTokensForMint.push(token)
        }

      }))
    }

    return eligibleTokensForMint
  }, owner, sale)



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
              const tokenList = contract.tokenList(w3p.address)


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
                    snapshot(async state => {

                      const idList = state.chosenTokens.map(x => x.id).slice(0, 90)
                      const cost = BigInt(state.chosenTokens.length) * config.mintRule.cost
                      const contractAction = state.contract.mint(idList, { value: cost })

                      return contractAction
                    }, combineObject({ chosenTokens, contract: sale })),
                  )
                }),

                switchLatest(map(tokenList => {
                  return tokenList.length === 0 ? $noBerriesOwnedMsg : empty()
                }, tokenList))
              )
            }),
            walletLink: config.walletLink
          })({
            walletChange: walletChangeTether(),
          })
        )

      ),


      $displayMintEvents(sale, clickMintWhitelist)
    ),



    { walletChange }
  ]
})