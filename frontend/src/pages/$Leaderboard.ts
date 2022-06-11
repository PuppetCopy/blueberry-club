import { O, Behavior, combineObject, replayLatest } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, state } from "@aelea/ui-components"
import { IToken } from "@gambitdao/gbc-middleware"
import { CHAIN, IAccountSummary, IChainParamApi, ILeaderboardRequest, intervalTimeMap, IPageParapApi } from "@gambitdao/gmx-middleware"

import { IWalletLink } from "@gambitdao/wallet-link"
import { fromPromise, map, multicast, snapshot, startWith } from "@most/core"
import { $responsiveFlex } from "../elements/$common"
import { queryLatestPrices, queryOwnerV2 } from "../logic/query"
import { IAccountStakingStore } from "@gambitdao/gbc-middleware"
import { connectGbc } from "../logic/contract/gbc"
import { $accountPreview } from "../components/$AccountProfile"
import { ContractTransaction } from "@ethersproject/contracts"
import { $Table2 } from "../common/$Table2"
import { Stream } from "@most/types"
import { $alert, $ProfitLossText, $risk } from "@gambitdao/ui-components"
import { connectRewardDistributor } from "../logic/contract/rewardDistributor"


export interface IAccount {
  walletLink: IWalletLink
  parentRoute: Route
  accountStakingStore: state.BrowserStore<IAccountStakingStore, "accountStakingStore">
  leaderboardTopList: Stream<IPageParapApi<IAccountSummary>>
}

export const $Leaderboard = ({ walletLink, leaderboardTopList, parentRoute, accountStakingStore }: IAccount) => component((
  [selectTokensForWhitelist, selectTokensForWhitelistTether]: Behavior<IToken[], IToken[]>,
  [selectTokensToWithdraw, selectTokensToWithdrawTether]: Behavior<IToken[], IToken[]>,
  [clickWithdraw, clickWithdrawTether]: Behavior<PointerEvent, PointerEvent>,

  [stakeTxn, stakeTxnTether]: Behavior<any, Promise<ContractTransaction>>,
  [setApprovalForAll, setApprovalForAllTether]: Behavior<any, Promise<ContractTransaction>>,
  [tableTopPnlRequest, tableTopPnlRequestTether]: Behavior<number, number>,

) => {

  const tableRequestState = map((page): IChainParamApi & ILeaderboardRequest => {
    return {
      timeInterval: intervalTimeMap.DAY7,
      offset: page * 20,
      pageSize: 20,
      sortBy: 'realisedPnlPercentage',
      chain: CHAIN.ARBITRUM,
      sortDirection: 'asc'
    }
  }, tableTopPnlRequest)


  const urlFragments = document.location.pathname.split('/')
  const accountAddress = urlFragments[urlFragments.length - 1].toLowerCase()

  const queryOwner = fromPromise(accountAddress ? queryOwnerV2(accountAddress) : Promise.reject())

  const ownedTokens = map(owner => {
    if (owner === null) {
      return null
    }

    return owner.ownedTokens
  }, queryOwner)

  // const stakedList = map(owner => owner.stakedTokenList, queryOwner)


  const gbcWallet = connectGbc(walletLink)
  const rewardDistributor = connectRewardDistributor(walletLink)

  const priceMap = fromPromise(queryLatestPrices())


  // const isApprovedForAll = replayLatest(multicast(rewardDistributor.isApprovedForAll))

  // Promise<ContractReceipt>

  const chosenTokens = startWith([], selectTokensForWhitelist)



  return [
    $responsiveFlex(layoutSheet.spacingBig)(


      $column(layoutSheet.spacingBig, style({ width: '500px' }))(

        $alert($text('Trading Leaderboard. Work in Progress (;')),


        $accountPreview({
          address: accountAddress,
          avatarSize: 150,
          labelSize: '2em'
        }),
      ),

      $column(style({ gap: '50px', flex: 1 }))(

        $Table2<IAccountSummary>({
          bodyContainerOp: layoutSheet.spacing,
          rowOp: layoutSheet.spacingTiny,
          scrollConfig: {
            containerOps: O(layoutSheet.spacingBig)
          },
          // sortChange: now(tableTopSettledSortByStore.state),
          // filterChange: merge(topPnlTimeframeChange, tableTopSettledSortByChange),
          dataSource: map((res) => {
            return {
              data: res.page,
              pageSize: res.pageSize,
              offset: res.offset,
            }
          }, leaderboardTopList),
          columns: [
            {
              $head: $text('Account'),
              columnOp: style({ minWidth: '125px' }),
              $body: map(({ account }) => {
                return $accountPreview({ address: account })
              })
            },
            {
              $head: $text('Win/Loss'),
              columnOp: style({ maxWidth: '65px', placeContent: 'center' }),
              $body: map(pos => {
                return $row(
                  $text(`${pos.winTradeCount}/${pos.settledTradeCount - pos.winTradeCount}`)
                )
              })
            },
            {
              $head: $text('Risk-$'),
              sortBy: 'size',
              columnOp: style({ placeContent: 'center', minWidth: '125px' }),
              $body: map(pos => {
                return $risk(pos)
              })
            },
            {
              $head: $text('PnL-$'),
              sortBy: 'realisedPnl',
              columnOp: style({ flex: 1.2, placeContent: 'flex-end', maxWidth: '110px' }),
              $body: map(pos => $ProfitLossText(pos.realisedPnl))
            },
          ],
        })({
          scrollIndex: tableTopPnlRequestTether(),
          // sortBy: tableTopSettledsortByChangeTether()
        }),





      ),
    ),

    {
      requestLeaderboardTopList: tableRequestState,
    }
  ]
})

