import { O } from "@aelea/core"
import { hexValue } from "@ethersproject/bytes"
import { createSubgraphClient, groupByKey, IRequestCompetitionLadderApi, IIdentifiableEntity, IRequestPagePositionApi, pagingQuery, cacheMap, intervalTimeMap } from "@gambitdao/gmx-middleware"
import { getCompetitionCumulativeRoi } from "@gambitdao/gmx-middleware/src/graph"
import { awaitPromises, map } from "@most/core"
import { gql } from "@urql/core"
import { ILabItem, ILabItemOwnership, IOwner, IProfile, IProfileTradingList, IProfileTradingResult, IToken } from "./types"



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

export const tokenListSpecific = O(
  map(async (tokenList: number[]) => {

    const newLocal = `
{
  ${tokenList.map(id => `
token${id}: token(id: "${hexValue(id)}") {
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
  map(getProfilePickList),
  awaitPromises
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
      const accountList = await getCompetitionCumulativeRoi(queryParams)
      const profileList = await getProfilePickList(accountList.list.map(x => x.account).slice(0, 340))
      const profileMap = groupByKey(profileList, p => p.id)

      const sortedCompetitionList: IProfileTradingList[] = accountList.list
        .sort((a, b) => {
          const aN = profileMap[a.account] ? a.roi : a.roi - 100000000n
          const bN = profileMap[b.account] ? b.roi : b.roi - 100000000n
          return Number(bN - aN)
        })
        .map(summary => {

          return {
            ...summary,
            profile: profileMap[summary.account] || null,
            rank: queryParams.offset + accountList.list.indexOf(summary) + 1
          }
        })


      return { sortedCompetitionList, size: accountList.size }
    })

    const res = await queryCache

    return {
      list: pagingQuery(queryParams, res.sortedCompetitionList),
      size: res.size
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
profile${id}: profile(id: "${id}") {
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
