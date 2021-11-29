import { Behavior, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, component, eventElementTarget, INode, style, styleInline } from "@aelea/dom"
import * as router from '@aelea/router'
import { $RouterAnchor } from '@aelea/router'
import { $column, $icon, $row, designSheet, layoutSheet, observer, screenUtils, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { awaitPromises, empty, map, merge, multicast, now, periodic, skipRepeats, snapshot, switchLatest } from '@most/core'
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { groupByMap } from '@gambitdao/gmx-middleware'
import { initWalletLink } from "@gambitdao/wallet-link"
import { $logo } from '../common/$icons'
import * as wallet from "../common/wallets"
import { $MainMenu, $socialMediaLinks } from '../components/$MainMenu'
import { $responsiveFlex } from "../elements/$common"
import { $bagOfCoins, $discount, $glp, $stackedCoins } from "../elements/$icons"
import { claimListQuery } from "../logic/claim"
import { helloBackend } from '../logic/leaderboard'
import { $Mint } from "../components/$Mint"
import { $Breadcrumbs } from "../components/$Breadcrumbs"


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


  const claimMap = replayLatest(
    map(list => groupByMap(list, item => item.account.toLowerCase()), claimListQuery())
  )


  const clientApi = helloBackend({

  })

  // localstorage
  const rootStore = state.createLocalStorageChain('ROOT')
  const walletStore = rootStore<'metamask' | 'walletConnect' | null, 'walletStore'>('walletStore', null)

  const chosenWalletName = now(walletStore.state)
  const defaultWalletProvider: Stream<IEthereumProvider | null> = awaitPromises(map(async name => {
    const provider = name === 'walletConnect' ? wallet.walletConnect : await wallet.metamaskQuery
    if (name && provider) {
      const [mainAccount]: string[] = await provider.request({ method: 'eth_accounts' }) as any
      if (mainAccount) {
        return provider
      }

    }

    return null
  }, chosenWalletName))


  const walletLink = initWalletLink(
    merge(defaultWalletProvider, walletChange)
  )




  const windowMouseMove = multicast(eventElementTarget('pointermove', window))


  const $eyeBall = $row(style({ position: 'relative', backgroundColor: 'white', placeContent: 'center', border: '6px solid black', alignItems: 'flex-end', borderRadius: '50%', width: '40px', height: '40px' }))
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
  const $card = $column(layoutSheet.spacing, style({ backgroundColor: pallete.horizon, padding: '30px', borderRadius: '20px', flex: 1 }))

  const $teamMember = (name: string, title: string) => $column(layoutSheet.spacing, style({ alignItems: 'center', fontSize: screenUtils.isDesktopScreen ? '' : '65%' }))(
    $element('img')(style({ width: screenUtils.isDesktopScreen ? '209px' : '150px', borderRadius: '22px' }), attr({ src: `/assets/team/${name}.svg`, }))(),
    $column(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
      $text(style({ fontWeight: 900, fontSize: '1.5em' }))(`@${name}`),
      $text(style({ fontSize: '.75em' }))(title),
    )
  )

  // const MINT_START = Date.UTC(2021, 11, 1, 18, 0, 0)
  const MINT_START = Date.now() + 3000
  const MINT_END = Infinity

  const secondsCountdown = map(Date.now, periodic(1000))

  const competitionCountdown = (startDate: number) => map(now => {
    const distance = startDate - now

    const days = Math.floor(distance / (1000 * 60 * 60 * 24))
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((distance % (1000 * 60)) / 1000)
      
    return `${days ? days + "d " : ''} ${hours ? hours + "h " : '' } ${ minutes ? minutes + "m " : ''} ${seconds ? seconds + "s " : ''}`
  }, secondsCountdown)


  const competitionStartSignal = skipRepeats(map(now => MINT_START > now, secondsCountdown))

  const $details = (start: number) => {

    return $row(layoutSheet.spacingSmall)(
      switchLatest(
        map(stated => {

          return stated
            ? $row(layoutSheet.spacingSmall, style({ fontSize: '1.65em' }))(
              $text(`Minting is starting in! `),
              $text(style({ fontWeight: 'bold' }))(competitionCountdown(start)),
            )
            : $Mint({ walletLink, walletStore })({
              walletChange: walletChangeTether()
            })
        }, competitionStartSignal)
      )
        
    )
  }


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


          $node(gutterSpacingStyle, style({ display: 'flex', gap: '36px', placeContent: 'space-between', backgroundColor: pallete.background }))(
            $column(layoutSheet.spacingBig, style({ maxWidth: '620px' }))(
              $column(style({ fontSize: screenUtils.isMobileScreen ? '2.1em' : '3.1em' }))(
                $node(
                  $text(style({}))(`Welcome to the `),
                  $text(style({ fontWeight: 'bold' }))(`GMX Bluberry Club`),
                ),
              ),

              $text(style({ lineHeight: '1.5em' }))(`GBC is a generative 10,000 Blueberry's NFT Collection on Arbitrum dedicated to the GMX Decentralized Exchange and its amazing community. Each GBC is unique and algorithmically generated from 130+ hand drawn traits.`),

              $node(),

              $details(MINT_START)
            ),

            screenUtils.isDesktopScreen ? $row(
              style({ maxWidth: '460px', marginTop: '45px', width: '100%', height: '460px', borderRadius: '38px', transformStyle: 'preserve-3d', perspective: '100px', position: 'relative', placeContent: 'center', alignItems: 'flex-end', backgroundImage: `linear-gradient(162deg, #D0F893 21%, #5CC1D2 100%)` }),
            )(
              $element('img')(style({}), attr({ width: '300px', src: '/assets/preview-tag.svg', }))(),
              $row(style({ position: 'absolute', width: '125px', marginLeft: '58px', placeContent: 'space-between', top: '225px' }))(
                $eyeBall(leftEyeContainerPerspectiveTether(observer.resize()), eyeStylePosition(leftEyeContainerPerspective))(
                  $eyeInner()
                ),
                $eyeBall(rightEyeContainerPerspectiveTether(observer.resize()), eyeStylePosition(rightEyeContainerPerspective))(
                  $eyeInner()
                ),
              )
            ) : empty()
          ),


          $column(style({ alignItems: 'center' }))(
            $icon({ $content: $logo, width: '100px', viewBox: '0 0 32 32' }),

            $text(style({ fontWeight: 'bold', fontSize: '2.5em', margin: '25px 0px 30px', textAlign: 'center' }))('GMX Blueberry Club Launch'),
            $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))(
              `The first goal of this collection is to reward GMX holders. That's why everyone with  Multiplier Point
(Snapshot taken on 19 Nov 2021) will be able to mint 1 GBC for free (minting early december)

The second distribution will be a public sale which will take place early december.
You will be able to mint GBC for 0,03 ETH each.

After the public sale, a part of ETH will be used to create a treasury that will benefit the GMX platform.
(more informations below)

`.trim()

            ),
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
                  $text('GLP token earn Escrowed GMX rewards and 50% of platform fees distributed in ETH.'),
                )
              ),
              $card(style({ minWidth: '34%' }))(
                $icon({ $content: $bagOfCoins, width: '42px', viewBox: '0 0 32 32' }),
                $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Treasury'),
                $column(
                  $text('The public sales will be used to create a GLP treasury which will provide benefits to the GMX platform and to the Blueberry Club. What will this treasury be used for? It will be up to the community to decide. '),
                )
              ),
              $card(style({ minWidth: '34%' }))(
                $icon({ $content: $discount, width: '42px', viewBox: '0 0 32 32' }),
                $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Royalties'),

                $text('There is a tax on all GBC transactions. These fees are transferred directly to the GLP treasury. Platforms can apply additional fees, that is why we will create our own marketplace.'),
              ),
              $card(style({ minWidth: '34%' }))(
                $icon({ $content: $stackedCoins, width: '42px', viewBox: '0 0 32 32' }),
                $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('GBC Rewards'),
                $text('Stacked GLPs on GMX receive rewards.'),
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
                  $text('Every week a snapshot is taken of each user’s GMX tokens as well as Blueberry NFT holdings'),
                ),
                $element('li')(
                  $text('At the end of the month, if a user held the same Blueberry NFT for 4 weeks, they would share from the reward pool based on the number of GMX tokens they held during the snapshots'),
                )
              ),
              $text('Big thanks to the GMX team for this feature which will allow to strengthen and unite the GMX community'),
            ),
          ),


          $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
            $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Team'),
            $row(layoutSheet.spacingBig, style({ alignSelf: 'stretch', placeContent: 'space-evenly', flexWrap: 'wrap' }))(
              $teamMember('xm92boi', 'Founder & Designer'),
              $teamMember('0xAppodial', 'Marketing'),
              $teamMember('itburnzz', 'Web3 Dev'),
              $teamMember('destructioneth', 'Contract Dev'),
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
                sections: [
                  {
                    $title: $text('What is the GMX Bluebery Club?'),
                    $content: $text(`GBC is a generative 10,000 Blueberry’s NFT Collection dedicated
to GMX.io and its amazing community. Each GBC is unique and algorithmically generated from over 130+ hand drawn traits. 
`),
                  },
                  {
                    $title: $text('What blockchain are GBC minted on?'),
                    $content: $text('GBC will be minted on Arbitrum.'),
                  },
                  {
                    $title: $text('How much will it cost to mint?'),
                    $content: $text('A GBC will cost 0.03 ETH during the public sale'),
                  },
                  {
                    $title: $text('When will minting be available?'),
                    $content: $text(`Free mint for whitelisted users : Early december
Public sale : Early december`),
                  },
                ]
              })({}),
            ),
          ),

          $node(),


        )
      ),

      // router.contains(pagesRoute)(
      //   $column(layoutSheet.spacingBig, style({ maxWidth: '1080px', width: '100%', margin: '0 auto', paddingBottom: '45px' }))(
      //     $row(layoutSheet.spacing, style({ padding: screenUtils.isDesktopScreen ? '34px 15px' : '18px 12px 0', zIndex: 30, alignItems: 'center' }))(
      //       screenUtils.isDesktopScreen
      //         ? $RouterAnchor({ $anchor: $element('a')($icon({ $content: $logo, fill: pallete.message, width: '46px', height: '46px', viewBox: '0 0 32 32' })), url: '/', route: rootRoute })({
      //           click: linkClickTether()
      //         })
      //         : empty(),
      //       screenUtils.isDesktopScreen ? $node(layoutSheet.flex)() : empty(),
      //       $MainMenu({ walletLink, claimMap, parentRoute: pagesRoute, containerOp: style({ padding: '34px, 20px' }) })({
      //         routeChange: linkClickTether(),
      //         walletChange: walletChangeTether()
      //       })
      //     ),
      //   )
      // ),
    )
  ]
})


