import { Behavior, combineArray, fromCallback, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, component, eventElementTarget, INode, style, styleInline } from "@aelea/dom"
import * as router from '@aelea/router'
import { $RouterAnchor } from '@aelea/router'
import { $column, $icon, $row, designSheet, layoutSheet, observer, screenUtils, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { TREASURY_ARBITRUM, TREASURY_AVALANCHE, USD_PRECISION } from "@gambitdao/gbc-middleware"
import { groupByMap, IAccountQueryParamApi, intervalInMsMap, ITimerange } from '@gambitdao/gmx-middleware'
import { initWalletLink } from "@gambitdao/wallet-link"
import {
  awaitPromises, constant, empty, fromPromise, map, merge, mergeArray, multicast, now,
  snapshot,
  startWith,
  switchLatest,
  take,
  tap
} from '@most/core'
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { $logo } from '../common/$icons'
import { $Breadcrumbs } from "../components/$Breadcrumbs"
import { $DisplayBerry } from "../components/$DisplayBerry"
import { $Link } from "../components/$Link"
import { $MainMenu, $socialMediaLinks } from '../components/$MainMenu'
import { $StakingGraph } from "../components/$StakingGraph"
import { $ButtonSecondary } from "../components/form/$Button"
import { $anchor, $card, $responsiveFlex, $teamMember } from "../elements/$common"
import { $bagOfCoins, $discount, $glp, $stackedCoins, $tofunft } from "../elements/$icons"
import { claimListQuery } from "../logic/claim"
import { latestTokenPriceMap, priceFeedHistoryInterval } from "../logic/common"
import { attributeMappings } from "../logic/gbcMappings"
import { arbitrumContract, avalancheContract } from "../logic/gbcTreasury"
import * as wallet from "../logic/provider"
import { WALLET } from "../logic/provider"
import { gmxGlpPriceHistory, queryArbitrumRewards, queryAvalancheRewards, StakedTokenArbitrum, StakedTokenAvalanche } from "../logic/query"
import { helloBackend } from '../logic/websocket'
import { IAccountStakingStore, IAttributeFaceAccessory, IIAttributeExpression, ITreasuryStore } from "../types"
import { $Berry } from "./$Berry"
import { $Account } from "./$Profile"
import { $Treasury } from "./$Treasury"
import { $seperator2 } from "./common"


function buildThresholdList(numSteps = 20) {
  const thresholds = []

  for (let i=1.0; i<=numSteps; i++) {
    const ratio = i/numSteps
    thresholds.push(ratio)
  }

  thresholds.push(0)
  return thresholds
}


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
  [leftEyeContainerPerspective, leftEyeContainerPerspectiveTether]: Behavior<INode, ResizeObserverEntry[]>,
  [rightEyeContainerPerspective, rightEyeContainerPerspectiveTether]: Behavior<INode, ResizeObserverEntry[]>,
  [intersectionObserver, intersectionObserverTether]: Behavior<INode, IntersectionObserverEntry[]>,

  // websocket communication
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
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
  const berryRoute = pagesRoute.create({ fragment: 'berry', title: 'Berry Profile' })
  const accountRoute = pagesRoute.create({ fragment: 'account', title: 'Berry Account' })


  const claimMap = replayLatest(
    map(list => groupByMap(list, item => item.account.toLowerCase()), claimListQuery())
  )


  const clientApi = helloBackend({

  })

  // localstorage
  const rootStore = state.createLocalStorageChain('ROOT')
  const walletStore = rootStore<WALLET, 'walletStore'>('walletStore', WALLET.none)
  const treasuryStore = rootStore<ITreasuryStore, 'treasuryStore'>('treasuryStore', { startedStakingGlpTimestamp: 1639431367, startedStakingGmxTimestamp: 1639432924 - intervalInMsMap.MIN5 })
  const accountStakingStore = rootStore<IAccountStakingStore, 'treasuryStore'>('treasuryStore', { })

  const chosenWalletName = now(walletStore.state)
  const defaultWalletProvider: Stream<IEthereumProvider | null> =  multicast(switchLatest(awaitPromises(map(async name => {
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




  const windowMouseMove = multicast(eventElementTarget('pointermove', window))


  const $eyeBall = $row(style({ position: 'relative', backgroundColor: 'white', placeContent: 'center', border: '6px solid black', alignItems: 'flex-end', padding: '2px', borderRadius: '50%', width: '40px', height: '40px' }))
  const $eyeInner = $node(style({ borderRadius: '50%', width: '8px', height: '8px', display: 'block', background: 'black' }))

  const gutterSpacingStyle = style({
    ...(screenUtils.isMobileScreen ? { flexDirection: 'column' } : { flexDirection: 'row', padding: '0 55px' }),
  })
  
  const eyeStylePosition = (eyeContainerPerspective: Stream<ResizeObserverEntry[]>) => styleInline(
    snapshot(([resizeObserverEntry], bb) => {
      const { left, top, width, height } = resizeObserverEntry.target.getBoundingClientRect()
      const x = left + (width / 2)
      const y = top + (height / 2)
      const rad = Math.atan2(x - bb.x, y - bb.y)
      const rot = (rad * (180 / Math.PI) * -1) + 180

      return {
        transform: `rotate(${rot}deg)`
      }
    }, eyeContainerPerspective, windowMouseMove)
  )
  

  

  const queryParams: IAccountQueryParamApi & Partial<ITimerange> = {
    from: treasuryStore.state.startedStakingGmxTimestamp || undefined,
    account: TREASURY_ARBITRUM
  }

  function dailyRandom(n: number, iterations = 100){
    for (let i = 0; i < iterations; i++) {
      n = (n ^ (n << 1) ^ (n >> 1)) % 10000
    }
    return n
  }

  const berryDayId = dailyRandom(Date.now() / intervalInMsMap.HR24)
  const [background, clothes, body, expression, faceAccessory, hat] = attributeMappings[berryDayId - 1]


  const arbitrumStakingRewards = replayLatest(multicast(arbitrumContract.stakingRewards))
  const avalancheStakingRewards = replayLatest(multicast(avalancheContract.stakingRewards))
  const pricefeedQuery = replayLatest(multicast(fromPromise(gmxGlpPriceHistory(queryParams))))
 
  const arbitrumYieldSourceMap = replayLatest(multicast(fromPromise(queryArbitrumRewards(queryParams))))
  const avalancheYieldSourceMap = replayLatest(multicast(fromPromise(queryAvalancheRewards({ ...queryParams, account: TREASURY_AVALANCHE }))))



  const GRAPHS_INTERVAL = Math.floor(intervalInMsMap.HR4 / 1000)

  const gmxArbitrumRS = priceFeedHistoryInterval(
    GRAPHS_INTERVAL,
    map(feedMap => feedMap.gmx, pricefeedQuery),
    map(staking => staking.stakes.filter(s => s.token === StakedTokenArbitrum.GMX || s.token === StakedTokenArbitrum.esGMX), arbitrumYieldSourceMap)
  )

  const glpArbitrumRS = priceFeedHistoryInterval(
    GRAPHS_INTERVAL,
    map(feedMap => feedMap.glpArbitrum, pricefeedQuery),
    map(staking => staking.stakes.filter(s => s.token === StakedTokenArbitrum.GLP), arbitrumYieldSourceMap)
  )

  const glpAvalancheRS = priceFeedHistoryInterval(
    GRAPHS_INTERVAL,
    map(feedMap => feedMap.glpAvalanche, pricefeedQuery),
    map(staking => staking.stakes.filter(s => s.token === StakedTokenAvalanche.GLP), avalancheYieldSourceMap)
  )

  const feeYieldClaim = combineArray((arbiStaking, avaxStaking) => [...arbiStaking.feeGlpTrackerClaims, ...arbiStaking.feeGmxTrackerClaims, ...avaxStaking.feeGlpTrackerClaims, ...avaxStaking.feeGmxTrackerClaims], arbitrumYieldSourceMap, avalancheYieldSourceMap)
  const newLocal = take(1, latestTokenPriceMap)
  const yieldClaim = combineArray((arbiStaking, avaxStaking, yieldFeeList, priceMap) => {
    // amountUsd from avalanche is not reflecting the real amount because the subraph's gmx price is 0
    // to fix this, we'll fetch arbitrum's price of GMX instead
    const avaxYieldGmx = [...avaxStaking.stakedGlpTrackerClaims, ...avaxStaking.stakedGmxTrackerClaims]
      .map(y => ({ ...y, amountUsd: y.amount * priceMap.gmx.value / USD_PRECISION }))

    return [
      ...yieldFeeList,
      ...avaxYieldGmx,
      ...arbiStaking.stakedGlpTrackerClaims,
      ...arbiStaking.stakedGmxTrackerClaims
    ]
  }, arbitrumYieldSourceMap, avalancheYieldSourceMap, feeYieldClaim, newLocal)


  return [

    $node(designSheet.main, style({ alignItems: 'center', overflowX: 'hidden',  placeContent: 'center', padding: screenUtils.isMobileScreen ? '0 15px': '' }))(
      router.match(rootRoute)(
        $column(style({ minHeight: '100vh', margin: '0 auto', maxWidth: '1256px', gap: '125px'  }))(

          $row(style({ width: '100%', padding: '30px 0 0', zIndex: 1000, borderRadius: '12px' }))(
            $row(layoutSheet.spacingBig, style({ alignItems: 'center', flex: 1 }))(
              $RouterAnchor({ url: '/', route: rootRoute, $anchor: $element('a')($icon({ $content: $logo, width: '55px', viewBox: '0 0 32 32' })) })({
                click: linkClickTether()
              }),
              $MainMenu({ walletLink, claimMap, parentRoute: pagesRoute, walletStore })({
                routeChange: linkClickTether(),
                walletChange: walletChangeTether()
              }),
            ),
          ),


          $node(gutterSpacingStyle, style({ display: 'flex', gap: '36px', placeContent: 'space-between' }))(
            $column(layoutSheet.spacingBig, style({ maxWidth: '620px' }))(
              $column(style({ fontSize: screenUtils.isMobileScreen ? '2.1em' : '3.1em' }))(
                $node(
                  $text(style({}))(`Welcome to the `),
                  $text(style({ fontWeight: 'bold' }))(`GMX Blueberry Club`),
                ),
              ),

              $text(style({ lineHeight: '1.5em' }))(`GBC is a generative NFT Collection of 10,000 Blueberries on Arbitrum dedicated to the GMX Decentralized Exchange and its amazing community. Each GBC is unique and algorithmically generated from 130+ hand drawn traits.`),

              // $node(),

              $seperator2,

              $row(style({ placeContent: 'space-evenly' }))(
                $anchor(layoutSheet.spacingSmall, style({ alignItems: 'center' }), attr({ href: `https://tofunft.com/collection/blueberryclub/items?category=fixed-price` }))(
                  $icon({
                    width: '40px',
                    $content: $tofunft,
                    viewBox: '0 0 32 32'
                  }),
                  $text(style({ paddingBottom: '6px' }))('Trade On TofuNFT')
                ),
                $anchor(layoutSheet.spacingSmall, style({ alignItems: 'center' }), attr({ href: `https://medium.com/@BlueberryClub/gbc-plans-for-2022-3ffe57e04087` }))(
                  $icon({
                    width: '40px',
                    $content: $logo,
                    viewBox: '0 0 32 32'
                  }),
                  $text(style({ paddingBottom: '6px' }))('Roadmap')
                ),
              )

            ),

            screenUtils.isDesktopScreen ? $column(
              $Link({
                url: `/p/berry/${berryDayId}`,
                route: berryRoute,
                $content: $row(style({ maxWidth: '460px', borderRadius: '38px', overflow: 'hidden', width: '100%', height: '460px', transformStyle: 'preserve-3d', perspective: '100px', position: 'relative', placeContent: 'center', alignItems: 'flex-end' }))(
                  $row(style({ alignSelf: 'flex-end', fontWeight: 'bold', position: 'absolute', right: '34px', top: '16px' }))(
                    $text(style({ paddingTop: '19px', paddingRight: '3px' }))('#'),
                    $text(style({ fontSize: '38px' }))(String(berryDayId))
                  ),
                  tap(({ element }) => {
                    element.querySelector('#wakka')?.remove()
                  }, $DisplayBerry({
                    size: '460px',
                    background,
                    clothes,
                    // expression,
                    expression: IIAttributeExpression.HAPPY,
                    // faceAccessory,
                    faceAccessory: IAttributeFaceAccessory.BUBBLEGUM,
                    hat
                  })({})),
                  $row(style({ position: 'absolute', width: '125px', marginLeft: '95px', placeContent: 'space-between', top: '221px' }))(
                    $eyeBall(leftEyeContainerPerspectiveTether(observer.resize()), eyeStylePosition(leftEyeContainerPerspective))(
                      $eyeInner()
                    ),
                    $eyeBall(rightEyeContainerPerspectiveTether(observer.resize()), eyeStylePosition(rightEyeContainerPerspective))(
                      $eyeInner()
                    ),
                  ),
                  $text(style({ color: '#000', backgroundColor: pallete.message, textAlign: 'center', padding: '9px 13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '15px', position: 'absolute', top: '17px', left: '30px' }))('Berry of the day')
                )
              })({
                click: linkClickTether()
              }),
              
            ) : empty()
          ),


          $column(style({ alignItems: 'center' }))(
            // $icon({ $content: $logo, width: '100px', viewBox: '0 0 32 32' }),

            $text(style({ fontWeight: 'bold', fontSize: '2.5em', margin: '25px 0px 30px', textAlign: 'center' }))('Treasury'),
            $StakingGraph({
              valueSource: [gmxArbitrumRS, glpArbitrumRS, glpAvalancheRS],
              stakingYield: yieldClaim,
              arbitrumStakingRewards,
              avalancheStakingRewards,
              walletLink,
              priceFeedHistoryMap: pricefeedQuery,
              graphInterval: GRAPHS_INTERVAL,
            })({}),
            
            $node(style({ margin: '20px 0' }))(),


            $Link({
              $content: $anchor(
                $ButtonSecondary({
                  $content: $text('Treasury Page')
                })({})
              ),
              url: '/p/treasury', route: treasuryRoute
            })({
              click: linkClickTether()
            }),
          ),

          $row(
            style({ position: 'relative', height: '173px' })
          )(
            $row(intersectionObserverTether(observer.intersection({ threshold: buildThresholdList(1000) }), multicast),
              style({ position: 'absolute', height: '100vh', width: '1px', right: 0, top: 0 })
            )(),
            $node(
              styleInline(
                map(([intersectionObserverEntry]) => {
                  const ratio = intersectionObserverEntry.intersectionRect.top === 0
                    ? Math.abs(intersectionObserverEntry.intersectionRatio - 1) + 1
                    : intersectionObserverEntry.intersectionRatio

                  const translateX = Math.abs(ratio) * (screenUtils.isDesktopScreen ? 8 : 85)
                  const backgroundPositionX = `-${translateX}vw`
                  return { backgroundPositionX }
                }, intersectionObserver)
              ),
              style({ backgroundImage: `url(/assets/roulette-preview.png)`, backgroundRepeat: 'no-repeat', backgroundSize: '2398px 173px', position: 'absolute', left: '-25vw', top: 0, bottom: 0, width: '2398px', height: '173px' }),
              
            )(),
          ),

          $column(layoutSheet.spacingBig)(
            $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
              $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('How does it work ?'),
              $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))('The collection is based on a treasury that grows exponentially over time'),
            ),
            $node(),

            $row(layoutSheet.spacingBig, style({ flexWrap: 'wrap' }), gutterSpacingStyle)(
              $card(style({ minWidth: '34%' }))(
                $icon({ $content: $glp, width: '42px', viewBox: '0 0 32 32' }),
                $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('$GLP'),
                $column(
                  $text('The GLP consists of an index of assets used for swap and leverage transactions on the GMX platform.'),
                  $text('GLP token earn Escrowed GMX rewards and 70% of platform fees distributed in ETH.'),
                )
              ),
              $card(style({ minWidth: '34%' }))(
                $icon({ $content: $bagOfCoins, width: '42px', viewBox: '0 0 32 32' }),
                $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Treasury'),
                $column(
                  $text('Fees from public sale minting will be used to create a GLP treasury which will provide benefits to the GMX platform and to the Blueberry Club. What will this treasury be used for? It will be up to the community to decide. '),
                )
              ),
              $card(style({ minWidth: '34%' }))(
                $icon({ $content: $discount, width: '42px', viewBox: '0 0 32 32' }),
                $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Royalties'),

                $text('There is a transaction fee on all GBC transactions. These fees are transferred directly to the GLP treasury. Platforms can apply additional fees, that is why we will create our own marketplace.'),
              ),
              $card(style({ minWidth: '34%' }))(
                $icon({ $content: $stackedCoins, width: '42px', viewBox: '0 0 32 32' }),
                $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Treasury Rewards'),
                $text('GLP token held in the GLP treasury earn rewards (esGMX and ETH) from GMX platform.'),
                $text('Most of the rewards will be compounded every week and another part will be used for marketing and development.'),
              )
            ),
          ),

          $row(style({ gap: '150px', position: 'relative' }))(
            $element('img')(
              attr({ src: `/assets/esgmx.svg`, }),
              style(screenUtils.isDesktopScreen ? { width: '435px' } : { position: 'absolute', right: 0, height: '108px' } )
            )(),
            $column(layoutSheet.spacingBig, style({ flex: 2, zIndex: 100 }))(
              $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Monthly esGMX Airdrop'),
              $text(`To support the project, the GMX team has decided to fully distribute 5,000 esGMX to the community at the end of each month!`),
              $element('ul')(layoutSheet.spacingBig, style({ display: 'flex', flexDirection: 'column', margin: 0 }))(
                $element('li')(
                  $text('Every week a snapshot is taken of each user’s staked GMX tokens as well as Blueberry NFT holdings'),
                ),
                $element('li')(
                  $text('At the end of the month, if a user has held the same Blueberry NFT for 4 weeks, they will recieve rewards from the reward pool based on the number of staked GMX tokens they have held during the snapshots'),
                )
              ),
              $text('Big shout out to the GMX team for providing this reward which will strengthen and unite the GMX community!'),
            ),
          ),


          $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
            $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Team'),
            $row(layoutSheet.spacingBig, style({ alignSelf: 'stretch', placeContent: 'space-evenly', flexWrap: 'wrap' }))(
              $teamMember({
                name :'xm92boi', title:"Founder & Designer"
              }),
              $teamMember({
                name :'0xAppodial', title:"Marketing"
              }),
              $teamMember({
                name :'itburnzz', title:"Web3 Dev"
              }),
              $teamMember({
                name :'destructioneth', title:"Contract Dev"
              }),
            )
          ),


          $responsiveFlex(layoutSheet.spacingBig)(
            $column(layoutSheet.spacingBig, style({ flex: .5 }))(
              $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Frequently asked  questions'),
              $text(style({ whiteSpace: 'pre-wrap', maxWidth: '878px' }))(`You can also contact us on our networks
(Use the dedicated NFT channel on discord)`),
              $socialMediaLinks
            ),
            $column(layoutSheet.spacingBig, style({ flex: 1 }))(
              $Breadcrumbs({
                $contentOp: style({}),
                sections: [
                  {
                    $title: $text('How to be eligible for the Monthly esGMX Airdrop?'),
                    $content: $text(`To get the Airdrop at the end of each month, you only need to hold 1 NFT and some Staked GMX from the beginning to the end of each month.`),
                  },
                  {
                    $title: $text('Does owning multiple GBCs increase my airdrop allocation?'),
                    $content: $text('No, the airdrop is only based on 1 GBC and Staked GMX'),
                  },
                  {
                    $title: $text('How to Buy a GBC ?'),
                    $content: $node(style({  }))(
                      $text('To join the Blueberry Club you must first transfer ETH to Arbitrum and Mint an NFT on our Website. You can also buy a GBC on secondary sale on TofuNFT.'),
                      $text('Follow this '),
                      $anchor(style({ display: 'inline' }), attr({ href: 'https://arbitrum.io/bridge-tutorial/' }))(
                        $text('tutorial')
                      ),
                      $text(' to transfer ETH to Arbitrum.')
                    ),
                  },
                  {
                    $title: $text('What’s my GBC used for?'),
                    $content: $text(`First of all your GBC is a proof of belonging to the Club/Community. It can be used as a profile picture on social networks, gives you access to governance voting (1 GBC = 1 Vote). Other features will come along and GBC's will be more and more useful in the future.`),
                  },
                ]
              })({}),
            ),
          ),

          $node(),


        )
      ),
      

      router.contains(pagesRoute)(
        $column(layoutSheet.spacingBig, style({ maxWidth: '1256px', width: '100%', margin: '0 auto', paddingBottom: '45px' }))(
          $row(style({ width: '100%', padding: '30px 0 0', zIndex: 1000, borderRadius: '12px' }))(
            $row(layoutSheet.spacingBig, style({ alignItems: 'center', flex: 1 }))(
              $RouterAnchor({ url: '/', route: rootRoute, $anchor: $element('a')($icon({ $content: $logo, width: '55px', viewBox: '0 0 32 32' })) })({
                click: linkClickTether()
              }),
              $MainMenu({ walletLink, claimMap, parentRoute: pagesRoute, walletStore })({
                routeChange: linkClickTether(),
                walletChange: walletChangeTether()
              }),
            ),
          ),

          $node(),

          $column(layoutSheet.spacingBig, style({ maxWidth: '1160px', width: '100%', margin: '0 auto', paddingBottom: '45px' }))(
            router.contains(berryRoute)(
              $Berry({ walletLink, parentRoute: pagesRoute })({})
            ),
            router.contains(accountRoute)(
              $Account({ walletLink, parentRoute: pagesRoute, accountStakingStore })({})
            ),
            router.contains(treasuryRoute)(
              $Treasury({ walletLink, parentRoute: treasuryRoute, treasuryStore })({})
            ),
          )
        )
      ),
    )
  ]
})


