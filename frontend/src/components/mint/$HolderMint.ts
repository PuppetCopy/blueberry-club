import { Behavior, replayLatest, combineArray, combineObject } from "@aelea/core"
import { component, style, $text } from "@aelea/dom"
import { $column, layoutSheet, $row } from "@aelea/ui-components"
import { formatFixed } from "@ethersproject/bignumber"
import { IToken, LabItemSale, MintRule, saleMaxSupply } from "@gambitdao/gbc-middleware"
import { countdownFn } from "@gambitdao/gmx-middleware"
import { $alert } from "@gambitdao/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, switchLatest, now, empty, multicast, startWith, snapshot, map } from "@most/core"
import { $SelectBerries } from "../$SelectBerries"
import { getTokenSlots, takeUntilLast } from "../../logic/common"
import { connectGbc } from "../../logic/contract/gbc"
import { connectLab } from "../../logic/contract/lab"
import { connectManager } from "../../logic/contract/manager"
import { connectHolderSale } from "../../logic/contract/sale"
import { queryOwnerV2 } from "../../logic/query"
import { $ButtonPrimary } from "../form/$Button"
import { $displayMintEvents, IMintEvent, timeChange } from "./mintUtils2"

export const $GbcWhitelist = (item: LabItemSale, mintRule: MintRule, walletLink: IWalletLink) => component((
  [clickMintWhitelist, clickMintWhitelistTether]: Behavior<PointerEvent, Promise<IMintEvent>>,
  [selectTokensForWhitelist, selectTokensForWhitelistTether]: Behavior<IToken[], IToken[]>,
) => {

  const saleWallet = connectHolderSale(walletLink, item.contractAddress)
  const gbcWallet = connectGbc(walletLink)
  const managerWallet = connectManager(walletLink)
  const labWallet = connectLab(walletLink)
  const max = saleMaxSupply(item)

  const owner = multicast(awaitPromises(map(async n => {
    if (n === null) {
      return null
    }
    return queryOwnerV2(n)
  }, walletLink.account)))

  const whitelistTimeDelta = takeUntilLast(delta => delta === null, awaitPromises(map(async (time) => {
    const deltaTime = mintRule.start - time
    return deltaTime > 0 ? deltaTime : null
  }, timeChange)))

  return [
    $column(layoutSheet.spacing)(
      $row(layoutSheet.spacing, style({ alignItems: 'baseline' }))(
        $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))(`Whitelist`),

        $text(
          switchLatest(map(timeDelta => {
            const hasEnded = timeDelta === null

            return hasEnded
              ? map(totalMinted => {
                const count = max - totalMinted.toNumber()
                return count ? `${mintRule.amount}/${mintRule.amount} left` : 'Sold Out'
              }, saleWallet.whitelistMinted)
              : now(countdownFn(Date.now() + timeDelta * 1000, Date.now()))

          }, whitelistTimeDelta))
        ),
      ),

      switchLatest(map(timeDelta => {
        if (typeof timeDelta === 'number') {
          return empty()
        }

        return switchLatest(map(tokenList => {

          const $noBerriesOwnedMsg = $alert($text(`Connected account does not own any GBC's`))
          const chosenTokens = replayLatest(multicast(startWith([], selectTokensForWhitelist)))

          const ownerTokenList = awaitPromises(combineArray(async (owner, sale) => {
            if (owner === null) {
              return []
            }
            const items = (await Promise.all(
              owner?.ownedTokens.map(async token => {
                const isUsed = await sale.isNftUsed(token.id)
                return { token, isUsed }
              })
            )).filter(x => x.isUsed === false).map(x => x.token)

            return items
          }, owner, saleWallet.contract))


          return $column(layoutSheet.spacing)(
            $row(layoutSheet.spacing, style({ alignItems: 'flex-start' }))(

              switchLatest(map(list => {

                return $SelectBerries({
                  placeholder: 'Select Berries',
                  options: list
                })({
                  select: selectTokensForWhitelistTether()
                })
              }, ownerTokenList)),


              $ButtonPrimary({
                disabled: map(s => s.length === 0, chosenTokens),
                buttonOp: style({ alignSelf: 'flex-end' }),
                $content: switchLatest(
                  map(({ chosenTokens }) => {
                    if (chosenTokens.length === 0) {
                      return $text('Select amount')
                    }


                    const cost = BigInt(chosenTokens.length) * mintRule.cost
                    const costUsd = formatFixed(cost, 18)


                    return $text(`Mint (${cost > 0n ? costUsd + 'ETH' : 'Free'})`)

                  }, combineObject({ chosenTokens }))
                ),
              })({
                click: clickMintWhitelistTether(
                  snapshot(async ({ selectTokensForWhitelist, saleContract, account }): Promise<IMintEvent> => {

                    if ((saleContract === null || !account)) {
                      throw new Error(`Unable to resolve contract`)
                    }


                    const idList = selectTokensForWhitelist.map(x => x.id)

                    const cost = BigInt(selectTokensForWhitelist.length) * mintRule.cost
                    const contractAction = saleContract.nftMint(idList, { value: cost })
                    const contractReceipt = contractAction.then(recp => recp.wait())

                    return {
                      amount: selectTokensForWhitelist.length,
                      contractReceipt,
                      txHash: contractAction.then(t => t.hash),
                    }

                  }, combineObject({ selectTokensForWhitelist: chosenTokens, saleContract: saleWallet.contract, account: walletLink.account })),
                )
              })
            ),
            tokenList.length === 0 ? $noBerriesOwnedMsg : empty(),

            $displayMintEvents(labWallet.contract, clickMintWhitelist)
          )

        }, gbcWallet.tokenList))

      }, whitelistTimeDelta)),
    )
  ]
})