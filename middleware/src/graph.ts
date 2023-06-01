import { O } from "@aelea/core"
import { hexValue } from "@ethersproject/bytes"
import {
  cacheMap, CHAIN_ADDRESS_MAP, div, formatFixed, getMappedValue, getTokenAmount, gmxSubgraph, groupByKey,
  IAccountSummary, IIdentifiableEntity, intervalTimeMap, IRequestPagePositionApi, pagingQuery, readableNumber, switchMap, toAccountSummaryList, USD_PERCISION
} from "@gambitdao/gmx-middleware"
import { awaitPromises, combine, map, now } from "@most/core"
import { ClientOptions, createClient, gql, OperationContext, TypedDocumentNode } from "@urql/core"
import { getCompetitionMetrics, isWinner } from "./common"
import { COMPETITION_METRIC_LIST } from "./config"
import { IBlueberryLadder, ILabItem, ILabItemOwnership, IOwner, IProfileTradingResult, IRequestCompetitionLadderApi, IToken } from "./types"


export const createSubgraphClient = (opts: ClientOptions) => {

  const client = createClient(opts)

  return async <Data, Variables extends object = {}>(document: TypedDocumentNode<Data, Variables>, params: Variables, context?: Partial<OperationContext>): Promise<Data> => {
    const result = await client.query(document, params, context)
      .toPromise()

    if (result.error) {
      throw new Error(result.error.message)
    }

    return result.data!
  }
}



export const blueberrySubgraph = createSubgraphClient({
  fetch: fetch,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/blueberry-club-arbitrum',
})

const cache = cacheMap({})

export async function querySubgraph(document: string): Promise<any> {
  return blueberrySubgraph(gql(document) as any, {})
}


export const ownerList = O(
  map(async (queryParams: Partial<IRequestPagePositionApi>) => {

    const res = await await querySubgraph(`
{
  owners(first: ${queryParams.pageSize || 1000}, skip: ${queryParams.offset || 0}, orderDirection: asc) {
    id
    balance
    ownedLabItems(first: 1000) {
      balance
      id
    }
    ownedTokens(first: 1000) {
      id
      labItems {
        id
      }
    }
    profile {
      id
      labItems {
        id
      }
    }
  }
}
`)


    return res.owners.map(ownerJson) as IOwner[]
  })
)

export const owner = O(
  map(async (queryParams: IIdentifiableEntity) => {

    const res = await await querySubgraph(`
{
  owner(id: "${queryParams.id.toLowerCase()}") {
    id
    balance
    ownedLabItems(first: 1000) {
      balance
      id
    }
    ownedTokens(first: 1000) {
      id
      labItems {
        id
      }
    }
    profile {
      id
      labItems {
        id
      }
    }
  }
}
`)

    return res.owner ? ownerJson(res.owner) : null
  })
)

export const token = O(
  map(async (queryParams: IIdentifiableEntity) => {

    const res = await await querySubgraph(`
{
  token(id: "${hexValue(Number(queryParams.id))}") {
    id
    owner {
      id
      balance
      ownedLabItems(first: 1000) {
        balance
        id
      }
      rewardClaimedCumulative
      ownedTokens(first: 1000) {
        id
        labItems {
          id
        }
      }
      profile {
        id
        labItems {
          id
        }
      }
    }
    transfers {
      id
      token
      from {
        id
      }
      to {
        id
      }
      timestamp
      transaction {
        id
      }
    }
    labItems {
      id
    }
  }
}
`)


    return tokenJson(res.token)
  })
)

export const tokenListPick = O(
  map(async (tokenList: number[]) => {

    const newLocal = `
{
  ${tokenList.map(id => `
_${id}: token(id: "${hexValue(id)}") {
  id
  labItems {
    id
  }
}
  `).join('')}
}
`
    const res = await querySubgraph(newLocal)
    const rawList: IToken[] = Object.values(res)

    return rawList.map(token => tokenJson(token))
  })
)

export const profilePickList = O(
  map(getProfilePickList)
)






export const competitionCumulative = O(
  map(async (queryParams: IRequestCompetitionLadderApi): Promise<IProfileTradingResult> => {

    const queryCache = cache('cacheKey', intervalTimeMap.MIN5, async () => {

      const tradeList = await gmxSubgraph.getCompetitionTrades(queryParams)
      const priceMap = await gmxSubgraph.getPriceMap(queryParams.to, queryParams)
      // const weth = ERC20__factory.connect(ARBITRUM_ADDRESS.NATIVE_TOKEN, w3p.provider).balanceOf('0xEd6265F1030186dd09cAEb1B827078aC0f6EE970').then(bn => bn.toBigInt())
      const summaryList = toAccountSummaryList(tradeList, priceMap, queryParams.maxCollateral, queryParams.to)

      const { size, activeWinnerCount, totalMaxCollateral } = summaryList.reduce((s, n) => {

        if (isWinner(n)) {
          s.activeWinnerCount++
          s.totalMaxCollateral += n.maxCollateral
        }

        if (n.pnl > s.pnl ? n.pnl : s.pnl) {
          s.pnl = n.pnl
          s.highestMaxCollateralBasedOnPnl = n.maxCollateral
        }



        s.size += n.cumSize


        return s
      }, { highestMaxCollateralBasedOnPnl: 0n, pnl: 0n, size: 0n, totalMaxCollateral: 0n, activeWinnerCount: 0n })


      const averageMaxCollateral = totalMaxCollateral ? totalMaxCollateral / activeWinnerCount : 0n
      const metrics = getCompetitionMetrics(size, queryParams.schedule)

      const totalScore = summaryList.reduce((s, n) => {
        const score = queryParams.metric === 'roi'
          ? div(n.pnl, n.maxCollateral > averageMaxCollateral ? n.maxCollateral : averageMaxCollateral)
          : n[queryParams.metric]

        return score > 0n ? s + score : s
      }, 0n)

      let connectedProfile: null | IBlueberryLadder = queryParams.account ? {
        account: queryParams.account,
        avgCollateral: 0n,
        avgLeverage: 0n,
        avgSize: 0n,
        cumCollateral: 0n,
        cumSize: 0n,
        maxCollateral: 0n,
        cumulativeLeverage: 0n,
        pnl: 0n,
        profile: null,
        rank: 0,
        score: 0n,
        openPnl: 0n,
        realisedPnl: 0n,
        fee: 0n,
        lossCount: 0,
        winCount: 0,
      } : null


      const sortedCompetitionList: IBlueberryLadder[] = summaryList
        .map(summary => {
          const maxCollateral = summary.maxCollateral > averageMaxCollateral ? summary.maxCollateral : averageMaxCollateral
          const score = queryParams.metric === 'roi' ? div(summary.pnl, maxCollateral) : summary[queryParams.metric]

          return {
            summary,
            score
          }
        })
        .sort((a, b) => Number(b.score - a.score))
        .map(({ score, summary }, idx) => {
          const tempSummary: IBlueberryLadder = {
            ...summary,
            profile: null,
            rank: idx + 1,
            score

          }

          if (queryParams.account === summary.account) {
            connectedProfile = {
              ...connectedProfile,
              ...tempSummary
            }
          }

          return tempSummary
        })


      if (queryParams.schedule.duration === queryParams.schedule.elapsed) {
        // log CSV file for airdrop
        const nativeToken = getMappedValue(CHAIN_ADDRESS_MAP, queryParams.chain).NATIVE_TOKEN

        console.log(
          'token_type,token_address,receiver,amount,id\n' + sortedCompetitionList
            .filter(x => {
              const prize = metrics.feePool * x.score / totalScore
              return prize > USD_PERCISION
            })
            .map((x, idx) => {
              const ethPrice = BigInt(priceMap['_' + nativeToken])
              const prizeUsd = metrics.feePool * x.score / totalScore
              const tokenAmount = formatFixed(getTokenAmount(prizeUsd, ethPrice, 18), 18)

              return `erc20,${nativeToken},${x.account},${readableNumber(tokenAmount)},`
            }).join('\n')
        )
      }

      return {
        sortedCompetitionList, averageMaxCollateral, size, totalScore, metrics,
        profile: connectedProfile as null | IBlueberryLadder
      }
    })

    const res = await queryCache



    if (COMPETITION_METRIC_LIST.indexOf(queryParams.selector as any) > -1 && queryParams.direction === 'desc') {
      const spage = pagingQuery(queryParams, res.sortedCompetitionList)
      const { offset, pageSize } = spage

      if (spage.offset === 0 && res.profile !== null) {

        const idxProfile = spage.page.indexOf(res.profile)

        if (idxProfile > -1) {
          spage.page.splice(idxProfile, 1)
        }


        spage.page.unshift(res.profile)

        return {
          ...res,
          list: { offset, pageSize: pageSize + (idxProfile === -1 ? 1 : 0), page: spage.page }
        }
      }

      return {
        ...res,
        list: { offset, pageSize, page: spage.page }
      }
    }


    return {
      ...res,
      list: pagingQuery(queryParams, res.sortedCompetitionList)
    }
  }),
  awaitPromises,
  switchMap(res => {
    const accountList = res.list.page.map(a => a.account)
    return combine((gbcList, ensList): IProfileTradingResult => {
      const gbcListMap = groupByKey(gbcList.filter(x => x?.id), x => x.id)
      const ensListMap = groupByKey(ensList, x => x.domain.resolvedAddress.id)

      const page = res.list.page.map(summary => {
        const profile = gbcListMap[summary.account]
        const ens = ensListMap[summary.account]

        return { ...summary, profile: profile ? { ...profile, ens } : null }
      })


      return {
        ...res,
        list: {
          ...res.list,
          page: page
        }
      }
    }, awaitPromises(profilePickList(now(accountList))), awaitPromises(gmxSubgraph.getEnsProfileListPick(now(accountList))))
  })
)





async function getProfilePickList(idList: string[]): Promise<IOwner[]> {
  if (idList.length === 0) {
    return []
  }


  const doc = `
{
  ${idList.map(id => `
_${id}: owner(id: "${id}") {
    id
    ownedLabItems {
      balance
      item {
        id
      }
      id
    }
    ownedTokens {
      id
      labItems {
        id
      }
    }
    profile {
      id
      labItems {
        id
      }
    }

}
  `).join('')}
}
`
  const res = await querySubgraph(doc)
  const rawList: IOwner[] = Object.values(res)

  return rawList.filter(x => x !== null).map(token => ownerJson(token))
}



function labItemJson(obj: ILabItem): ILabItem {
  return {
    ...obj
  }
}

function tokenJson(obj: IToken): IToken {
  return {
    ...obj,
    labItems: obj.labItems.map(labItemJson),
    owner: obj.owner ? ownerJson(obj.owner) : obj.owner,
    id: Number(obj.id)
  }
}

function ownerJson(obj: IOwner): IOwner {
  const ownedTokens = obj.ownedTokens.map(t => tokenJson(t))

  const newLocal = obj.ownedLabItems.map((json): ILabItemOwnership => {
    return { ...json, balance: BigInt(json.balance), item: { ...json.item, id: Number(json.id) } }
  })

  return {
    ...obj,
    profile: obj.profile ? tokenJson(obj.profile) : null,
    ownedTokens,
    ownedLabItems: newLocal
  }
}
