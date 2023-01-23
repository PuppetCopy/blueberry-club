import { Behavior, combineArray } from "@aelea/core"
import { $Branch, $element, $node, $svg, $text, attr, component, eventElementTarget, INode, style, styleInline, stylePseudo } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, observer, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { getSafeMappedValue, gmxSubgraph, intervalTimeMap, TRADE_CONTRACT_MAPPING } from "@gambitdao/gmx-middleware"
import { CHAIN, IWalletLink, zipState } from "@gambitdao/wallet-link"
import { $alert, $anchor, $gitbook, $IntermediatePromise, $Link } from "@gambitdao/ui-components"
import { awaitPromises, map, multicast, now, snapshot, switchLatest, tap, zip } from "@most/core"
import { $card, $teamMember } from "../elements/$common"

import {
  blueberrySubgraph,
  GBC_ADDRESS, IAttributeBody, IAttributeClothes, IAttributeExpression, IAttributeFaceAccessory,
  IAttributeHat, IToken, ITreasuryStore, tokenIdAttributeTuple
} from "@gambitdao/gbc-middleware"
import { $seperator2 } from "./common"
import { $buttonAnchor, $ButtonSecondary } from "../components/form/$Button"
import { $opensea } from "../elements/$icons"
import { Stream } from "@most/types"
import { $berry, svgParts } from "../components/$DisplayBerry"
import { BrowserStore } from "../logic/store"
import { $berryByLabItems, $berryByToken, getBerryFromItems } from "../logic/common"
import { $StakingGraph } from "../components/$StakingGraph"
import { connectGmxEarn } from "../logic/contract"


export interface ITreasury {
  walletLink: IWalletLink
  parentRoute: Route
  treasuryStore: BrowserStore<"ROOT.v1.treasuryStore", ITreasuryStore>
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


export const $Home = (config: ITreasury) => component((
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

  // const queryParams: IRequestAccountApi & Partial<IRequestTimerangeApi> = {
  //   from: config.treasuryStore.getState().startedStakingGmxTimestamp || undefined,
  //   account: GBC_ADDRESS.TREASURY_ARBITRUM
  // }

  function dailyRandom(n: number, iterations = 100) {
    for (let i = 0; i < iterations; i++) {
      n = (n ^ (n << 1) ^ (n >> 1)) % 10000
    }
    return n
  }


  // const arbitrumStakingRewards = replayLatest(multicast(arbitrumContract.stakingRewards))
  // const avalancheStakingRewards = replayLatest(multicast(avalancheContract.stakingRewards))

  // const pricefeedQuery = replayLatest(multicast(fromPromise(histroicPricefeed(queryParams))))

  // const arbitrumStake = replayLatest(multicast(fromPromise(queryArbitrumRewards(queryParams))))
  // const avalancheStake = replayLatest(multicast(fromPromise(queryAvalancheRewards({ ...queryParams, account: GBC_ADDRESS.TREASURY_AVALANCHE }))))



  const GRAPHS_INTERVAL = intervalTimeMap.HR8


  const members = [
    { name: 'xm92boi', title: "Founder & Designer", tokenId: 16 },
    { name: 'APP0D14L', title: "Marketing", tokenId: 11 },
    { name: 'itburnzz', title: "Dev", tokenId: 12 },
    { name: 'B2F_zer', title: "Pleb", tokenId: 22 },
    { name: 'defipleb', title: "Networking", tokenId: 7378 },
    { name: 'kingblockchain', title: "Marketing & Advocee", tokenId: 4825 },
  ]

  const activeContributorList = [
    { name: 'IrvingDev_', size: 'small', title: "Lab Dev", tokenId: 140 },
    { name: 'JamesCliffyz', size: 'small', title: "Dune Analyst", tokenId: 150 },
    { name: 'kitkat787878', size: 'small', title: "Witch", tokenId: 21 },
    { name: 'defiplebette', size: 'small', title: "Lab's Shakespeare", tokenId: 121 },
    { name: 'gmx_intern', size: 'small', title: "Blueberry Podcast", tokenId: 2605 },
    { name: 'tanoeth', size: 'small', title: "Blueberry Podcast", tokenId: 1867 },
    { name: 'onisuals', size: 'small', title: "Motion Designer", tokenId: 3195 },
    { name: '1tbk1', size: 'small', title: "GBC Builder", tokenId: 9376 },
    { name: 'Mr_r0bo1', size: 'small', title: "GBC Builder", tokenId: 175 },
    { name: 'monte_xyz', size: 'small', title: "Discord Mod", tokenId: 5708 },
    { name: '0x11nze', size: 'small', title: "Fondation B Lead", tokenId: 9036 },
    { name: 'juandelamochila', size: 'small', title: "Discord Mod", tokenId: 734 },
    { name: 'quantumzebra123', size: 'small', title: "Weekly Analysis", tokenId: 9681 },
    { name: 'CaptainPaup_', size: 'small', title: "3D Art", tokenId: 3204 },
  ]


  const account = map(c => c === CHAIN.AVALANCHE ? GBC_ADDRESS.TREASURY_AVALANCHE : GBC_ADDRESS.TREASURY_ARBITRUM, config.walletLink.network)
  const chain = config.walletLink.network

  return [
    $column(style(screenUtils.isDesktopScreen ? { gap: '125px' } : { gap: '90px' }))(


      $row(
        screenUtils.isDesktopScreen
          ? style({ width: '100vw', marginLeft: 'calc(-50vw + 50%)', height: '580px', alignItems: 'center', placeContent: 'center' })
          : style({ height: '80vh', alignItems: 'center', placeContent: 'center' })
      )(
        switchLatest(map(parts => {
          // const queryBerryDayId = blueberrySubgraph.token(now({ id: '4383' }))
          const queryBerryDayId = blueberrySubgraph.token(now({ id: dailyRandom(Date.now() / (intervalTimeMap.HR24 * 1000)) + '' }))

          const berrySize = screenUtils.isDesktopScreen ? 100 : 70

          const berryWallRowCount = Math.floor((document.body.clientWidth + 20) / (berrySize + 20))
          const headlineSize = screenUtils.isDesktopScreen ? 3 * 7 : 0

          const aboutHalf = Math.floor((berryWallRowCount - 7) / 2)

          const wallCount = berryWallRowCount * 5 - headlineSize
          const randomGBCList = randomIntList(wallCount, 0, 9999)


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
              $anchor(layoutSheet.spacingSmall, style({ alignItems: 'center', display: 'flex' }), attr({ href: `https://opensea.io/collection/blueberry-club` }))(
                $icon({
                  width: '40px',
                  $content: $opensea,
                  viewBox: '0 0 32 32'
                }),
                $text(style({ paddingBottom: '6px' }))(screenUtils.isDesktopScreen ? 'Trade On Opensea' : 'Trade')
              ),
              $anchor(layoutSheet.spacingSmall, style({ alignItems: 'center', display: 'flex' }), attr({ href: `https://docs.blueberry.club` }))(
                $icon({
                  width: '40px',
                  $content: $gitbook,
                  viewBox: '0 0 32 32'
                }),
                $text(style({ paddingBottom: '6px' }))('Documentation')
              )
            )
          )

          const queryBerryWallList = blueberrySubgraph.tokenListSpecific(now(randomGBCList))

          const $mosaicItem = (token: IToken, size: number) => {

            return $anchor(style({ position: 'relative' }), attr({ href: '/p/berry/' + token.id, target: '' }))(
              style({ borderRadius: '10px' }, $berryByToken(token, size)),
              $text(style({ textAlign: 'left', padding: screenUtils.isDesktopScreen ? '8px 0 0 8px' : '5px 0 0 5px', color: '#fff', textShadow: '#0000005e 0px 0px 5px', fontSize: screenUtils.isDesktopScreen ? '.6em' : '.6em', position: 'absolute', top: 0, fontWeight: 'bold' }))(String(token.id))
            )
          }

          return $IntermediatePromise({
            query: combineArray((a, b) => Promise.all([a, b]), queryBerryDayId, queryBerryWallList),
            $$done: map(([token, berryWallList]) => {
              const [background, clothes, body, expression, faceAccessory, hat] = tokenIdAttributeTuple[token.id - 1]

              const display = getBerryFromItems(token.labItems.map(li => Number(li.id)))


              const $mainBerry = tap(({ element }) => {
                element.querySelectorAll('.wakka').forEach(el => el.remove())
              }, $berryByLabItems(token.id, display.background, display.custom, 340, [background, clothes, undefined, IAttributeExpression.HAPPY, ' ' as any, ' ' as any]) as $Branch)

              return screenUtils.isDesktopScreen
                ? $node(style({ display: 'grid', width: '100%', gap: '20px', justifyContent: 'center', gridTemplateColumns: `repeat(auto-fit, ${berrySize}px)`, gridAutoRows: berrySize + 'px' }))(
                  ...berryWallList.slice(0, berryWallRowCount + aboutHalf).map(id => {
                    return $mosaicItem(id, berrySize)
                  }),
                  $row(style({ gridRow: 'span 3 / auto', gridColumn: 'span 7 / auto', gap: '35px' }))(
                    $Link({
                      url: `/p/berry/${token.id}`,
                      route: config.parentRoute.create({ fragment: 'fefe' }),
                      $content: $row(style({ maxWidth: 340 + 'px', borderRadius: '30px', overflow: 'hidden', width: '100%', height: 340 + 'px', transformStyle: 'preserve-3d', perspective: '100px', position: 'relative', placeContent: 'center', alignItems: 'flex-end' }))(
                        $row(style({ alignSelf: 'flex-end', zIndex: 10, color: `white!important`, fontWeight: 'bold', position: 'absolute', left: '20px', top: '16px' }))(
                          $text(style({ fontSize: '38px', textShadow: '#0000005e 0px 0px 5px' }))(String(token.id))
                        ),
                        $mainBerry,
                        $svg('svg')(
                          attr({ xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: `0 0 1500 1500` }),
                          style({ width: 340 + 'px', height: 340 + 'px', position: 'absolute', zIndex: 1, })
                        )(
                          tap(async ({ element }) => {
                            element.innerHTML = `
                            ${parts[4][display.custom as IAttributeFaceAccessory || faceAccessory]}
                            ${parts[5][hat]}
                          `
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
                    return $mosaicItem(id, berrySize)
                  }),
                )
                : $row(style({ flexWrap: 'wrap', gap: '10px', placeContent: 'center', flex: 1 }))(
                  ...berryWallList.slice(0, berryWallRowCount * 2).map(id => {
                    return $mosaicItem(id, berrySize)
                  }),
                  style({ padding: '25px' }, $introHeadline),
                  ...berryWallList.slice(berryWallRowCount * 2, berryWallRowCount * 4).map(id => {
                    return $mosaicItem(id, berrySize)
                  }),
                )
            })
          })({})
        }, svgParts))
      ),


      $column(style({ alignItems: 'center', gap: '26px' }))(
        // $icon({ $content: $logo, width: '100px', viewBox: '0 0 32 32' }),

        $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
          $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Treasury'),
          $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))(`Yield is used to support GBC's underlaying value through our products`),
        ),

        style({ alignSelf: 'center' })(
          $alert($text(`Treasury graph is out of sync due to new upcomming changes, stay tuned for a whole new overhaul`))
        ),

        $node(),


        $StakingGraph({
          sourceList: gmxSubgraph.stake(zipState({ chain, account })),
          stakingInfo: switchLatest(zip((provider, chain) => {
            const contractMapping = getSafeMappedValue(TRADE_CONTRACT_MAPPING, chain, CHAIN.ARBITRUM)
            const account = chain === CHAIN.AVALANCHE ? GBC_ADDRESS.TREASURY_AVALANCHE : GBC_ADDRESS.TREASURY_ARBITRUM

            return connectGmxEarn(config.walletLink.provider, account, contractMapping).stakingRewards
          }, config.walletLink.provider, config.walletLink.network)),
          walletLink: config.walletLink,
        })({}),

        $Link({
          $content: $anchor(
            $ButtonSecondary({
              $content: $text('Treasury Page')
            })({})
          ),
          url: '/p/treasury', route: config.parentRoute.create({ fragment: 'fefe' })
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
          $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))('The collection is based on a treasury which receives revenue thorugh different Products'),
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
        switchLatest(map(res => {

          return $row(layoutSheet.spacingBig, style({ alignSelf: 'stretch', placeContent: 'space-evenly', flexWrap: 'wrap' }))(
            ...res.map((token, idx) => {
              const member = members[idx]

              return $teamMember({ ...member, token })
            })
          )
        }, awaitPromises(blueberrySubgraph.tokenListSpecific(now(members.map(t => t.tokenId)))))),

        $seperator2,

        switchLatest(map(res => {
          return $row(layoutSheet.spacingBig, style({ flexWrap: 'wrap', width: '100%', placeContent: 'center' }))(
            ...res.map((token, idx) => {
              const member = activeContributorList[idx]

              return $teamMember({ ...member, token } as any)
            })
          )
        }, awaitPromises(blueberrySubgraph.tokenListSpecific(now(activeContributorList.map(t => t.tokenId)))))),



        $node(),

        $card(layoutSheet.spacingBig, style({ flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column-reverse', alignItems: 'center', position: 'relative', padding: '40px' }))(

          $row(style({ width: screenUtils.isDesktopScreen ? '280px' : '' }))(
            style({ margin: '-40px' }, $berry([undefined, IAttributeClothes.BUILDER, IAttributeBody.BLUEBERRY, IAttributeExpression.HAPPY, IAttributeFaceAccessory.RICH, IAttributeHat.BRAIN], screenUtils.isDesktopScreen ? 350 : 200))
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
      // pricefeed: ,
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



