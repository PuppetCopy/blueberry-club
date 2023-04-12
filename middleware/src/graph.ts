import { O } from "@aelea/core"
import { hexValue } from "@ethersproject/bytes"
import {
  IIdentifiableEntity, IRequestPagePositionApi, pagingQuery,
  cacheMap, intervalTimeMap, gmxSubgraph, getMarginFees, BASIS_POINTS_DIVISOR, switchMap, groupByKey, getMappedValue, CHAIN_ADDRESS_MAP,
  formatFixed, getTokenAmount, readableNumber, USD_PERCISION, toAccountSummaryList, div, min, IAccountSummary
} from "@gambitdao/gmx-middleware"
import { awaitPromises, combine, map, now } from "@most/core"
import { ClientOptions, createClient, gql, OperationContext, TypedDocumentNode } from "@urql/core"
import { COMPETITION_METRIC_LIST, TOURNAMENT_DURATION, TOURNAMENT_TIME_ELAPSED } from "./config"
import { ILabItem, ILabItemOwnership, IOwner, IBlueberryLadder, IProfileTradingResult, IToken, IRequestCompetitionLadderApi } from "./types"


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


const MIN_ROI_THRESHOLD = 50n
const MIN_PNL_THRESHOLD = USD_PERCISION * 5n


function isWinner(summary: IAccountSummary) {
  return summary.pnl > MIN_PNL_THRESHOLD && div(summary.pnl, summary.maxCollateral) > MIN_ROI_THRESHOLD
}

export const competitionCumulative = O(
  map(async (queryParams: IRequestCompetitionLadderApi): Promise<IProfileTradingResult> => {

    const queryCache = cache('cacheKey', intervalTimeMap.MIN5, async () => {

      const tradeList = await gmxSubgraph.getCompetitionTrades(queryParams)
      const priceMap = await gmxSubgraph.getPriceMap(queryParams.to, queryParams)

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


      const averageMaxCollateral = totalMaxCollateral / activeWinnerCount
      const estSize = size * BigInt(TOURNAMENT_DURATION) / BigInt(TOURNAMENT_TIME_ELAPSED)

      const prizePool = getMarginFees(size) * 1500n / BASIS_POINTS_DIVISOR
      const estPrizePool = prizePool * BigInt(TOURNAMENT_DURATION) / BigInt(TOURNAMENT_TIME_ELAPSED)

      const totalScore = summaryList.reduce((s, n) => {
        const score = queryParams.metric === 'roi'
          ? div(n.pnl, n.maxCollateral > averageMaxCollateral ? n.maxCollateral : averageMaxCollateral)
          : n[queryParams.metric]
        
        return score > 0n ? s + score : s
      }, 0n)

      let connectedProfile: null | IBlueberryLadder = null


      const sortedCompetitionList: IBlueberryLadder[] = summaryList
        .map(summary => {
          const maxCollateral = summary.maxCollateral > averageMaxCollateral ? summary.maxCollateral : averageMaxCollateral
          const score = queryParams.metric === 'roi' ? div(summary.pnl, maxCollateral) : summary[queryParams.metric]

          const reward = estPrizePool * score / totalScore
          const prize = isWinner(summary) ? reward : 0n


          return {
            summary,
            prize,
            score
          }
        })
        .sort((a, b) => Number(b.score - a.score))
        .map(({ prize, score, summary }, idx) => {
          const tempSummary: IBlueberryLadder = {
            ...summary,
            profile: null,
            rank: idx + 1,
            prize, score

          }

          if (queryParams.account === summary.account) {
            connectedProfile = tempSummary
          }

          return tempSummary
        })


      if (TOURNAMENT_DURATION === TOURNAMENT_TIME_ELAPSED) {
        // log CSV file for airdrop

        const nativeToken = getMappedValue(CHAIN_ADDRESS_MAP, queryParams.chain).NATIVE_TOKEN

        console.log(
          'token_type,token_address,receiver,amount,id\n' + sortedCompetitionList
            .filter(x => {
              const prize = prizePool * x.score / totalScore
              return prize > USD_PERCISION * 5n
            })
            .map((x, idx) => {
              const ethPrice = BigInt(priceMap['_' + nativeToken])
              const prizeUsd = prizePool * x.score / totalScore
              const tokenAmount = formatFixed(getTokenAmount(prizeUsd, ethPrice, 18), 18)

              return `erc20,${nativeToken},${x.account},${readableNumber(tokenAmount)},`
            }).join('\n')
        )
      }

      return {
        sortedCompetitionList, averageMaxCollateral, estSize, estPrizePool,
        size, totalScore, prizePool, profile: connectedProfile as null | IBlueberryLadder
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
