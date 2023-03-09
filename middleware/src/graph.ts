import { O } from "@aelea/core"
import { hexValue } from "@ethersproject/bytes"
import {
  IRequestCompetitionLadderApi, IIdentifiableEntity, IRequestPagePositionApi, pagingQuery,
  cacheMap, intervalTimeMap, toAccountCompetitionSummary, gmxSubgraph, getMarginFees, BASIS_POINTS_DIVISOR, switchMap,
  groupByKey, div, getTokenAmount, readableNumber, formatFixed, getMappedValue, CHAIN_ADDRESS_MAP
} from "@gambitdao/gmx-middleware"
import { awaitPromises, combine, map, now } from "@most/core"
import { ClientOptions, createClient, gql, OperationContext, TypedDocumentNode } from "@urql/core"
import { ILabItem, ILabItemOwnership, IOwner, IProfile, IProfileTradingSummary, IProfileTradingResult, IToken } from "./types"


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

export const competitionCumulative = O(
  map(async (queryParams: IRequestCompetitionLadderApi): Promise<IProfileTradingResult> => {

    const queryCache = cache('cacheKey', intervalTimeMap.MIN5, async () => {

      const tradeList = await gmxSubgraph.getCompetitionTrades(queryParams)
      const priceMap = await gmxSubgraph.getPriceMap(queryParams.to, queryParams)

      const competitionSummary = toAccountCompetitionSummary(tradeList, priceMap, queryParams.maxCollateral, queryParams.to)
      const sortedByList = competitionSummary.sort((a, b) => Number(b[queryParams.metric] - a[queryParams.metric]))

      const size = sortedByList.reduce((s, n) => s + n.cumSize, 0n)
      const prizePool = getMarginFees(size) * 1500n / BASIS_POINTS_DIVISOR

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

      // const prizeRatioLadder: bigint[] = [3000n, 1500n, 750n, ...Array(17).fill(div(4750n, 17n) / BASIS_POINTS_DIVISOR)]


      // log CSV file for airdrop
      // erc20,0x82aF49447D8a07e3bd95BD0d56f35241523fBab1,0xac6fac7f4081852d7d485b78a8e574d6267c6e66,53.998590801480455323,

      // const nativeToken = getMappedValue(CHAIN_ADDRESS_MAP, queryParams.chain).NATIVE_TOKEN
      // console.log(
      //   'token_type,token_address,receiver,amount,id\n'  + sortedCompetitionList
      //     // .filter(x => {
      //     //   return x.profile !== null
      //     // })
      //     .slice(0, 20).map((x, idx) => {
      //       const ethPrice = BigInt(priceMap['_' + nativeToken])
      //       const prizeRatio = prizeRatioLadder[idx]
      //       const prizeUsd = prizePool * prizeRatio / BASIS_POINTS_DIVISOR
      //       const tokenAmount = formatFixed(getTokenAmount(prizeUsd, ethPrice, 18), 18)

      //       return `erc20,${nativeToken},${x.account},${readableNumber(tokenAmount)},`
      //     }).join('\n')
      // )


      return { sortedCompetitionList, size, totalScore, prizePool, profile: profile2 as null | IProfileTradingSummary }
    })

    const res = await queryCache



    if (queryParams.selector === 'roi' && queryParams.direction === 'desc') {
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
