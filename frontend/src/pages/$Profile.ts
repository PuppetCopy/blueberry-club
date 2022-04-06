import { Behavior, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style, styleBehavior } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { BI_18_PRECISION, BI_30_PRECISION, GBC_ADDRESS, GBC_DESCRIPTION, hasWhitelistSale, MINT_MAX_SUPPLY } from "@gambitdao/gbc-middleware"
import { ARBITRUM_CONTRACT, AVALANCHE_CONTRACT, BASIS_POINTS_DIVISOR, CHAIN, formatFixed, formatReadableUSD, IAccountQueryParamApi, intervalInMsMap, ITimerangeParamApi, readableNumber } from "@gambitdao/gmx-middleware"

import { IWalletLink } from "@gambitdao/wallet-link"
import { combine, empty, fromPromise, map, merge, multicast, now, snapshot, startWith, switchLatest, take } from "@most/core"
import { $StakingGraph } from "../components/$StakingGraph"
import { $responsiveFlex } from "../elements/$common"
import { gmxGlpPriceHistory, queryArbitrumRewards, queryAvalancheRewards, queryLatestPrices, queryOwnerOwnedTokens, StakedTokenArbitrum, StakedTokenAvalanche } from "../logic/query"
import { IAccountStakingStore, IAsset } from "@gambitdao/gbc-middleware"
import { IGmxContractInfo, initContractChain } from "../logic/contract"
import { Stream } from "@most/types"
import { latestTokenPriceMap, priceFeedHistoryInterval } from "../logic/common"
import { web3Provider, w3pAva } from "../logic/provider"
import { pallete } from "@aelea/ui-components-theme"
import { $tokenIconMap } from "../common/$icons"
import { $AssetDetails } from "../components/$AssetDetails"
import { $metricEntry, $seperator2 } from "./common"
import { $berryTileId } from "../components/$common"
import { $alert, $IntermediatePromise, $IntermediateTx } from "@gambitdao/ui-components"
import { connectGbc } from "../logic/contract/gbc"
import { $defaultSelectContainer, $DropMultiSelect } from "../components/form/$Dropdown"
import { $ButtonSecondary, $ButtonPrimary } from "../components/form/$Button"
import { $caretDown } from "../elements/$icons"
import { connectRewardDistributor } from "../logic/contract/rewardDistributor"
import { $AccountPreview } from "../components/$AccountProfile"
import { ContractReceipt } from "@ethersproject/contracts"


export interface IAccount {
  walletLink: IWalletLink
  parentRoute: Route
  accountStakingStore: state.BrowserStore<IAccountStakingStore, "accountStakingStore">
  // walletStore: cstate.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}

export const $Profile = ({ walletLink, parentRoute, accountStakingStore }: IAccount) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
  [selectTokensForWhitelist, selectTokensForWhitelistTether]: Behavior<number[], number[]>,
  [stakeTxn, stakeTxnTether]: Behavior<any, Promise<ContractReceipt>>,
  [setApprovalForAll, setApprovalForAllTether]: Behavior<any, Promise<ContractReceipt>>,

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
  

  const gbcWallet = connectGbc(walletLink)
  const rewardDistributor = connectRewardDistributor(walletLink)

  const priceMap = fromPromise(queryLatestPrices())

  
  const isApprovedForAll = replayLatest(multicast(rewardDistributor.isApprovedForAll))


  return [
    $responsiveFlex(layoutSheet.spacingBig)(

      $column(style({ width: '500px' }))(
        $AccountPreview({
          address: accountAddress,
          avatarSize: 150,
          labelSize: '2em'
        })({}),
      ),

      $column(layoutSheet.spacing, style({ alignItems: 'flex-start', flex: 1 }))(

        $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
          $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))(`Trading Rewards`),
          $row(layoutSheet.spacingSmall)(
            $text(combineArray((totalSupply) => readableNumber(MINT_MAX_SUPPLY) + `/${readableNumber(totalSupply)}`, rewardDistributor.totalSupply)),
            $text(style({ color: pallete.foreground }))('Staked'),
          ),
        ),
        
        switchLatest(map(tokenList => {

          const chosenTokens = startWith([], selectTokensForWhitelist)

          return $row(layoutSheet.spacing)(

            $DropMultiSelect({
              $selection: map(s => {
                const $content = $row(style({ alignItems: 'center' }))(
                  s.length === 0 ? $text(`Select Berry`) : $row(...s.map(i => $berryTileId(i))),
                  $icon({ $content: $caretDown, width: '18px', svgOps: style({ marginTop: '3px', marginLeft: '6px' }), viewBox: '0 0 32 32' }),
                )

                return $ButtonSecondary({
                  $content,
                  disabled: now(tokenList.length === 0)
                })({})
              }),
              value: now([]),
              $option: $row,
              select: {
                $container: $defaultSelectContainer(style({ gap: 0, flexWrap: 'wrap', width: '300px', maxHeight: '400px', overflow: 'auto', flexDirection: 'row' })),
                optionOp: snapshot((list, token) => {

                  if (!token) {
                    throw new Error(`No berry id:${token} exists`)
                  }

                  return style({ cursor: 'pointer', opacity: list.indexOf(token) === -1 ? 1 : .5 }, $berryTileId(token))
                }, chosenTokens),
                options: tokenList
              }
            })({
              selection: selectTokensForWhitelistTether()
            }),


            switchLatest(map(isApproved => {


              const buttonBehavior = isApproved
                ? setApprovalForAllTether(snapshot(async ({ selection, contract, account }) => {
     
                  if ((contract === null || !account)) {
                    throw new Error(`Unable to resolve contract`)
                  }


                  const tx = (await contract.stake(selection)).wait()

                  return tx

                }, combineObject({ selection: chosenTokens, contract: rewardDistributor.contract, account: walletLink.account })))
                :  stakeTxnTether(snapshot(async ({ contract }) => {
     
                  return (await contract.setApprovalForAll(GBC_ADDRESS.REWARD_DISTRIBUTOR, true)).wait()

                }, combineObject({ contract: gbcWallet.contract })))


              return $ButtonPrimary({
                disabled: map(({ chosenTokens }) => chosenTokens.length === 0, combineObject({ chosenTokens, isApprovedForAll })),
                $content: switchLatest(
                  map(({ chosenTokens }) => {

                    const amount = chosenTokens.length
                    return $text(amount ? `Stake ${amount}` : 'Stake')

                  }, combineObject({ chosenTokens }))
                ),
              })({
                click: buttonBehavior
              })
            }, isApprovedForAll)),



            $IntermediateTx({
              query: merge(stakeTxn, setApprovalForAll),
              $done: map(tx => $text('done'))
            })({}),


            switchLatest(map(isApproved => isApproved ? empty() : $alert($text('<- Initial Staking approval is needed first')), isApprovedForAll))
          )

        }, gbcWallet.tokenList)),

        $seperator2,
            
        $row(layoutSheet.spacing)(
          $column(
            $text('Weekly APY(est):'),
            $text(combineArray((rewardPerToken, balance, pmap) => {
              // (balance * (rpt - rptOfUser))/ PRECISION

              intervalInMsMap.YEAR

              const rewardRateUsd = pmap.eth.value * (balance * rewardPerToken) / BI_30_PRECISION

              return `${formatFixed(rewardRateUsd, 30)}`
            }, rewardDistributor.rewardPerToken, rewardDistributor.tokenBalance, priceMap))
          ),
          $column(
            $text('Earned:'),
            $text(combineArray((earned, balance, pmap) => `$${formatReadableUSD(earned)}`, rewardDistributor.earned, rewardDistributor.tokenBalance, priceMap))
          ),
          $column(
            $text('Staking:'),
            $text(combineArray((balance) => `${balance}`, rewardDistributor.stakeBalance))
          ),
        )
      ),



      // $IntermediatePromise({
      //   query: now(queryOwnerOwnedTokens(accountAddress)),
      //   $done: map(ids => {
      //     return $row(style({ flexWrap: 'wrap' }))(...ids.map(token => {
      //       const tokenId = Number(BigInt(token.id))

      //       return $berryTileId(tokenId)
      //     }))
      //   }),
      // })({}),


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


