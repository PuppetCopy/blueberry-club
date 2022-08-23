import { Behavior, combineArray, replayLatest } from "@aelea/core"
import { $Branch, $element, $node, $svg, $text, attr, component, eventElementTarget, INode, style, styleInline, stylePseudo } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, observer, screenUtils, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IAccountQueryParamApi, intervalTimeMap, ITimerangeParamApi } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $anchor, $gitbook, $IntermediatePromise, $Link } from "@gambitdao/ui-components"
import { fromPromise, map, multicast, now, snapshot, take, tap } from "@most/core"
import { $card, $teamMember } from "../elements/$common"

import { BI_18_PRECISION, GBC_ADDRESS, IAttributeBody, IAttributeClothes, IAttributeExpression, IAttributeFaceAccessory, IAttributeHat, IBerryDisplayTupleMap, ITreasuryStore, tokenIdAttributeTuple } from "@gambitdao/gbc-middleware"
import { $StakingGraph } from "../components/$StakingGraph"
import { $seperator2 } from "./common"
import { $buttonAnchor, $ButtonSecondary } from "../components/form/$Button"
import { $tofunft } from "../elements/$icons"
import { Stream } from "@most/types"
import { $berry, $loadBerry } from "../components/$DisplayBerry"
import { priceFeedHistoryInterval, latestTokenPriceMap } from "../logic/common"
import { arbitrumContract, avalancheContract } from "../logic/gbcTreasury"
import { gmxGlpPriceHistory, queryArbitrumRewards, queryAvalancheRewards, StakedTokenArbitrum, StakedTokenAvalanche } from "../logic/query"
import { WALLET } from "../logic/provider"
import { SvgPartsMap } from "@gambitdao/gbc-middleware"


export interface ITreasury {
  walletLink: IWalletLink
  parentRoute: Route
  treasuryStore: state.BrowserStore<ITreasuryStore, "treasuryStore">
  walletStore: state.BrowserStore<WALLET, "walletStore">
}


function randomInt(min: number, max: number) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min //The maximum is exclusive and the minimum is inclusive
}

function randomIntList(amount: number, min: number, max: number) {
  const list = []

  while (list.length < amount) {
    const num = randomInt(min, max)
    if (list.indexOf(num) === -1) list.push(num)
  }

  return list
}


export const $Home = ({ walletLink, parentRoute, treasuryStore }: ITreasury) => component((
  [routeChanges, linkClickTether]: Behavior<any, string>,
  [leftEyeContainerPerspective, leftEyeContainerPerspectiveTether]: Behavior<INode, ResizeObserverEntry[]>,
  [rightEyeContainerPerspective, rightEyeContainerPerspectiveTether]: Behavior<INode, ResizeObserverEntry[]>,
  [intersectionObserver, intersectionObserverTether]: Behavior<INode, IntersectionObserverEntry[]>,
) => {


  const windowMouseMove = multicast(eventElementTarget('pointermove', window))


  const $eyeBall = $row(style({ position: 'relative', backgroundColor: 'white', placeContent: 'center', border: '4px solid black', alignItems: 'flex-end', padding: '2px', borderRadius: '50%', width: '30px', height: '30px' }))
  const $eyeInner = $node(style({ borderRadius: '50%', width: '6px', height: '6px', display: 'block', background: 'black' }))

  const gutterSpacingStyle = style({
    ...(screenUtils.isMobileScreen ? { flexDirection: 'column' } : { flexDirection: 'row' }),
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

  function dailyRandom(n: number, iterations = 100) {
    for (let i = 0; i < iterations; i++) {
      n = (n ^ (n << 1) ^ (n >> 1)) % 10000
    }
    return n
  }


  const arbitrumStakingRewards = replayLatest(multicast(arbitrumContract.stakingRewards))
  const avalancheStakingRewards = replayLatest(multicast(avalancheContract.stakingRewards))
  const pricefeedQuery = replayLatest(multicast(fromPromise(gmxGlpPriceHistory(queryParams))))

  const arbitrumYieldSourceMap = replayLatest(multicast(fromPromise(queryArbitrumRewards(queryParams))))
  const avalancheYieldSourceMap = replayLatest(multicast(fromPromise(queryAvalancheRewards({ ...queryParams, account: GBC_ADDRESS.TREASURY_AVALANCHE }))))



  const GRAPHS_INTERVAL = intervalTimeMap.HR8

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


  const queryParts = now(Promise.all([
    import("@gambitdao/gbc-middleware/src/mappings/svgParts").then(res => res.default)
  ]))

  

  return [
    $column(style(screenUtils.isDesktopScreen ? { gap: '125px', marginTop: '-50px' } : { gap: '90px' }))(


      $row(style({ width: '100vw', marginLeft: 'calc(-50vw + 50%)', height: screenUtils.isDesktopScreen ? '580px' : '', alignItems: 'center', placeContent: 'center' }))(
        $IntermediatePromise({
          query: queryParts,
          $$done: map(([svgParts]) => {

            const berryDayId = dailyRandom(Date.now() / (intervalTimeMap.HR24 * 1000)) + 0
            const [background, clothes, body, expression, faceAccessory, hat] = tokenIdAttributeTuple[berryDayId]

            const berrySize = screenUtils.isDesktopScreen ? 100 : 70

            const berryWallRowCount = Math.floor((document.body.clientWidth + 20) / (berrySize + 20))
            const headlineSize = screenUtils.isDesktopScreen ? 3 * 7 : 0

            const aboutHalf = Math.floor((berryWallRowCount - 7) / 2)

            const wallCount = berryWallRowCount * 5 - headlineSize
            const randomGBCList = randomIntList(wallCount, 0, 9999)

            const berryWallList = randomGBCList

            const $introHeadline = $column(layoutSheet.spacingBig, style({ maxWidth: '820px', alignSelf: 'center' }))(
              $column(style({ fontSize: '1.5em' }))(
                $text(style({ fontWeight: 'bold' }))(`GMX Blueberry Club`)
              ),
              $node(
                $text(style({ lineHeight: '1.5em' }))(`10,000 Blueberries NFT Collection on Arbitrum, building a community driven `),
                $anchor(style({ display: 'inline' }), attr({ href: `https://twitter.com/GMX_IO`, target: '_blank' }))(
                  $text('@GMX_io')
                ),
                $text(' products and having fun together')
              ),
              $seperator2,
              $row(layoutSheet.spacingBig, style({}))(
                $anchor(layoutSheet.spacingSmall, style({ alignItems: 'center' }), attr({ href: `https://tofunft.com/collection/blueberryclub/items?category=fixed-price`, target: '_blank' }))(
                  $icon({
                    width: '40px',
                    $content: $tofunft,
                    viewBox: '0 0 32 32'
                  }),
                  $text(style({ paddingBottom: '6px' }))(screenUtils.isDesktopScreen ? 'Trade On TofuNFT' : 'Trade')
                ),
                $anchor(layoutSheet.spacingSmall, style({ alignItems: 'center' }), attr({ href: `https://docs.blueberry.club`, target: '_blank' }))(
                  $icon({
                    width: '40px',
                    $content: $gitbook,
                    viewBox: '0 0 32 32'
                  }),
                  $text(style({ paddingBottom: '6px' }))('Documentation')
                )
              )
            )

            const $mosaicItem = (id: number, svgBody: SvgPartsMap, size: number) => {
              const matchTuple: Partial<IBerryDisplayTupleMap> = tokenIdAttributeTuple[id - 1]

              return $anchor(style({ position: 'relative' }), attr({ href: '/p/berry/' + id }))(
                style({ borderRadius: '10px' }, $berry(svgBody, matchTuple, size)),
                $text(style({ textAlign: 'left', padding: screenUtils.isDesktopScreen ? '8px 0 0 8px' : '5px 0 0 5px', color: '#fff', textShadow: '#0000005e 0px 0px 5px', fontSize: screenUtils.isDesktopScreen ? '.6em' : '.6em', position: 'absolute', fontWeight: 'bold' }))(String(id))
              )
            }

            return screenUtils.isDesktopScreen
              ? $node(style({ display: 'grid', width: '100%', gap: '20px', justifyContent: 'center', gridTemplateColumns: `repeat(auto-fit, ${berrySize}px)`, gridAutoRows: berrySize + 'px' }))(
                ...berryWallList.slice(0, berryWallRowCount + aboutHalf).map(id => {
                  return $mosaicItem(id, svgParts, berrySize)
                }),
                $row(style({ gridRow: 'span 3 / auto', gridColumn: 'span 7 / auto', gap: '35px' }))(
                  $Link({
                    url: `/p/berry/${berryDayId + 1}`,
                    route: parentRoute.create({ fragment: 'fefe' }),
                    $content: $row(style({ maxWidth: 340 + 'px', borderRadius: '30px', overflow: 'hidden', width: '100%', height: 340 + 'px', transformStyle: 'preserve-3d', perspective: '100px', position: 'relative', placeContent: 'center', alignItems: 'flex-end' }))(
                      $row(style({ alignSelf: 'flex-end', zIndex: 10, color: `white!important`, fontWeight: 'bold', position: 'absolute', left: '20px', top: '16px' }))(
                        $text(style({ fontSize: '38px', textShadow: '#0000005e 0px 0px 5px' }))(String(berryDayId))
                      ),
                      tap(({ element }) => {
                        element.querySelectorAll('.wakka').forEach(el => el.remove())
                      }, $loadBerry([background, clothes, undefined, IAttributeExpression.HAPPY, undefined, undefined], 340) as $Branch),
                      $svg('svg')(
                        attr({ xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: `0 0 1500 1500` }),
                        style({ width: 340 + 'px', height: 340 + 'px', position: 'absolute', zIndex: 1, })
                      )(
                        tap(async ({ element }) => {
                          element.innerHTML = `${svgParts[4][faceAccessory]}${svgParts[5][hat]}`
                        })
                      )(),
                      $row(style({ position: 'absolute', width: '95px', left: '158px', placeContent: 'space-between', top: '162px' }))(
                        $eyeBall(leftEyeContainerPerspectiveTether(observer.resize()), eyeStylePosition(leftEyeContainerPerspective))(
                          $eyeInner()
                        ),
                        $eyeBall(rightEyeContainerPerspectiveTether(observer.resize()), eyeStylePosition(rightEyeContainerPerspective))(
                          $eyeInner()
                        )
                      ),
                      $text(
                        style({ zIndex: 1, color: pallete.background, backgroundColor: pallete.message, textAlign: 'center', padding: '9px 13px', fontWeight: 'bold', borderRadius: '15px', position: 'absolute', top: '17px', right: '20px' }),
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

                  $row(gutterSpacingStyle, style({ display: 'flex', gap: '36px', placeContent: 'center', alignItems: 'center' }))(
                    $introHeadline
                  )
                ),
                ...berryWallList.slice(berryWallRowCount + aboutHalf, wallCount).map(id => {
                  return $mosaicItem(id, svgParts, berrySize)
                }),
              )
              : $row(style({ flexWrap: 'wrap', gap: '10px', placeContent: 'center', flex: 1 }))(
                ...randomGBCList.slice(0, berryWallRowCount * 2).map(id => {
                  return $mosaicItem(id, svgParts, berrySize)
                }),
                style({ padding: '25px' }, $introHeadline),
                ...randomGBCList.slice(berryWallRowCount * 2, berryWallRowCount * 4).map(id => {
                  return $mosaicItem(id, svgParts, berrySize)
                }),
              )
          })
        })({})
      ),




      $column(style({ alignItems: 'center', gap: '26px' }))(
        // $icon({ $content: $logo, width: '100px', viewBox: '0 0 32 32' }),

        $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
          $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Treasury'),
          $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))('100% GBC Treasury yield is Distributed to GBC holders(WIP)'),
        ),

        $node(),

        $StakingGraph({
          valueSource: [gmxArbitrumRS, glpArbitrumRS, glpAvalancheRS],
          stakingYield: yieldClaim,
          arbitrumStakingRewards,
          avalancheStakingRewards,
          walletLink,
          priceFeedHistoryMap: pricefeedQuery,
          graphInterval: GRAPHS_INTERVAL,
        })({}),

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
        $column(layoutSheet.spacingBig, style({ alignItems: 'center', textAlign: 'center' }))(
          $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Discover our Ecosystem'),
          $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))('The collection is based on a treasury receive revenue thorugh different Products'),
        ),
        $node(),

        $row(layoutSheet.spacingBig, style({ flexWrap: 'wrap' }), gutterSpacingStyle)(
          $ecosystemCard(
            'GMX Blueberry Club',
            'GMX Blueberry Club is a collection of 10,000 NFTs (non-fungible tokens) living on Arbitrum that are made up of +130 hand drawn traits.',
            `/assets/homepage/gbcnft.png`
          ),
          $ecosystemCard(
            'Blueberry Lab',
            'The Blueberry Lab is a tool that allows GBC owners to customize their Berries with new attributes which must be owned on-chain.',
            `/assets/homepage/lab.png`
          ),
          $ecosystemCard(
            'GBC Trading (Soon)',
            'Redistribution system that allow GBC Members to open leveraged positions on GMX with our Treasury Yield.',
            `/assets/homepage/trading.png`
          ),
          $ecosystemCard(
            'Puppet Mirror Trading (Soon)',
            'Social Trading Platform for investors. \nMirror your favorite trader on the GBC Leaderboard',
            `/assets/homepage/puppet.png`
          ),
          $ecosystemCard(
            'GBC Discord',
            'Our Exclusive Discord Server aim to bring all the talents present in the club, have fun and build the future of the Blueberry Club together',
            `/assets/homepage/discord.png`
          ),
          $ecosystemCard(
            'GBC Documentation',
            'Want to know more about the project? All the information you need to know about the Blueberry Club in one place. ',
            `/assets/homepage/docs.png`
          ),


        ),
      ),


      $column(layoutSheet.spacingBig, style({ alignItems: 'center', textAlign: 'center' }))(
        $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Active Contributors'),
        $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))(`Powered by the community`),
        $node(),
        $row(layoutSheet.spacingBig, style({ alignSelf: 'stretch', placeContent: 'space-evenly', flexWrap: 'wrap' }))(
          $teamMember({ name: 'xm92boi', title: "Founder & Designer", tokenId: 16 }),
          $teamMember({ name: 'APP0D14L', title: "Marketing", tokenId: 11 }),
          $teamMember({ name: 'itburnzz', title: "Dev", tokenId: 12 }),
          $teamMember({ name: 'B2F_zer', title: "Pleb", tokenId: 22 }),
          $teamMember({ name: 'IrvingDev_', title: "Dev", tokenId: 140 }),
          $teamMember({ name: 'kingblockchain', title: "Marketing & Advocee", tokenId: 4825 }),
        ),

        $seperator2,

        $row(layoutSheet.spacingBig, style({ flexWrap: 'wrap', width: '100%', placeContent: 'center' }))(
          $teamMember({ name: 'kitkat787878', size: 'small', title: "Witch", tokenId: 21 }),
          $teamMember({ name: 'defipleb', size: 'small', title: "Lab's Shakespeare", tokenId: 6762 }),
          $teamMember({ name: 'defiplebette', size: 'small', title: "Lab's Shakespeare", tokenId: 121 }),
          $teamMember({ name: 'cryp_growth', size: 'small', title: "Blueberry Podcast", tokenId: 2605 }),
          $teamMember({ name: 'tanoeth', size: 'small', title: "Blueberry Podcast", tokenId: 1867 }),
          $teamMember({ name: 'onisuals', size: 'small', title: "Motion Designer", tokenId: 3195 }),
          $teamMember({ name: '1tbk1', size: 'small', title: "GBC Builder", tokenId: 9376 }),
          $teamMember({ name: 'Mr_r0bo1', size: 'small', title: "GBC Builder", tokenId: 175 }),
          $teamMember({ name: 'monte_xyz', size: 'small', title: "Discord Mod", tokenId: 5708 }),
          $teamMember({ name: '0x11nze', size: 'small', title: "Fondation B Lead", tokenId: 9036 }),
          $teamMember({ name: 'juandelamochila', size: 'small', title: "Discord Mod", tokenId: 734 }),
          $teamMember({ name: 'quantumzebra123', size: 'small', title: "Weekly Analysis", tokenId: 9681 }),
          $teamMember({ name: 'CaptainPaup_', size: 'small', title: "3D Art", tokenId: 3204 }),
        ),

        $node(),

        $card(layoutSheet.spacingBig, style({ flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column-reverse', alignItems: 'center', position: 'relative', padding: '40px' }))(

          $row(style({ width: screenUtils.isDesktopScreen ? '280px' : '' }))(
            style({ margin: '-40px' }, $loadBerry([undefined, IAttributeClothes.BUILDER, IAttributeBody.BLUEBERRY, IAttributeExpression.HAPPY, IAttributeFaceAccessory.RICH, IAttributeHat.BRAIN], screenUtils.isDesktopScreen ? 350 : 200))
          ),

          $column(layoutSheet.spacing)(
            $text(style({ fontWeight: 'bold', fontSize: screenUtils.isDesktopScreen ? '2.5em' : '1.45em', textAlign: 'center' }))('Got skillz?'),
            $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '678px' }))(`ideas constantly popping in your head? `),

            $buttonAnchor(style({ alignSelf: 'center' }), attr({ href: 'https://discord.com/invite/7ZMmeU3z9j', target: '_blank' }))($text('Become a Contributor'))
          )
        ),
      ),



      $node(),
    ),

    {
      routeChanges
    }
  ]
})


const $ecosystemCard = (title: string, desc: string, img: string) => {
  return $card(style({ width: screenUtils.isDesktopScreen ? '342px' : '100%', flex: 'none' }))(
    $element('img')(style({ borderRadius: '16px', maxWidth: '100%' }), attr({ src: img }))(),
    $text(style({ fontWeight: 'bold', fontSize: '1.25em', textAlign: 'center' }))(title),
    $column(style({ fontSize: '.9em' }))(
      $text(desc),
    )
  )
}


function buildThresholdList(numSteps = 20) {
  const thresholds = []

  for (let i = 1.0; i <= numSteps; i++) {
    const ratio = i / numSteps
    thresholds.push(ratio)
  }

  thresholds.push(0)
  return thresholds
}



