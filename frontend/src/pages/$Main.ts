import { Behavior, fromCallback, O, replayLatest } from "@aelea/core"
import { component, eventElementTarget, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, designSheet, layoutSheet, screenUtils } from '@aelea/ui-components'
import {
  ADDRESS_LEVERAGE,
  api,
  ETH_ADDRESS_REGEXP, fromJson, groupByMap, IAccountTradeListParamApi, IChainParamApi,
  ILeaderboardRequest, intervalTimeMap, IPricefeed, IPricefeedParamApi, IPriceLatestMap, IRequestTradeQueryparam, ITrade, ITradeOpen
} from '@gambitdao/gmx-middleware'
import { initWalletLink } from "@gambitdao/wallet-link"
import {
  awaitPromises, constant, map, merge, mergeArray, multicast, now,
  startWith, switchLatest
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
import { $LabHome } from "./lab/$Home"
import { fadeIn } from "../transitions/enter"
import { $Wardrobe } from "./lab/$Wardrobe"
import { $LabStore } from "./lab/$Store"
import { $LabItem } from "./lab/$Item"
import { $Home } from "./$Home"
import { $ProfileWallet } from "./$ProfileWallet"
import { $Trade } from "./$Trade"
import { createLocalStorageChain } from "../logic/store"

const GBC_APP_VERSION = '0.1'

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
  // [requestTradePricefeed, requestTradePricefeedTether]: Behavior<IPricefeedParamApi, IPricefeedParamApi>,
  [requestLatestPriceMap, requestLatestPriceMapTether]: Behavior<IChainParamApi, IChainParamApi>,
  [requestTrade, requestTradeTether]: Behavior<IRequestTradeQueryparam, IRequestTradeQueryparam>,
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




  const serverApi = helloBackend({
    // requestLeaderboardTopList,
    // requestPricefeed,
    // requestLatestPriceMap,
    // requestTrade,
    // requestAccountTradeList
  })

  const clientApi = {
    ...serverApi,

    requestLatestPriceMap: map(json => groupByMap(json.map(fromJson.priceLatestJson), price => price.id), api.latestPriceMap(requestLatestPriceMap)),
    requestTrade: map(json => json ? fromJson.toTradeJson(json) : null, api.trade(requestTrade)),
    pricefeed: map(json => json.map(fromJson.pricefeedJson), api.pricefeed(requestPricefeed)),
    accountTradeList: map(json => json.map(fromJson.toTradeJson), api.accountTradeList(requestAccountTradeList)),
    latestPriceMap: map(json => json.map(fromJson.priceLatestJson), api.latestPriceMap(requestAccountTradeList)),
  }



  const latestPriceMap = replayLatest(multicast(map((res: IPriceLatestMap) => Object.entries(res).reduce((seed, [key, price]) => {
    const k = key as ADDRESS_LEVERAGE
    seed[k] = fromJson.priceLatestJson(price)
    return seed
  }, {} as IPriceLatestMap), clientApi.requestLatestPriceMap)))

  // localstorage state
  const store = createLocalStorageChain('ROOT', GBC_APP_VERSION)
  const walletStore = store.craete<WALLET, 'walletStore'>('walletStore', WALLET.none)
  const treasuryStore = store.craete<ITreasuryStore, 'treasuryStore'>('treasuryStore', { startedStakingGlpTimestamp: 1639431367, startedStakingGmxTimestamp: 1639432924 - intervalTimeMap.MIN5 })
  const accountStakingStore = store.craete<IAccountStakingStore, 'treasuryStore'>('treasuryStore', {})

  const chosenWalletName = now(walletStore.state)
  const defaultWalletProvider: Stream<IEthereumProvider | null> = multicast(switchLatest(awaitPromises(map(async name => {
    const isWC = name === WALLET.walletConnect
    const provider = isWC ? wallet.walletConnect : await wallet.metamaskQuery

    if (name && provider) {
      const [mainAccount]: string[] = await provider.request({ method: 'eth_accounts' }) as any

      if (mainAccount) {
        if (isWC) {
          const connector = wallet.walletConnect
          const wcDisconnected = constant(null, fromCallback(cb => connector.on('disconnect', cb)))

          return startWith(provider, wcDisconnected)
        }

        return now(provider)
      }
    }

    return now(null)
  }, chosenWalletName))))



  const walletLink = initWalletLink(
    replayLatest(multicast(mergeArray([defaultWalletProvider, walletChange])))
  )




  return [

    $column(designSheet.main, style({ fontWeight: 400, alignItems: 'center', gap: screenUtils.isDesktopScreen ? '85px' : '55px', overflowX: 'hidden', placeContent: 'center', padding: screenUtils.isMobileScreen ? '0 15px' : '0 55px' }))(

      $column(style({ gap: '45px' }))(
        $column(
          $MainMenu({ walletLink, parentRoute: rootRoute, walletStore })({
            routeChange: linkClickTether(),
            walletChange: walletChangeTether()
          }),

          style({ margin: '0 -100vw' }, $seperator2),
        ),


        router.match(rootRoute)(
          $column(layoutSheet.spacingBig, style({ margin: '0 auto', maxWidth: '1080px', gap: screenUtils.isDesktopScreen ? '85px' : '55px', width: '100%' }))(
            $Home({
              walletLink,
              parentRoute: pagesRoute,
              treasuryStore,
              walletStore
            })({ routeChanges: linkClickTether() })
          )
        ),



        router.contains(pagesRoute)(
          $column(layoutSheet.spacingBig, style({ margin: '0 auto', maxWidth: '1080px', gap: screenUtils.isDesktopScreen ? '85px' : '55px', width: '100%' }))(
            router.match(berryRoute)(
              $BerryPage({ walletLink, parentRoute: pagesRoute })({
                changeRoute: linkClickTether()
              })
            ),
            router.match(labRoute)(
              fadeIn($LabHome({ walletLink, parentRoute: labRoute, walletStore })({
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
                changeRoute: linkClickTether(), walletChange: walletChangeTether()
              }))
            ),
            router.match(wardrobeRoute)(
              fadeIn($Wardrobe({ walletLink: walletLink, parentRoute: wardrobeRoute, walletStore })({
                changeRoute: linkClickTether(),

              }))
            ),
            router.match(profileRoute)(
              fadeIn($Profile({ walletLink, parentRoute: pagesRoute, accountStakingStore })({}))
            ),
            router.match(profileWalletRoute)(
              fadeIn($ProfileWallet({ walletLink, parentRoute: pagesRoute, accountStakingStore })({ changeRoute: linkClickTether() }))
            ),
            router.match(tradeRoute)(
              $Trade({
                walletLink,
                parentRoute: tradeRoute,
                walletStore,
                accountTradeList: clientApi.accountTradeList,
                pricefeed: clientApi.pricefeed,
                latestPriceMap,
                store,
                trade: clientApi.requestTrade
              })({
                requestPricefeed: requestPricefeedTether(),
                // requestTradePricefeed: requestTradePricefeedTether(),
                requestAccountTradeList: requestAccountTradeListTether(),
                requestLatestPriceMap: requestLatestPriceMapTether(),
                changeRoute: linkClickTether(),
                walletChange: walletChangeTether(),
                requestTrade: requestTradeTether()
              })
            ),
            router.match(treasuryRoute)(
              $Treasury({ walletLink, parentRoute: treasuryRoute, treasuryStore })({})
            ),
          )
        ),



      )

    )
  ]
})

