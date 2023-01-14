import { O } from "@aelea/core"
import { hexValue } from "@ethersproject/bytes"
import { createSubgraphClient, gmxSubgraph, groupByMap, ICompetitionLadderRequest, IIdentifiableEntity, IPagePositionParamApi, pagingQuery } from "@gambitdao/gmx-middleware"
import { awaitPromises, combine, map, now, switchLatest } from "@most/core"
import { gql } from "@urql/core"
import { ILabItem, ILabItemOwnership, IOwner, IProfile, IProfileTradingSummary, IToken } from "./types"



export const blueberrySubgraph = createSubgraphClient({
  fetch: fetch,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/blueberry-club-arbitrum',
})


export async function querySubgraph(document: string): Promise<any> {
  return blueberrySubgraph(gql(document) as any, {})
}


export const profileList = O(
  map(async (queryParams: Partial<IPagePositionParamApi>) => {

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
  map(async (idList: string[]) => {

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
  }),
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

export const competitionRoiAccountList = O(
  map((queryParams: ICompetitionLadderRequest) => {

    const accountSummaryList = gmxSubgraph.competitionCumulativeRoi(now(queryParams))

    return switchLatest(map(list => {
      const profileList = profilePickList(now(list.map(x => x.account)))

      const competitionSummaryProfileList = map(pl => {
        const profileMap = groupByMap(pl, p => p.id)
        const sortedCompetitionList: IProfileTradingSummary[] = list
          .map(summary => ({
            ...summary,
            profile: profileMap[summary.account] || null,
            rank: queryParams.offset + list.indexOf(summary) + 1
          }), pl)
          .sort((a, b) => {
            const aN = a.profile ? a.roi : a.roi - 100000000n
            const bN = b.profile ? b.roi : b.roi - 100000000n
            return Number(bN - aN)
          })
        return pagingQuery(queryParams, sortedCompetitionList)
      }, profileList)

      return competitionSummaryProfileList
    }, accountSummaryList))

  }),
  switchLatest
)




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
