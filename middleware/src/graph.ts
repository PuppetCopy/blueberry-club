import { O } from "@aelea/core"
import { hexValue } from "@ethersproject/bytes"
import {
  IRequestCompetitionLadderApi, IIdentifiableEntity, IRequestPagePositionApi, pagingQuery,
  cacheMap, intervalTimeMap, toAccountCompetitionSummary, gmxSubgraph, getMarginFees, BASIS_POINTS_DIVISOR, switchMap,
  groupByKey
} from "@gambitdao/gmx-middleware"
import { awaitPromises, combine, map, now } from "@most/core"
import { ClientOptions, createClient, gql, OperationContext, TypedDocumentNode } from "@urql/core"
import { COMPETITION_METRIC_LIST, TOURNAMENT_DURATION, TOURNAMENT_TIME_ELAPSED } from "./config"
import { ILabItem, ILabItemOwnership, IOwner, IProfileTradingSummary, IProfileTradingResult, IToken } from "./types"


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


export const profileList = O(
  map(async (queryParams: Partial<IRequestPagePositionApi>) => {

    const res = await await querySubgraph(`
{
  profiles(first: ${queryParams.pageSize || 1000}, skip: ${queryParams.offset || 0}, orderBy: timestamp, orderDirection: desc) {
    id
    timestamp
    token {
      id
      owner
      labItems {
        id
      }
    }
    name
  }
}
`)

    return res.profiles.map(ownerJson) as IOwner[]
  })
)

export const ownerList = O(
  map(async (queryParams: {}) => {

    const res = await await querySubgraph(`
{
  owners(first: 1000) {
    id
    balance
    ownedLabItems {
      balance
      item {
        id
      }
      id
    }
    rewardClaimedCumulative
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
      name
    }
  }
}
`)


    return res.owners.map(ownerJson) as IOwner[]
  }),
  awaitPromises
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

      const competitionSummary = toAccountCompetitionSummary(tradeList, priceMap, queryParams.maxCollateral, queryParams.to)
      const sortedByList = competitionSummary.sort((a, b) => Number(b[queryParams.metric] - a[queryParams.metric]))


      const size = sortedByList.reduce((s, n) => s + n.cumSize, 0n)
      const estSize = sortedByList.reduce((s, n) => s + n.cumSize, 0n) * BigInt(TOURNAMENT_DURATION) / BigInt(TOURNAMENT_TIME_ELAPSED)
      const prizePool = getMarginFees(size) * 1500n / BASIS_POINTS_DIVISOR
      const estPrizePool = prizePool * BigInt(TOURNAMENT_DURATION) / BigInt(TOURNAMENT_TIME_ELAPSED)

      let profile2: null | IProfileTradingSummary = null
      let totalScore = 0n

      const sortedCompetitionList: IProfileTradingSummary[] = sortedByList
        .map(summary => {
          const rank = sortedByList.indexOf(summary) + 1
          const metric = summary[queryParams.metric]

          totalScore += metric > 0n ? metric : 0n

          const profileSummary: IProfileTradingSummary = {
            ...summary,
            profile: null,
            rank
          }

          if (queryParams.account === summary.account) {
            profile2 = profileSummary
          }

          return profileSummary
        })

      return {
        sortedCompetitionList, estSize, estPrizePool, size, totalScore, prizePool, profile: profile2 as null | IProfileTradingSummary }
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
