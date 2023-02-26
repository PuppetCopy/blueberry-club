import { O } from "@aelea/core"
import { hexValue } from "@ethersproject/bytes"
import { createSubgraphClient, IRequestCompetitionLadderApi, IIdentifiableEntity, IRequestPagePositionApi, pagingQuery, cacheMap, intervalTimeMap, toAccountCompetitionSummary, gmxSubgraph, getMarginFees, BASIS_POINTS_DIVISOR } from "@gambitdao/gmx-middleware"
import { awaitPromises, map } from "@most/core"
import { gql } from "@urql/core"
import { ILabItem, ILabItemOwnership, IOwner, IProfile, IProfileTradingSummary, IProfileTradingResult, IToken } from "./types"



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

    return res.profiles.map(profileJson) as IProfile[]
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
    displayName
    rewardClaimedCumulative
    ownedTokens {
      id
      labItems {
        id
      }
    }
    profile {
      token {
        id
        labItems {
          id
        }
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
    displayName
    rewardClaimedCumulative
    ownedTokens(first: 1000) {
      id
      labItems {
        id
      }
    }
    profile {
      token {
        id
        labItems {
          id
        }
      }
      name
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
      displayName
      rewardClaimedCumulative
      ownedTokens(first: 1000) {
        id
        labItems {
          id
        }
      }
      profile {
        token {
          id
          labItems {
            id
          }
        }
        name
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

export const profile = O(
  map(async (queryParams: IIdentifiableEntity) => {
    const res = await await querySubgraph(`
{
  profile(id: "${queryParams.id}") {
    id
    timestamp
    token {
      id
      labItems {
        id
      }
    }
    name
  }
}
`)

    return res.profile ? profileJson(res.profile) : null
  })
)

export const competitionCumulativeRoi = O(
  map(async (queryParams: IRequestCompetitionLadderApi): Promise<IProfileTradingResult> => {

    const queryCache = cache('cacheKey', intervalTimeMap.MIN5, async () => {

      const tradeList = await gmxSubgraph.getCompetitionTrades(queryParams)
      const priceMap = await gmxSubgraph.getPriceMap(queryParams.to, queryParams)

      const competitionSummary = toAccountCompetitionSummary(tradeList, priceMap, queryParams.maxCollateral, queryParams.to)
      const sortedByList = competitionSummary.sort((a, b) => Number(b.roi - a.roi))


      let profile2: null | IProfileTradingSummary = null
      const size = sortedByList.reduce((s, n) => s + n.size, 0n)
      const prizePool = getMarginFees(size) * 1500n / BASIS_POINTS_DIVISOR

      let totalScore = 0n

      const sortedCompetitionList: IProfileTradingSummary[] = sortedByList
        .map(summary => {
          totalScore += summary.roi > 0n ? summary.roi : 0n

          const rank = sortedByList.indexOf(summary) + 1
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


      return { sortedCompetitionList, size, totalScore, prizePool,  profile: profile2 as null | IProfileTradingSummary }
    })

    const res = await queryCache



    if (queryParams.selector === 'roi' && queryParams.direction === 'desc') {
      const newLocal = pagingQuery(queryParams, res.sortedCompetitionList)
      const { offset, pageSize } = newLocal

      if (newLocal.offset === 0 && res.profile !== null) {
        const idxProfile = newLocal.page.indexOf(res.profile)
        if (idxProfile > -1) {
          newLocal.page.splice(idxProfile, 1)
        } else {
          newLocal.page.splice(newLocal.page.length - 1, 1)
        }

        newLocal.page.unshift(res.profile)
      }

      return {
        ...res,
        list: { offset, pageSize, page: newLocal.page }
      }
    }


    return {
      ...res,
      list: pagingQuery(queryParams, res.sortedCompetitionList)
    }
  }),
  awaitPromises
)



export const competitionCumulativePnl = O(
  map(async (queryParams: IRequestCompetitionLadderApi): Promise<IProfileTradingResult> => {

    const queryCache = cache('cacheKey', intervalTimeMap.MIN5, async () => {

      const tradeList = await gmxSubgraph.getCompetitionTrades(queryParams)
      const priceMap = await gmxSubgraph.getPriceMap(queryParams.to, queryParams)

      const competitionSummary = toAccountCompetitionSummary(tradeList, priceMap, queryParams.maxCollateral, queryParams.to)
      const sortedByList = competitionSummary.sort((a, b) => Number(b.pnl - a.pnl))


      let profile2: null | IProfileTradingSummary = null
      const size = sortedByList.reduce((s, n) => s + n.size, 0n)
      const prizePool = getMarginFees(size) * 1500n / BASIS_POINTS_DIVISOR

      let totalScore = 0n

      const sortedCompetitionList: IProfileTradingSummary[] = sortedByList
        .map(summary => {
          const rank = sortedByList.indexOf(summary) + 1
          totalScore += summary.pnl > 0n ? summary.pnl : 0n

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


      return { sortedCompetitionList, size, totalScore, prizePool, profile: profile2 as null | IProfileTradingSummary }
    })

    const res = await queryCache



    if (queryParams.selector === 'roi' && queryParams.direction === 'desc') {
      const newLocal = pagingQuery(queryParams, res.sortedCompetitionList)
      const { offset, pageSize } = newLocal

      if (res.profile !== null) {
        const idxProfile = newLocal.page.indexOf(res.profile)
        if (idxProfile > -1) {
          newLocal.page.splice(idxProfile, 1)
          newLocal.page.unshift(res.profile)
        }
      }

      return {
        ...res,
        list: { offset, pageSize, page: newLocal.page },
      }
    }


    return {
      ...res,
      list: pagingQuery(queryParams, res.sortedCompetitionList)
    }
  }),
  awaitPromises
)





async function getProfilePickList(idList: string[]): Promise<IProfile[]> {
  if (idList.length === 0) {
    return []
  }

  
  const doc = `
{
  ${idList.map(id => `
_${id}: profile(id: "${id}") {
    id
    timestamp
    name
    token {
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
  const rawList: IProfile[] = Object.values(res)

  return rawList.map(token => profileJson(token))
}

function profileJson(obj: IProfile): IProfile {
  return {
    ...obj,
    token: obj?.token ? tokenJson(obj.token) : null
  }
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
    profile: obj.profile ? profileJson(obj.profile) : null,
    ownedTokens,
    ownedLabItems: newLocal
  }
}
