import { Behavior, combineArray, replayLatest } from "@aelea/core"
import { $Branch, $element, $node, $svg, $text, attr, component, eventElementTarget, INode, style, styleInline, stylePseudo } from "@aelea/dom"
import { $RouterAnchor, Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, observer, screenUtils, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IAccountQueryParamApi, IClaim, intervalInMsMap, ITimerangeParamApi } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $anchor, $glp, $Link } from "@gambitdao/ui-components"
import { empty, fromPromise, map, multicast, snapshot, take, tap } from "@most/core"
import { $card, $responsiveFlex, $teamMember } from "../elements/$common"

import { $logo } from "../common/$icons"
import { BI_18_PRECISION, GBC_ADDRESS, IAttributeExpression, ITreasuryStore } from "@gambitdao/gbc-middleware"
import { $StakingGraph } from "../components/$StakingGraph"
import { $seperator2 } from "./common"
import { $Breadcrumbs } from "../components/$Breadcrumbs"
import { $MainMenu, $socialMediaLinks } from "../components/$MainMenu"
import { $ButtonSecondary } from "../components/form/$Button"
import { $bagOfCoins, $discount, $stackedCoins, $tofunft } from "../elements/$icons"
import { Stream } from "@most/types"
import { $loadBerry } from "../components/$DisplayBerry"
import { priceFeedHistoryInterval, latestTokenPriceMap } from "../logic/common"
import { arbitrumContract, avalancheContract } from "../logic/gbcTreasury"
import tokenIdAttributeTuple from "../logic/mappings/tokenIdAttributeTuple"
import { gmxGlpPriceHistory, queryArbitrumRewards, queryAvalancheRewards, StakedTokenArbitrum, StakedTokenAvalanche } from "../logic/query"
import { IEthereumProvider } from "eip1193-provider"
import { WALLET } from "../logic/provider"


export interface ITreasury {
  walletLink: IWalletLink
  parentRoute: Route
  treasuryStore: state.BrowserStore<ITreasuryStore, "treasuryStore">
  claimMap: Stream<{ [x: string]: IClaim }>
  walletStore: state.BrowserStore<WALLET, "walletStore">
}




export const $Home = ({ walletLink, parentRoute, treasuryStore, claimMap, walletStore }: ITreasury) => component((
  [routeChanges, linkClickTether]: Behavior<any, string>,
  [leftEyeContainerPerspective, leftEyeContainerPerspectiveTether]: Behavior<INode, ResizeObserverEntry[]>,
  [rightEyeContainerPerspective, rightEyeContainerPerspectiveTether]: Behavior<INode, ResizeObserverEntry[]>,
  [intersectionObserver, intersectionObserverTether]: Behavior<INode, IntersectionObserverEntry[]>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,

) => {


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
  

  

  const queryParams: IAccountQueryParamApi & Partial<ITimerangeParamApi> = {
    from: treasuryStore.state.startedStakingGmxTimestamp || undefined,
    account: GBC_ADDRESS.TREASURY_ARBITRUM
  }

  function dailyRandom(n: number, iterations = 100){
    for (let i = 0; i < iterations; i++) {
      n = (n ^ (n << 1) ^ (n >> 1)) % 10000
    }
    return n
  }

  const berryDayId = dailyRandom(Date.now() / (intervalInMsMap.HR24 * 1000))
  const [background, clothes, body, expression, faceAccessory, hat] = tokenIdAttributeTuple[berryDayId]

  const $randomBerry = $loadBerry([background, clothes, undefined, IAttributeExpression.HAPPY, undefined, undefined], 460)

  const arbitrumStakingRewards = replayLatest(multicast(arbitrumContract.stakingRewards))
  const avalancheStakingRewards = replayLatest(multicast(avalancheContract.stakingRewards))
  const pricefeedQuery = replayLatest(multicast(fromPromise(gmxGlpPriceHistory(queryParams))))
 
  const arbitrumYieldSourceMap = replayLatest(multicast(fromPromise(queryArbitrumRewards(queryParams))))
  const avalancheYieldSourceMap = replayLatest(multicast(fromPromise(queryAvalancheRewards({ ...queryParams, account: GBC_ADDRESS.TREASURY_AVALANCHE }))))



  const GRAPHS_INTERVAL = intervalInMsMap.HR4

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
      .map(y => ({ ...y, amountUsd: y.amount * priceMap.gmx.value / BI_18_PRECISION }))

    return [
      ...yieldFeeList,
      ...avaxYieldGmx,
      ...arbiStaking.stakedGlpTrackerClaims,
      ...arbiStaking.stakedGmxTrackerClaims
    ]
  }, arbitrumYieldSourceMap, avalancheYieldSourceMap, feeYieldClaim, newLocal)


  return [
    $column(style({ gap: '125px' }))(

      $node(gutterSpacingStyle, style({ display: 'flex', gap: '36px', placeContent: 'space-between', alignItems: 'center' }))(
        $column(layoutSheet.spacingBig, style({ maxWidth: '620px' }))(
          $column(style({ fontSize: screenUtils.isMobileScreen ? '2.1em' : '3.1em' }))(
            $node(
              $text(style({}))(`Welcome to the `),
              $text(style({ fontWeight: 'bold' }))(`GMX Blueberry Club`),
            ),
          ),

          $text(style({ lineHeight: '1.5em' }))(`GBC is a generative NFTfi Collection of 10,000 Blueberries on Arbitrum dedicated to the GMX Decentralized Exchange and its amazing community. Each GBC is unique and algorithmically generated from 130+ hand drawn traits.`),

          // $node(),

          $seperator2,

          $row(layoutSheet.spacingBig)(
            $anchor(layoutSheet.spacingSmall, style({ alignItems: 'center' }), attr({ href: `https://tofunft.com/collection/blueberryclub/items?category=fixed-price`, target:'_blank' }))(
              $icon({
                width: '40px',
                $content: $tofunft,
                viewBox: '0 0 32 32'
              }),
              $text(style({ paddingBottom: '6px' }))('Trade On TofuNFT')
            ),
            $anchor(layoutSheet.spacingSmall, style({ alignItems: 'center' }), attr({ href: `https://medium.com/@BlueberryClub/gbc-plans-for-2022-3ffe57e04087`, target:'_blank' }))(
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
            url: `/p/berry/${berryDayId + 1}`,
            route: parentRoute.create({ fragment: 'fefe' }),
            $content: $row(style({ maxWidth: '460px', borderRadius: '38px', overflow: 'hidden', width: '100%', height: '460px', transformStyle: 'preserve-3d', perspective: '100px', position: 'relative', placeContent: 'center', alignItems: 'flex-end' }))(
              $row(style({ alignSelf: 'flex-end', color: `${pallete.message}!important`, fontWeight: 'bold', position: 'absolute', right: '34px', top: '16px' }))(
                $text(style({ paddingTop: '19px', paddingRight: '3px' }))('#'),
                $text(style({ fontSize: '38px' }))(String(berryDayId))
              ),
              tap(async ({ element }) => {
                await import("../logic/mappings/svgParts")
                    
                element.querySelectorAll('.wakka').forEach(el => el.remove())
              }, $randomBerry as $Branch),
              $svg('svg')(
                attr({ xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: `0 0 1500 1500` }),
                style({ width: '460px', height: '460px', position: 'absolute', zIndex: 1, })
              )(
                tap(async ({ element }) => {
                  const svgParts = (await import("../logic/mappings/svgParts")).default

                  element.innerHTML = `${svgParts[4][faceAccessory]}${svgParts[5][hat]}`
                })
              )(),
              $row(style({ position: 'absolute', width: '125px', left: '219px', placeContent: 'space-between', top: '221px' }))(
                $eyeBall(leftEyeContainerPerspectiveTether(observer.resize()), eyeStylePosition(leftEyeContainerPerspective))(
                  $eyeInner()
                ),
                $eyeBall(rightEyeContainerPerspectiveTether(observer.resize()), eyeStylePosition(rightEyeContainerPerspective))(
                  $eyeInner()
                ),
              ),
              $text(
                style({ color: '#000', backgroundColor: pallete.message, textAlign: 'center', padding: '9px 13px', fontWeight: 'bold', borderRadius: '15px', position: 'absolute', top: '17px', left: '30px' }),
                stylePseudo(':after', {
                  border: '11px solid transparent',
                  borderTop: `5px solid ${pallete.message}`,
                  content: "''",
                  position: 'absolute',
                  top: '100%',
                  left: '56%',
                  width: 0,
                  height: 0
                })
              )('gm anon')
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
          url: '/p/treasury', route: parentRoute.create({ fragment: 'fefe' })
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
          $text(`To support the project, the GMX team has decided to fully distribute 4,000 esGMX to the community at the end of each month!`),
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
          $teamMember({ name: 'xm92boi', title: "Founder & Designer", tokenId: 16 }),
          $teamMember({ name: '0xAppodial', title: "Marketing", tokenId: 11 }),
          $teamMember({ name: 'itburnzz', title: "Dev", tokenId: 12 }),
          $teamMember({ name: 'B2F_zer', title: "Pleb", tokenId: 22 }),
          $teamMember({ name: 'IrvingDev_', title: "Dev", tokenId: 140 }),
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
    ),
      
    {
      routeChanges,
      walletChange
    }
  ]
})

export const $teamSigner = ({ name }: {name: string}) => $row(layoutSheet.spacingTiny, style({ alignItems: 'center', fontSize: screenUtils.isDesktopScreen ? '' : '65%' }))(
  $element('img')(style({ width: '20px', borderRadius: '22px' }), attr({ src: `https://unavatar.vercel.app/twitter/${name}`, }))(),
  $anchor(attr(({ href: `https://twitter.com/${name}` })), style({ fontWeight: 900, textDecoration: 'none', fontSize: '.75em' }))($text(`@${name}`)),
)


function buildThresholdList(numSteps = 20) {
  const thresholds = []

  for (let i=1.0; i<=numSteps; i++) {
    const ratio = i/numSteps
    thresholds.push(ratio)
  }

  thresholds.push(0)
  return thresholds
}
