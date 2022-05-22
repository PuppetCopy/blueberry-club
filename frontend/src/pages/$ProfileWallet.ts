import { Behavior, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, state } from "@aelea/ui-components"
import { GBC_ADDRESS, IOwner, IToken, MINT_MAX_SUPPLY, REWARD_DISTRIBUTOR, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { formatFixed, formatReadableUSD, readableNumber } from "@gambitdao/gmx-middleware"

import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, empty, fromPromise, map, merge, multicast, now, snapshot, startWith, switchLatest } from "@most/core"
import { $responsiveFlex } from "../elements/$common"
import { queryLatestPrices, queryOwnerV2 } from "../logic/query"
import { IAccountStakingStore } from "@gambitdao/gbc-middleware"
import { pallete } from "@aelea/ui-components-theme"
import { $seperator2 } from "./common"
import { $alert, $IntermediatePromise, $IntermediateTx } from "@gambitdao/ui-components"
import { connectGbc } from "../logic/contract/gbc"
import { $ButtonPrimary } from "../components/form/$Button"
import { connectRewardDistributor } from "../logic/contract/rewardDistributor"
import { $accountPreview } from "../components/$AccountProfile"
import { ContractTransaction } from "@ethersproject/contracts"
import { $SelectBerries } from "../components/$SelectBerries"
import { $berryTileId } from "../components/$common"


export interface IAccount {
  walletLink: IWalletLink
  parentRoute: Route
  accountStakingStore: state.BrowserStore<IAccountStakingStore, "accountStakingStore">
  // walletStore: cstate.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}

export const $ProfileWallet = ({ walletLink, parentRoute, accountStakingStore }: IAccount) => component((
  [selectTokensForWhitelist, selectTokensForWhitelistTether]: Behavior<IToken[], IToken[]>,
  [selectTokensToWithdraw, selectTokensToWithdrawTether]: Behavior<IToken[], IToken[]>,
  [clickWithdraw, clickWithdrawTether]: Behavior<PointerEvent, PointerEvent>,

  [stakeTxn, stakeTxnTether]: Behavior<any, Promise<ContractTransaction>>,
  [setApprovalForAll, setApprovalForAllTether]: Behavior<any, Promise<ContractTransaction>>,

) => {

  
  
  // const saleWallet = connectSale(walletLink, item.contractAddress)

  // const arbitrumContract: IGmxContractInfo = initContractChain(web3Provider, accountAddress, ARBITRUM_CONTRACT)
  // const avalancheContract: IGmxContractInfo = initContractChain(w3pAva, accountAddress, AVALANCHE_CONTRACT)



  // const queryParams: IAccountQueryParamApi & Partial<ITimerangeParamApi> = {
  //   from: accountStakingStore.state.startedStakingGmxTimestamp || undefined,
  //   account: accountAddress
  // }



  const queryOwner = replayLatest(multicast(map(address => {
    if (!address) {
      throw new Error('No account connected')
    }

    return queryOwnerV2(address)
  }, walletLink.account)))



  const gbcWallet = connectGbc(walletLink)
  

  return [
    $responsiveFlex(layoutSheet.spacingBig)(

      $IntermediatePromise({
        query: queryOwner,
        $$done: map(owner => {
          if (owner === null) {
            return null
          }

          return $Profile(owner)({})
        }),
      })({}),

    )
  ]
})


export const $Profile = (owner: IOwner) => component((
  [selectTokensForWhitelist, selectTokensForWhitelistTether]: Behavior<IToken[], IToken[]>,

) => {


  return [
    $responsiveFlex(layoutSheet.spacingBig)(

      $column(layoutSheet.spacingBig, style({ width: '300px' }))(
        style({ placeContent: 'center' }, $accountPreview({
          labelSize: '2em',
          avatarSize: 130,
          address: owner.id
        })),

        $row(style({ flexWrap: 'wrap' }))(...owner.ownedTokens.map(token => {
          const tokenId = Number(BigInt(token.id))

          return $berryTileId(tokenId, token, 75)
        })),
      ),

    )
  ]
})
