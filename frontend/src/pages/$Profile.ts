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
  // const GRAPHS_INTERVAL = Math.floor(intervalInMsMap.HR4)

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
    $responsiveFlex(layoutSheet.spacingBig)(

      $column(style({ width: '500px' }))(
        $accountPreview({
          address: accountAddress,
          avatarSize: 150,
          labelSize: '2em'
        }),
      ),

      // $column(style({ gap: '50px', flex: 1 }))(

      //   $column(layoutSheet.spacing)(
      //     $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
      //       $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))(`Rewards`),
      //       $row(layoutSheet.spacingSmall)(
      //         $text(style({ color: pallete.foreground }))('Distributing'),
      //         $text(combineArray(rr => {
      //           const leftToDist = BigInt(REWARD_DISTRIBUTOR.distributionPeriod) * rr / 7n

      //           return `${readableNumber(formatFixed(leftToDist, 18))} ETH`
      //         }, rewardDistributor.rewardRate)),
      //         $text(style({ color: pallete.foreground }))('between'),
      //         $text(combineArray((totalSupply) => `${readableNumber(totalSupply)} GBC`, rewardDistributor.totalSupply)),
      //         $text(style({ color: pallete.foreground }))('Each Day'),
      //       ),
      //     ),

      //     $node(),

            



      //   $seperator2,


      //   $column(layoutSheet.spacing)(
      //     $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
      //       $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))(`Stake GBC`),
      //       $row(layoutSheet.spacingSmall)(
      //         $text(combineArray((totalSupply) => `${readableNumber(totalSupply)}/${readableNumber(MINT_MAX_SUPPLY)}`, rewardDistributor.totalSupply)),
      //         $text(style({ color: pallete.foreground }))('Staked'),
      //       ),
      //     ),

      //     $node(),


      //     $row(layoutSheet.spacing)(
      //       switchLatest(map(tokenList => {

      //         const selection = startWith([], selectTokensForWhitelist)

      //         return $SelectBerries({
      //           label: 'Deposit',
      //           options: tokenList
      //         })({
      //           select: selectTokensForWhitelistTether()
      //         })

      //       }, ownedTokens)),


      //       switchLatest(map(isApproved => {


      //         const buttonBehavior = isApproved
      //           ? setApprovalForAllTether(snapshot(async ({ selection, contract, account }) => {
     
      //             if ((contract === null || !account)) {
      //               throw new Error(`Unable to resolve contract`)
      //             }

      //             const idList = selection.map(t => t.id)

      //             return contract.stakeForAccount(account, account, idList)

      //           }, combineObject({ selection: chosenTokens, contract: rewardDistributor.contract, account: walletLink.account })))
      //           :  stakeTxnTether(snapshot(async ({ contract }) => {
     
      //             return contract.setApprovalForAll(GBC_ADDRESS.REWARD_DISTRIBUTOR, true)

      //           }, combineObject({ contract: gbcWallet.contract })))


      //         return $ButtonPrimary({
      //           disabled: map(list => isApproved && list.length === 0, chosenTokens),
      //           $content: switchLatest(
      //             map(({ chosenTokens }) => {

      //               const amount = chosenTokens.length
      //               const label = isApproved ? amount ? `Stake ${amount}` : 'Stake' : 'Allow Staking'
      //               return $text(label)

      //             }, combineObject({ chosenTokens }))
      //           ),
      //         })({
      //           click: buttonBehavior
      //         })
      //       }, isApprovedForAll)),


      //       switchLatest(map(isApproved => isApproved ? empty() : $alert($text('<- Initial Staking approval is needed first')), isApprovedForAll))
      //     ),


      //     style({ alignSelf: 'flex-end' })(
      //       $IntermediateTx({
      //         chain: USE_CHAIN,
      //         query: merge(stakeTxn, setApprovalForAll)
      //       })({})
      //     ),

      //     $node(),


      //     switchLatest(combineArray((stakedList, ownedTokens) => {

      //       const selection = startWith([], selectTokensToWithdraw)

      //       return $column(layoutSheet.spacing)(
      //         $row(layoutSheet.spacing)(
      //           $SelectBerries({
      //             options: stakedList,
      //             label: 'Withdraw'
      //           })({
      //             select: selectTokensToWithdrawTether()
      //           }),

      //           $ButtonPrimary({
      //             disabled: map(list => list.length === 0, selection),
      //             $content: switchLatest(
      //               map(({ selection }) => {
      //                 const amount = selection.length
      //                 const label = amount ? `Withdraw ${amount}` : 'Withdraw'
      //                 return $text(label)

      //               }, combineObject({ selection }))
      //             ),
      //           })({
      //             click: clickWithdrawTether()
      //           }),
      //         ),

      //         $IntermediateTx({
      //           chain: USE_CHAIN,
      //           query: withdrawTxn,
      //         })({}),
      //       )

      //     }, stakedList, ownedTokens)),
      //   )


      // ),



      $IntermediatePromise({
        query: now(queryOwnerV2(accountAddress.toLowerCase())),
        $$done: map(owner => {
          if (owner == null) {
            return $alert($text(style({ alignSelf: 'center' }))(`Connected account does not own any GBC's`))
          }

          return $row(style({ flexWrap: 'wrap' }))(...owner.ownedTokens.map(token => {
            const tokenId = Number(BigInt(token.id))

            return $berryTileId(tokenId, token)
          }))
        }),
      })({}),


      // $responsiveFlex(layoutSheet.spacingBig)(

      //   $StakingGraph({
      //     valueSource: [gmxArbitrumRS, glpArbitrumRS, glpAvalancheRS],
      //     stakingYield: combineArray((...claims) => claims.flat(), map(feeList => feeList.map(fc => {
      //       return { ...fc, deltaUsd: fc.amountUsd, time: fc.timestamp }
      //     }), stakingClaim)),
      //     arbitrumStakingRewards,
      //     avalancheStakingRewards,
      //     // yieldList: combineArray((...yields) => yields.flat(),  glpAvalancheRS),
      //     walletLink,
      //     priceFeedHistoryMap: pricefeedQuery,
      //     graphInterval: GRAPHS_INTERVAL,
      //   })({}),



      // ),

      // $node(),

      // $column(layoutSheet.spacing, style({}))(
      //   $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Yielding Assets'),

      //   $column(layoutSheet.spacing, style({ flex: 2 }))(
      //     screenUtils.isDesktopScreen
      //       ? $row(layoutSheet.spacingBig, style({ color: pallete.foreground, fontSize: '.75em' }))(
      //         $text(style({ flex: 1 }))('Holdings'),
      //         $row(layoutSheet.spacingBig, style({ flex: 3 }))(
      //           $text(style({ flex: 1 }))('Price History'),
      //           $text(style({ flex: 1, maxWidth: '300px' }))('Distribution')
      //         ),
      //       ) : empty(),
      //     $column(layoutSheet.spacingBig)(
      //       $AssetDetails({
      //         label: 'GMX',
      //         symbol: 'GMX',
      //         chain: CHAIN.ARBITRUM,
      //         asset: gmxAsset,
      //         priceChart: gmxArbitrumRS,
      //         $distribution: switchLatest(map(({  bnGmxInFeeGmx, bonusGmxInFeeGmx, gmxAprForEthPercentage, gmxAprForEsGmxPercentage }) => {
      //           const boostBasisPoints = formatFixed(bnGmxInFeeGmx * BASIS_POINTS_DIVISOR / bonusGmxInFeeGmx, 2)
          
      //           return $column(layoutSheet.spacingSmall, style({ flex: 1, }))(
      //             $metricEntry(`esGMX`, `${formatFixed(gmxAprForEsGmxPercentage, 2)}%`),
      //             $metricEntry(`ETH`, `${formatFixed(gmxAprForEthPercentage, 2)}%`),
      //             $metricEntry(`Compounding Bonus`, `${boostBasisPoints}%`),
      //             $metricEntry(`Compounding Multiplier`, `${readableNumber(formatFixed(bnGmxInFeeGmx, 18))}`),
      //           )
      //         }, arbitrumStakingRewards)),
      //         $iconPath: $tokenIconMap[ARBITRUM_CONTRACT.GMX],
      //       })({}),
      //       $seperator2,
      //       $AssetDetails({
      //         label: 'GLP',
      //         symbol: 'GLP',
      //         chain: CHAIN.ARBITRUM,
      //         asset: glpArbiAsset,
      //         priceChart: glpArbitrumRS,
      //         $distribution: switchLatest(map(({ glpAprForEsGmxPercentage, glpAprForEthPercentage,   }) => {

      //           return $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
      //             $metricEntry(`esGMX`, `${formatFixed(glpAprForEsGmxPercentage, 2)}%`),
      //             $metricEntry(`ETH`, `${formatFixed(glpAprForEthPercentage, 2)}%`),
      //           )
      //         }, arbitrumStakingRewards)),
      //         $iconPath: $tokenIconMap[ARBITRUM_CONTRACT.GLP],
      //       })({}),
      //       $seperator2,
      //       $AssetDetails({
      //         label: 'GLP',
      //         symbol: 'GLP',
      //         chain: CHAIN.AVALANCHE,
      //         asset: glpAvaxAsset,
      //         priceChart: glpAvalancheRS,
      //         $distribution: switchLatest(map(({ glpAprForEsGmxPercentage, glpAprForEthPercentage,   }) => {

      //           return $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
      //             $metricEntry(`esGMX`, `${formatFixed(glpAprForEsGmxPercentage, 2)}%`),
      //             $metricEntry(`AVAX`, `${formatFixed(glpAprForEthPercentage, 2)}%`),
      //           )
      //         }, avalancheStakingRewards)),
      //         $iconPath: $tokenIconMap[ARBITRUM_CONTRACT.GLP],
      //       })({}),
      //     ),
      //   ),
      // ),
    )
  ]
})


