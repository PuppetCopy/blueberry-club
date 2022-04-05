import { Behavior, combineArray, replayLatest } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { BI_18_PRECISION } from "@gambitdao/gbc-middleware"
import { ARBITRUM_CONTRACT, AVALANCHE_CONTRACT, BASIS_POINTS_DIVISOR, CHAIN, formatFixed, IAccountQueryParamApi, intervalInMsMap, ITimerangeParamApi, readableNumber } from "@gambitdao/gmx-middleware"

import { IWalletLink } from "@gambitdao/wallet-link"
import { combine, empty, fromPromise, map, multicast, now, switchLatest, take } from "@most/core"
import { $StakingGraph } from "../components/$StakingGraph"
import { $responsiveFlex } from "../elements/$common"
import { gmxGlpPriceHistory, queryArbitrumRewards, queryAvalancheRewards, queryOwnerOwnedTokens, StakedTokenArbitrum, StakedTokenAvalanche } from "../logic/query"
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
import { $IntermediatePromise } from "@gambitdao/ui-components"


export interface IAccount {
  walletLink: IWalletLink
  parentRoute: Route
  accountStakingStore: state.BrowserStore<IAccountStakingStore, "accountStakingStore">
  // walletStore: cstate.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}

export const $Account = ({ walletLink, parentRoute, accountStakingStore }: IAccount) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
) => {


  const urlFragments = document.location.pathname.split('/')
  const accountAddress = urlFragments[urlFragments.length - 1].toLowerCase()
  


  const arbitrumContract: IGmxContractInfo = initContractChain(web3Provider, accountAddress, ARBITRUM_CONTRACT)
  const avalancheContract: IGmxContractInfo = initContractChain(w3pAva, accountAddress, AVALANCHE_CONTRACT)


  const queryParams: IAccountQueryParamApi & Partial<ITimerangeParamApi> = {
    from: accountStakingStore.state.startedStakingGmxTimestamp || undefined,
    account: accountAddress
  }


  const arbitrumStakingRewards = replayLatest(multicast(arbitrumContract.stakingRewards))
  const avalancheStakingRewards = replayLatest(multicast(avalancheContract.stakingRewards))
  const pricefeedQuery = replayLatest(multicast(fromPromise(gmxGlpPriceHistory(queryParams))))
 
  const arbitrumYieldSourceMap = replayLatest(multicast(fromPromise(queryArbitrumRewards(queryParams))))
  const avalancheYieldSourceMap = replayLatest(multicast(fromPromise(queryAvalancheRewards({ ...queryParams, account: accountAddress }))))



  const gmxAsset: Stream<IAsset> = combine((bn, priceMap) => {
    return { balance: bn.gmxInStakedGmx, balanceUsd: bn.gmxInStakedGmx * priceMap.gmx.value / BI_18_PRECISION }
  }, arbitrumStakingRewards, latestTokenPriceMap)
  const glpArbiAsset: Stream<IAsset> = combine((bn, priceMap) => ({ balance: bn.glpBalance, balanceUsd: priceMap.glpArbitrum.value * bn.glpBalance / BI_18_PRECISION }), arbitrumStakingRewards, latestTokenPriceMap)
  const glpAvaxAsset: Stream<IAsset> = combine((bn, priceMap) => ({ balance: bn.glpBalance, balanceUsd: priceMap.glpArbitrum.value * bn.glpBalance / BI_18_PRECISION }), avalancheStakingRewards, latestTokenPriceMap)


  const feeYieldClaim = combineArray((arbiStaking, avaxStaking) => [...arbiStaking.feeGlpTrackerClaims, ...arbiStaking.feeGmxTrackerClaims, ...avaxStaking.feeGlpTrackerClaims, ...avaxStaking.feeGmxTrackerClaims], arbitrumYieldSourceMap, avalancheYieldSourceMap)
  const newLocal = take(1, latestTokenPriceMap)
  const stakingClaim = combineArray((arbiStaking, avaxStaking, yieldFeeList, priceMap) => {
    // amountUsd from avalanche is not reflecting the real amount because the subraph's gmx price is 0
    // to fix this, we'll fetch arbitrum's price of GMX instead
    const gmx = [...avaxStaking.stakedGlpTrackerClaims, ...avaxStaking.stakedGmxTrackerClaims].map(y => ({ ...y, amountUsd: y.amount * priceMap.gmx.value / BI_18_PRECISION }))

    return [...yieldFeeList, ...gmx, ...arbiStaking.stakedGlpTrackerClaims, ...arbiStaking.stakedGmxTrackerClaims]
  }, arbitrumYieldSourceMap, avalancheYieldSourceMap, feeYieldClaim, newLocal)
  const GRAPHS_INTERVAL = Math.floor(intervalInMsMap.HR4)

  const gmxArbitrumRS = priceFeedHistoryInterval(
    GRAPHS_INTERVAL,
    map(feedMap => feedMap.gmx, pricefeedQuery),
    map(staking => staking.stakes.filter(s => s.token === StakedTokenArbitrum.GMX || s.token === StakedTokenArbitrum.esGMX), arbitrumYieldSourceMap)
  )

  const glpArbitrumRS = priceFeedHistoryInterval(
    GRAPHS_INTERVAL,
    map(feedMap => feedMap.glpArbitrum, pricefeedQuery),
    map(staking => staking.stakes.filter(s => s.token === StakedTokenArbitrum.GLP), arbitrumYieldSourceMap)
  )

  const glpAvalancheRS = priceFeedHistoryInterval(
    GRAPHS_INTERVAL,
    map(feedMap => feedMap.glpAvalanche, pricefeedQuery),
    map(staking => staking.stakes.filter(s => s.token === StakedTokenAvalanche.GLP), avalancheYieldSourceMap)
  )



  


  return [
    $column(layoutSheet.spacingBig)(

      $IntermediatePromise({
        query: now(queryOwnerOwnedTokens(accountAddress)),
        $done: map(ids => {
          return $row(style({ flexWrap: 'wrap' }))(...ids.map(token => {
            const tokenId = Number(BigInt(token.id))

            return $berryTileId(tokenId)
          }))
        }),
      })({}),


      $responsiveFlex(layoutSheet.spacingBig)(

        $StakingGraph({
          valueSource: [gmxArbitrumRS, glpArbitrumRS, glpAvalancheRS],
          stakingYield: combineArray((...claims) => claims.flat(), map(feeList => feeList.map(fc => {
            return { ...fc, deltaUsd: fc.amountUsd, time: fc.timestamp }
          }), stakingClaim)),
          arbitrumStakingRewards,
          avalancheStakingRewards,
          // yieldList: combineArray((...yields) => yields.flat(),  glpAvalancheRS),
          walletLink,
          priceFeedHistoryMap: pricefeedQuery,
          graphInterval: GRAPHS_INTERVAL,
        })({}),



      ),

      $node(),

      $column(layoutSheet.spacing, style({}))(
        $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Yielding Assets'),

        $column(layoutSheet.spacing, style({ flex: 2 }))(
          screenUtils.isDesktopScreen
            ? $row(layoutSheet.spacingBig, style({ color: pallete.foreground, fontSize: '.75em' }))(
              $text(style({ flex: 1 }))('Holdings'),
              $row(layoutSheet.spacingBig, style({ flex: 3 }))(
                $text(style({ flex: 1 }))('Price History'),
                $text(style({ flex: 1, maxWidth: '300px' }))('Distribution')
              ),
            ) : empty(),
          $column(layoutSheet.spacingBig)(
            $AssetDetails({
              label: 'GMX',
              symbol: 'GMX',
              chain: CHAIN.ARBITRUM,
              asset: gmxAsset,
              priceChart: gmxArbitrumRS,
              $distribution: switchLatest(map(({  bnGmxInFeeGmx, bonusGmxInFeeGmx, gmxAprForEthPercentage, gmxAprForEsGmxPercentage }) => {
                const boostBasisPoints = formatFixed(bnGmxInFeeGmx * BASIS_POINTS_DIVISOR / bonusGmxInFeeGmx, 2)
          
                return $column(layoutSheet.spacingSmall, style({ flex: 1, }))(
                  $metricEntry(`esGMX`, `${formatFixed(gmxAprForEsGmxPercentage, 2)}%`),
                  $metricEntry(`ETH`, `${formatFixed(gmxAprForEthPercentage, 2)}%`),
                  $metricEntry(`Compounding Bonus`, `${boostBasisPoints}%`),
                  $metricEntry(`Compounding Multiplier`, `${readableNumber(formatFixed(bnGmxInFeeGmx, 18))}`),
                )
              }, arbitrumStakingRewards)),
              $iconPath: $tokenIconMap[ARBITRUM_CONTRACT.GMX],
            })({}),
            $seperator2,
            $AssetDetails({
              label: 'GLP',
              symbol: 'GLP',
              chain: CHAIN.ARBITRUM,
              asset: glpArbiAsset,
              priceChart: glpArbitrumRS,
              $distribution: switchLatest(map(({ glpAprForEsGmxPercentage, glpAprForEthPercentage,   }) => {

                return $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
                  $metricEntry(`esGMX`, `${formatFixed(glpAprForEsGmxPercentage, 2)}%`),
                  $metricEntry(`ETH`, `${formatFixed(glpAprForEthPercentage, 2)}%`),
                )
              }, arbitrumStakingRewards)),
              $iconPath: $tokenIconMap[ARBITRUM_CONTRACT.GLP],
            })({}),
            $seperator2,
            $AssetDetails({
              label: 'GLP',
              symbol: 'GLP',
              chain: CHAIN.AVALANCHE,
              asset: glpAvaxAsset,
              priceChart: glpAvalancheRS,
              $distribution: switchLatest(map(({ glpAprForEsGmxPercentage, glpAprForEthPercentage,   }) => {

                return $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
                  $metricEntry(`esGMX`, `${formatFixed(glpAprForEsGmxPercentage, 2)}%`),
                  $metricEntry(`AVAX`, `${formatFixed(glpAprForEthPercentage, 2)}%`),
                )
              }, avalancheStakingRewards)),
              $iconPath: $tokenIconMap[ARBITRUM_CONTRACT.GLP],
            })({}),
          ),
        ),
      ),
    )
  ]
})


