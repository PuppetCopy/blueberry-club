import { Behavior, replayLatest, combineArray, combineObject } from "@aelea/core"
import { component, style, $text } from "@aelea/dom"
import { $column, layoutSheet, $row, state } from "@aelea/ui-components"
import { formatFixed } from "@ethersproject/bignumber"
import { ContractTransaction } from "@ethersproject/contracts"
import { IToken, LabItemSale, MintRule } from "@gambitdao/gbc-middleware"
import { $alert, $IntermediatePromise, $spinner } from "@gambitdao/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, switchLatest, empty, multicast, startWith, snapshot, map } from "@most/core"
import { $SelectBerries } from "../$SelectBerries"
import { connectGbc } from "../../logic/contract/gbc"
import { connectLab } from "../../logic/contract/lab"
import { connectManager } from "../../logic/contract/manager"
import { connectHolderSale } from "../../logic/contract/sale"
import { WALLET } from "../../logic/provider"
import { queryOwnerV2 } from "../../logic/query"
import { $ButtonPrimary } from "../form/$Button"
import { $displayMintEvents } from "./mintUtils2"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { IEthereumProvider } from "eip1193-provider"
import { BrowserStore } from "../../logic/store"

interface MintCmp {
  item: LabItemSale
  mintRule: MintRule
  walletLink: IWalletLink
  walletStore: BrowserStore<"ROOT.v1.walletStore", WALLET | null>
}

export const $GbcWhitelist = (config: MintCmp) => component((
  [clickMintWhitelist, clickMintWhitelistTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,
  [selectTokensForWhitelist, selectTokensForWhitelistTether]: Behavior<IToken[], IToken[]>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,

  [alert, alertTether]: Behavior<string | null, string | null>,
) => {

  const saleWallet = connectHolderSale(config.walletLink, config.mintRule.contractAddress)
  const gbcWallet = connectGbc(config.walletLink)
  const managerWallet = connectManager(config.walletLink)
  const labWallet = connectLab(config.walletLink)

  const owner = multicast(awaitPromises(map(async n => {
    if (n === null) {
      return null
    }
    return queryOwnerV2(n)
  }, config.walletLink.account)))

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
  }, owner, saleWallet.contract)



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


        $IntermediateConnectButton({
          walletStore: config.walletStore,
          $container: $column(layoutSheet.spacingBig),
          $display: map(() => {

            const disablePrimary = combineArray((msg, tokens) => msg || tokens.length === 0, alert, chosenTokens)

            return $ButtonPrimary({
              disabled: startWith(true, disablePrimary),
              buttonOp: style({ alignSelf: 'flex-end' }),
              $content: switchLatest(
                map(({ chosenTokens }) => {
                  if (chosenTokens.length === 0) {
                    return $text('Select amount')
                  }


                  const cost = BigInt(chosenTokens.length) * config.mintRule.cost
                  const costUsd = formatFixed(cost, 18)


                  return $text(`Mint (${cost > 0n ? costUsd + 'ETH' : 'Free'})`)

                }, combineObject({ chosenTokens }))
              ),
            })({
              click: clickMintWhitelistTether(
                snapshot(async ({ selectTokensForWhitelist, saleContract, account }) => {

                  if ((saleContract === null || !account)) {
                    throw new Error(`Unable to resolve contract`)
                  }

                  const idList = selectTokensForWhitelist.map(x => x.id).slice(0, 90)

                  const cost = BigInt(selectTokensForWhitelist.length) * config.mintRule.cost
                  const contractAction = saleContract.mint(idList, { value: cost })

                  return contractAction
                }, combineObject({ selectTokensForWhitelist: chosenTokens, saleContract: saleWallet.contract, account: config.walletLink.account })),
              )
            })
          }),
          ensureNetwork: true,
          walletLink: config.walletLink
        })({
          walletChange: walletChangeTether(),
        })

      ),

      switchLatest(map(tokenList => {
        return tokenList.length === 0 ? $noBerriesOwnedMsg : empty()

      }, gbcWallet.tokenList)),

      $displayMintEvents(labWallet.contract, clickMintWhitelist)
    ),



    { walletChange }
  ]
})