import { Behavior, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, state } from "@aelea/ui-components"
import { GBC_ADDRESS, IToken, MINT_MAX_SUPPLY, REWARD_DISTRIBUTOR, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { formatFixed, formatReadableUSD, readableNumber } from "@gambitdao/gmx-middleware"

import { IWalletLink } from "@gambitdao/wallet-link"
import { empty, fromPromise, map, merge, multicast, now, snapshot, startWith, switchLatest } from "@most/core"
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
import { ContractReceipt, ContractTransaction } from "@ethersproject/contracts"
import { $SelectBerries } from "../components/$SelectBerries"
import { $berryTileId } from "../components/$common"
import { $berryByToken } from "../logic/common"


export interface IAccount {
  walletLink: IWalletLink
  parentRoute: Route
  accountStakingStore: state.BrowserStore<IAccountStakingStore, "accountStakingStore">
  // walletStore: cstate.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}

export const $Profile = ({ walletLink, parentRoute, accountStakingStore }: IAccount) => component((
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


  // const arbitrumStakingRewards = replayLatest(multicast(arbitrumContract.stakingRewards))
  // const avalancheStakingRewards = replayLatest(multicast(avalancheContract.stakingRewards))
  // const pricefeedQuery = replayLatest(multicast(fromPromise(gmxGlpPriceHistory(queryParams))))

  // const arbitrumYieldSourceMap = replayLatest(multicast(fromPromise(queryArbitrumRewards(queryParams))))
  // const avalancheYieldSourceMap = replayLatest(multicast(fromPromise(queryAvalancheRewards({ ...queryParams, account: accountAddress }))))



  // const gmxAsset: Stream<IAsset> = combine((bn, priceMap) => {
  //   return { balance: bn.gmxInStakedGmx, balanceUsd: bn.gmxInStakedGmx * priceMap.gmx.value / BI_18_PRECISION }
  // }, arbitrumStakingRewards, latestTokenPriceMap)
  // const glpArbiAsset: Stream<IAsset> = combine((bn, priceMap) => ({ balance: bn.glpBalance, balanceUsd: priceMap.glpArbitrum.value * bn.glpBalance / BI_18_PRECISION }), arbitrumStakingRewards, latestTokenPriceMap)
  // const glpAvaxAsset: Stream<IAsset> = combine((bn, priceMap) => ({ balance: bn.glpBalance, balanceUsd: priceMap.glpArbitrum.value * bn.glpBalance / BI_18_PRECISION }), avalancheStakingRewards, latestTokenPriceMap)


  // const feeYieldClaim = combineArray((arbiStaking, avaxStaking) => [...arbiStaking.feeGlpTrackerClaims, ...arbiStaking.feeGmxTrackerClaims, ...avaxStaking.feeGlpTrackerClaims, ...avaxStaking.feeGmxTrackerClaims], arbitrumYieldSourceMap, avalancheYieldSourceMap)
  // const newLocal = take(1, latestTokenPriceMap)
  // const stakingClaim = combineArray((arbiStaking, avaxStaking, yieldFeeList, priceMap) => {
  //   // amountUsd from avalanche is not reflecting the real amount because the subraph's gmx price is 0
  //   // to fix this, we'll fetch arbitrum's price of GMX instead
  //   const gmx = [...avaxStaking.stakedGlpTrackerClaims, ...avaxStaking.stakedGmxTrackerClaims].map(y => ({ ...y, amountUsd: y.amount * priceMap.gmx.value / BI_18_PRECISION }))

  //   return [...yieldFeeList, ...gmx, ...arbiStaking.stakedGlpTrackerClaims, ...arbiStaking.stakedGmxTrackerClaims]
  // }, arbitrumYieldSourceMap, avalancheYieldSourceMap, feeYieldClaim, newLocal)
  // const GRAPHS_INTERVAL = Math.floor(intervalTimeMap.HR4)

  // const gmxArbitrumRS = priceFeedHistoryInterval(
  //   GRAPHS_INTERVAL,
  //   map(feedMap => feedMap.gmx, pricefeedQuery),
  //   map(staking => staking.stakes.filter(s => s.token === StakedTokenArbitrum.GMX || s.token === StakedTokenArbitrum.esGMX), arbitrumYieldSourceMap)
  // )

  // const glpArbitrumRS = priceFeedHistoryInterval(
  //   GRAPHS_INTERVAL,
  //   map(feedMap => feedMap.glpArbitrum, pricefeedQuery),
  //   map(staking => staking.stakes.filter(s => s.token === StakedTokenArbitrum.GLP), arbitrumYieldSourceMap)
  // )

  // const glpAvalancheRS = priceFeedHistoryInterval(
  //   GRAPHS_INTERVAL,
  //   map(feedMap => feedMap.glpAvalanche, pricefeedQuery),
  //   map(staking => staking.stakes.filter(s => s.token === StakedTokenAvalanche.GLP), avalancheYieldSourceMap)
  // )




  const urlFragments = document.location.pathname.split('/')
  const accountAddress = urlFragments[urlFragments.length - 1].toLowerCase()

  const queryOwner = fromPromise(accountAddress ? queryOwnerV2(accountAddress) : Promise.reject())

  // const ownedTokens = map(owner => owner.ownedTokens, queryOwner)

  // const stakedList = map(owner => owner.stakedTokenList, queryOwner)


  const gbcWallet = connectGbc(walletLink)
  const rewardDistributor = connectRewardDistributor(walletLink)

  const priceMap = fromPromise(queryLatestPrices())

  
  // const isApprovedForAll = replayLatest(multicast(rewardDistributor.isApprovedForAll))

  // // Promise<ContractReceipt>

  // const chosenTokens = startWith([], selectTokensForWhitelist)

  // const withdrawTxn = snapshot(async ({ selection, contract, account }) => {
     
  //   if ((contract === null || !account)) {
  //     throw new Error(`Unable to resolve contract`)
  //   }


  //   const idList = selection.map(s => s.id)
  //   const tx = contract.stakeForAccount(account, account, idList)

  //   return tx

  // }, combineObject({ selection: selectTokensToWithdraw, contract: rewardDistributor.contract, account: walletLink.account }), clickWithdraw)


  return [
    $column(layoutSheet.spacingBig)(

      $column(style({ width: '500px' }))(
        $accountPreview({
          address: accountAddress,
          avatarSize: 150,
          labelSize: '2em'
        }),
      ),

      $IntermediatePromise({
        query: now(queryOwnerV2(accountAddress.toLowerCase())),
        $$done: map(owner => {
          if (owner == null) {
            return $alert($text(style({ alignSelf: 'center' }))(`Connected account does not own any GBC's`))
          }

          return $row(style({ flexWrap: 'wrap' }))(...owner.ownedTokens.map(token => {
            return $berryByToken(token)
          }))
        }),
      })({}),

    )
  ]
})


