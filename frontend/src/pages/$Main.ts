import { Behavior, fromCallback, replayLatest } from "@aelea/core"
import { component, eventElementTarget, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, designSheet, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import {
  ADDRESS_LEVERAGE,
  ETH_ADDRESS_REGEXP, fromJson, groupByMap, IAccountSummary, IAccountTradeListParamApi, IChainParamApi,
  ILeaderboardRequest, intervalInMsMap, IPageParapApi, IPricefeed, IPricefeedParamApi, IPriceLatestMap, ITradeOpen
} from '@gambitdao/gmx-middleware'
import { initWalletLink } from "@gambitdao/wallet-link"
import {
  awaitPromises, constant, map, merge, mergeArray, multicast, now,
  startWith, switchLatest, tap
} from '@most/core'
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { $MainMenu } from '../components/$MainMenu'
import * as wallet from "../logic/provider"
import { WALLET } from "../logic/provider"
import { helloBackend } from '../logic/websocket'
import { IAccountStakingStore, ITreasuryStore } from "@gambitdao/gbc-middleware"
import { $BerryPage } from "./$Berry"
import { $Profile } from "./$Profile"
import { $Treasury } from "./$Treasury"
import { $seperator2 } from "./common"
import { $LabLanding } from "./lab/$Landing"
import { fadeIn } from "../transitions/enter"
import { $Wardrobe } from "./lab/$Wardrobe"
import { $LabStore } from "./lab/$Store"
import { $LabItem } from "./lab/$Item"
import { $Home } from "./$Home"
import { $ProfileWallet } from "./$ProfileWallet"
import { $Leaderboard } from "./$Leaderboard"
import { $Trade } from "./$Trade"



const popStateEvent = eventElementTarget('popstate', window)
const initialLocation = now(document.location)
const requestRouteChange = merge(initialLocation, popStateEvent)
const locationChange = map((location) => {
  return location
}, requestRouteChange)

interface Website {
  baseRoute?: string
}


export default ({ baseRoute = '' }: Website) => component((
  [routeChanges, linkClickTether]: Behavior<any, string>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,

  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<IAccountTradeListParamApi, IAccountTradeListParamApi>,
  [requestLeaderboardTopList, requestLeaderboardTopListTether]: Behavior<ILeaderboardRequest, ILeaderboardRequest>,
  [requestPricefeed, requestPricefeedTether]: Behavior<IPricefeedParamApi, IPricefeedParamApi>,
  [requestLatestPriceMap, requestLatestPriceMapTether]: Behavior<IChainParamApi, IChainParamApi>,
) => {

  const changes = merge(locationChange, multicast(routeChanges))
  const fragmentsChange = map(() => {
    const trailingSlash = /\/$/
    const relativeUrl = location.href.replace(trailingSlash, '').split(document.baseURI.replace(trailingSlash, ''))[1]
    const frags = relativeUrl.split('/')
    frags.splice(0, 1, baseRoute)
    return frags
  }, changes)


  const rootRoute = router.create({ fragment: baseRoute, title: 'GMX Blueberry Club', fragmentsChange })
  const pagesRoute = rootRoute.create({ fragment: 'p', title: '' })
  const treasuryRoute = pagesRoute.create({ fragment: 'treasury', title: 'Treasury' })
  const berryRoute = pagesRoute.create({ fragment: 'berry' }).create({ fragment: /\d+/, title: 'Berry' })
  const profileRoute = pagesRoute.create({ fragment: 'profile', title: 'Berry Account' }).create({ fragment: ETH_ADDRESS_REGEXP })
  const profileWalletRoute = pagesRoute.create({ fragment: 'wallet', title: 'Wallet Account' })
  const labRoute = pagesRoute.create({ fragment: 'lab', title: 'Blueberry Lab' })
  const leaderboardRoute = pagesRoute.create({ fragment: 'leaderboard', title: 'Leaderboard' })
  const wardrobeRoute = pagesRoute.create({ fragment: 'wardrobe', title: 'Wardrobe' })
  const storeRoute = pagesRoute.create({ fragment: 'lab-store', title: 'Store' })
  const itemRoute = pagesRoute.create({ fragment: 'item' }).create({ fragment: /\d+/, title: 'Lab Item' })
  const tradeRoute = pagesRoute.create({ fragment: 'trade' })




  const clientApi = helloBackend({
    requestLeaderboardTopList,
    requestPricefeed,
    requestLatestPriceMap,
    requestAccountTradeList
  })

  const latestPriceMap = replayLatest(multicast(map((res: IPriceLatestMap) => Object.entries(res).reduce((seed, [key, price]) => {
    const k = key as ADDRESS_LEVERAGE
    seed[k] = fromJson.priceLatestJson(price)
    return seed
  }, {} as IPriceLatestMap), clientApi.requestLatestPriceMap)))

  // localstorage
  const rootStore = state.createLocalStorageChain('ROOT')
  const walletStore = rootStore<WALLET, 'walletStore'>('walletStore', WALLET.none)
  const treasuryStore = rootStore<ITreasuryStore, 'treasuryStore'>('treasuryStore', { startedStakingGlpTimestamp: 1639431367, startedStakingGmxTimestamp: 1639432924 - intervalInMsMap.MIN5 })
  const accountStakingStore = rootStore<IAccountStakingStore, 'treasuryStore'>('treasuryStore', {})

  const chosenWalletName = now(walletStore.state)
  const defaultWalletProvider: Stream<IEthereumProvider | null> = multicast(switchLatest(awaitPromises(map(async name => {
    const isWC = name === WALLET.walletConnect
    const provider = isWC ? wallet.walletConnect : await wallet.metamaskQuery

    if (name && provider) {
      const [mainAccount]: string[] = await provider.request({ method: 'eth_accounts' }) as any

      if (mainAccount) {
        if (isWC) {
          const connector = wallet.walletConnect.connector
          const wcDisconnected = constant(null, fromCallback(cb => connector.on('disconnect', cb)))

          return startWith(provider, wcDisconnected)
        }

        return now(provider)
      }
    }

    return now(null)
  }, chosenWalletName))))



  const walletLink = initWalletLink(
    replayLatest(multicast(mergeArray([defaultWalletProvider, tap(console.log, walletChange)])))
  )




  return [

    $column(designSheet.main, style({ alignItems: 'center', gap: screenUtils.isDesktopScreen ? '85px' : '55px', overflowX: 'hidden', placeContent: 'center', padding: screenUtils.isMobileScreen ? '0 15px' : '0 55px' }))(

      $column(style({ gap: screenUtils.isDesktopScreen ? '85px' : '55px' }))(
        $column(
          $MainMenu({ walletLink, parentRoute: rootRoute, walletStore })({
            routeChange: linkClickTether(),
            walletChange: walletChangeTether()
          }),

          style({ margin: '0 -100vw' }, $seperator2),
        ),

        $column(layoutSheet.spacingBig, style({ margin: '0 auto', maxWidth: '1080px', gap: screenUtils.isDesktopScreen ? '85px' : '55px', width: '100%' }))(
          router.match(rootRoute)(
            $Home({
              walletLink,
              parentRoute: pagesRoute,
              treasuryStore,
              walletStore
            })({
              routeChanges: linkClickTether(),
              walletChange: walletChangeTether()
            })
          ),

          router.contains(pagesRoute)(
            $column(layoutSheet.spacingBig, style({ margin: '0 auto', maxWidth: '1080px', gap: screenUtils.isDesktopScreen ? '85px' : '55px', width: '100%', paddingBottom: '145px' }))(
              router.match(berryRoute)(
                $BerryPage({ walletLink, parentRoute: pagesRoute })({})
              ),
              router.match(labRoute)(
                fadeIn($LabLanding({ walletLink, parentRoute: labRoute, walletStore })({
                  changeRoute: linkClickTether(), walletChange: walletChangeTether()
                }))
              ),
              router.contains(storeRoute)(
                fadeIn($LabStore({ walletLink, parentRoute: storeRoute })({
                  changeRoute: linkClickTether()
                }))
              ),
              router.match(itemRoute)(
                fadeIn($LabItem({ walletLink, walletStore, parentRoute: itemRoute })({
                  changeRoute: linkClickTether()
                }))
              ),
              router.match(wardrobeRoute)(
                fadeIn($Wardrobe({ walletLink: walletLink, parentRoute: wardrobeRoute, walletStore })({ changeRoute: linkClickTether() }))
              ),
              router.match(profileRoute)(
                fadeIn($Profile({ walletLink, parentRoute: pagesRoute, accountStakingStore })({}))
              ),
              router.match(profileWalletRoute)(
                fadeIn($ProfileWallet({ walletLink, parentRoute: pagesRoute, accountStakingStore })({}))
              ),
              router.match(tradeRoute)(
                $Trade({
                  walletLink,
                  parentRoute: tradeRoute,
                  walletStore,
                  accountTradeList: map((res: ITradeOpen[]) => res.map(fromJson.toTradeJson), clientApi.requestAccountTradeList),
                  pricefeed: map((feed: IPricefeed[]) => feed.map(fromJson.pricefeedJson), clientApi.requestPricefeed),
                  latestPriceMap,
                  parentStore: rootStore,

                })({
                  requestPricefeed: requestPricefeedTether(),
                  requestAccountTradeList: requestAccountTradeListTether(),
                  requestLatestPriceMap: requestLatestPriceMapTether(),
                  changeRoute: linkClickTether(),
                  walletChange: walletChangeTether()
                })
              ),
              router.match(leaderboardRoute)(
                fadeIn($Leaderboard({
                  walletLink, parentRoute: pagesRoute, accountStakingStore,
                  leaderboardTopList: map((data: IPageParapApi<IAccountSummary>) => ({
                    page: data.page.map(fromJson.accountSummaryJson),
                    offset: data.offset,
                    pageSize: data.pageSize
                  }), clientApi.requestLeaderboardTopList)
                })({
                  requestLeaderboardTopList: requestLeaderboardTopListTether(),
                }))
              ),
              router.match(treasuryRoute)(
                $Treasury({ walletLink, parentRoute: treasuryRoute, treasuryStore })({})
              ),
            )
          ),
        )


      )

    )
  ]
})


