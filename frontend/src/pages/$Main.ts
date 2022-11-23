import { Behavior, fromCallback, replayLatest } from "@aelea/core"
import { $element, $node, $text, component, eventElementTarget, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, designSheet, layoutSheet, screenUtils } from '@aelea/ui-components'
import {
  AddressIndex, AddressStable, api,
  ARBITRUM_ADDRESS, AVALANCHE_ADDRESS, CHAIN,
  ETH_ADDRESS_REGEXP, fromJson, groupByMap, IAccountTradeListParamApi, IChainParamApi,
  intervalTimeMap, IPricefeedParamApi, IPriceLatestMap, IRequestTradeQueryparam
} from '@gambitdao/gmx-middleware'
import { initWalletLink } from "@gambitdao/wallet-link"
import {
  awaitPromises, constant, empty, map, merge, mergeArray, multicast, now,
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
import { $ProfileConnected } from "./$ProfileConnected"
import { $Trade } from "./$Trade"
import { createLocalStorageChain } from "../logic/store"


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
  [requestPricefeed, requestPricefeedTether]: Behavior<IPricefeedParamApi, IPricefeedParamApi>,
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
  const TRADEURL = 'trade'
  const tradeRoute = pagesRoute.create({ fragment: TRADEURL })
  const tradeTermsAndConditions = pagesRoute.create({ fragment: 'trading-terms-and-conditions' })




  const serverApi = helloBackend({
    // requestLeaderboardTopList,
    // requestPricefeed,
    // requestLatestPriceMap,
    // requestTrade,
    // requestAccountTradeList
  })

  const clientApi = {
    ...serverApi,

    requestTrade: map(json => json ? fromJson.toTradeJson(json) : null, api.trade(requestTrade)),
    pricefeed: map(json => json.map(fromJson.pricefeedJson), api.pricefeed(requestPricefeed)),
    accountTradeList: map(json => json.map(fromJson.toTradeJson), api.accountTradeList(requestAccountTradeList)),
    latestPriceMap: map(json => json.map(fromJson.priceLatestJson), api.latestPriceMap(requestAccountTradeList)),
  }



  // localstorage state
  const store = createLocalStorageChain('ROOT', 'v1')
  const treasuryStore = store.craete('treasuryStore', { startedStakingGlpTimestamp: 1639431367, startedStakingGmxTimestamp: 1639432924 - intervalTimeMap.MIN5 } as ITreasuryStore)
  const accountStakingStore = store.craete('treasuryStore', {} as IAccountStakingStore)

  const walletStore = store.craete('walletStore', null as WALLET | null)

  const walletProvider: Stream<IEthereumProvider | null> = mergeArray([
    switchLatest(awaitPromises(map(async () => {
      const name = walletStore.getState()
      const isWC = name === WALLET.walletConnect
      const wp = isWC ? wallet.walletConnect : await wallet.metamaskQuery

      if (name && wp) {
        const [mainAccount]: string[] = await wp.request({ method: 'eth_accounts' }) as any

        if (mainAccount) {
          if (isWC) {
            const connector = wallet.walletConnect
            const wcDisconnected = constant(null, fromCallback(cb => connector.on('disconnect', cb)))

            return startWith(wp, wcDisconnected)
          }

          return now(wp)
        }
      }

      return now(null)
    }, now(null)))),
    walletChange
  ])



  const walletLink = initWalletLink(walletProvider)
  const $liItem = $element('li')(style({ marginBottom: '14px' }))


  return [

    $column(designSheet.main, style({ fontWeight: 400, alignItems: 'center', gap: screenUtils.isDesktopScreen ? '85px' : '55px', overflowX: 'hidden', placeContent: 'center', padding: screenUtils.isMobileScreen ? '0 15px' : '0 55px' }))(

      $column(style({ gap: '45px' }))(
        $column(
          $MainMenu({ walletLink, parentRoute: rootRoute, walletStore, chainList: [CHAIN.ARBITRUM, CHAIN.AVALANCHE] })({
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
              fadeIn($LabItem({ walletLink, chainList: [CHAIN.ARBITRUM], walletStore, parentRoute: itemRoute })({
                changeRoute: linkClickTether(), walletChange: walletChangeTether()
              }))
            ),
            router.match(wardrobeRoute)(
              fadeIn($Wardrobe({ chainList: [CHAIN.ARBITRUM], walletLink: walletLink, parentRoute: wardrobeRoute, walletStore })({
                changeRoute: linkClickTether(),

              }))
            ),
            router.match(profileRoute)(
              fadeIn($Profile({ walletLink, parentRoute: pagesRoute, accountStakingStore })({}))
            ),
            router.match(profileWalletRoute)(
              fadeIn($ProfileConnected({ walletLink, parentRoute: pagesRoute, accountStakingStore })({ changeRoute: linkClickTether() }))
            ),
            router.match(tradeRoute)(
              switchLatest(map(chain => {

                if (chain === null) {
                  return empty()
                }

                const indexTokens: AddressIndex[] = chain === CHAIN.ARBITRUM
                  ? [
                    ARBITRUM_ADDRESS.NATIVE_TOKEN,
                    ARBITRUM_ADDRESS.LINK,
                    ARBITRUM_ADDRESS.UNI,
                    ARBITRUM_ADDRESS.WBTC,
                  ]
                  : chain === CHAIN.AVALANCHE ?
                    [
                      AVALANCHE_ADDRESS.NATIVE_TOKEN,
                      AVALANCHE_ADDRESS.WETHE,
                      AVALANCHE_ADDRESS.WBTCE,
                      AVALANCHE_ADDRESS.BTCB,
                    ]
                    : []

                const stableTokens: AddressStable[] = chain === CHAIN.ARBITRUM ?
                  [
                    ARBITRUM_ADDRESS.USDC,
                    ARBITRUM_ADDRESS.USDT,
                    ARBITRUM_ADDRESS.DAI,
                    ARBITRUM_ADDRESS.FRAX,
                    // ARBITRUM_ADDRESS.MIM,
                  ]
                  : chain === CHAIN.AVALANCHE
                    ? [
                      AVALANCHE_ADDRESS.USDC,
                      AVALANCHE_ADDRESS.USDCE,
                      // AVALANCHE_ADDRESS.MIM,
                    ]
                    : []


                return $Trade({
                  chainList: [CHAIN.ARBITRUM, CHAIN.AVALANCHE],
                  chain,
                  stableTokens, indexTokens,
                  walletLink,
                  parentRoute: tradeRoute,
                  walletStore,
                  accountTradeList: clientApi.accountTradeList,
                  pricefeed: clientApi.pricefeed,
                  store
                })({
                  requestPricefeed: requestPricefeedTether(),
                  requestAccountTradeList: requestAccountTradeListTether(),
                  changeRoute: linkClickTether(),
                  walletChange: walletChangeTether(),
                })
              }, walletLink.network))
            ),
            router.match(tradeTermsAndConditions)(
              $column(layoutSheet.spacing, style({ maxWidth: '680px', alignSelf: 'center' }))(
                $text(style({ fontSize: '3em', textAlign: 'center' }))('GBC Trading'),
                $node(),
                $text(style({ fontSize: '1.5em', textAlign: 'center', fontWeight: 'bold' }))('Terms And Conditions'),
                $text(style({ whiteSpace: 'pre-wrap' }))(`By accessing, I agree that ${document.location.host + '/p/' + TRADEURL} is an interface (hereinafter the "Interface") to interact with external GMX smart contracts, and does not have access to my funds. I represent and warrant the following:`),
                $element('ul')(layoutSheet.spacing, style({ lineHeight: '1.5em' }))(
                  $liItem(
                    $text(`I am not a United States person or entity;`),
                  ),
                  $liItem(
                    $text(`I am not a resident, national, or agent of any country to which the United States, the United Kingdom, the United Nations, or the European Union embargoes goods or imposes similar sanctions, including without limitation the U.S. Office of Foreign Asset Control, Specifically Designated Nationals and Blocked Person List;`),
                  ),
                  $liItem(
                    $text(`I am legally entitled to access the Interface under the laws of the jurisdiction where I am located;`),
                  ),
                  $liItem(
                    $text(`I am responsible for the risks using the Interface, including, but not limited to, the following: (i) the use of GMX smart contracts; (ii) leverage trading, the risk may result in the total loss of my deposit.`),
                  ),
                ),

                $node(style({ height: '100px' }))(),

              ),

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

