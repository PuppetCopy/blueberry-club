import { Behavior } from "@aelea/core"
import { $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { $anchor, $IntermediateTx, $Link } from "@gambitdao/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { $loadBerry } from "../../components/$DisplayBerry"
import { $buttonAnchor, $ButtonPrimary, $ButtonSecondary } from "../../components/form/$Button"
import { $responsiveFlex } from "../../elements/$common"
import { IAttributeHat, IAttributeFaceAccessory, IAttributeClothes, IAttributeExpression, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { $seperator2 } from "../common"
import { constant, empty, map, merge, mergeArray, multicast, now, switchLatest } from "@most/core"
import { ContractReceipt, ContractTransaction } from "@ethersproject/contracts"
import { pallete } from "@aelea/ui-components-theme"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { WALLET } from "../../logic/provider"
import { IEthereumProvider } from "eip1193-provider"
import { connectGbc } from "../../logic/contract/gbc"
import { countdownFn } from "@gambitdao/gmx-middleware"
import { timeChange } from "../../components/mint/mintUtils2"



const styleEl = document.createElement('style')

const spinnerId = (Math.random() + 1).toString(36).substring(7)

const keyFrames = `
@keyframes anim${spinnerId} {
  10% {
    background-color: rgb(173 173 173);
  }
  20% {
    background-color: #EE883D;
  }
  30% {
    background-color: #FF4747;
  }
  40% {
    background-color: #964CF2;
  }
  60% {
    background-color: #F94CEC;
  }
  70% {
    background-color: #6A8494;
  }
  85% {
    background-color: #FFD130;
  }
  100% {
    background-color: #4E41EE;
  }
}
`
styleEl.innerHTML = keyFrames.replace(/A_DYNAMIC_VALUE/g, "180deg")
document.getElementsByTagName('head')[0].appendChild(styleEl)

export const $bgAnimation = style({
  backgroundColor: 'white',
  backgroundImage: `linear-gradient(125deg, rgb(255 255 255 / 75%), rgba(0, 0, 0, 0))`,
  animation: `anim${spinnerId} 30s infinite alternate`,
})


interface IBerry {
  walletLink: IWalletLink
  parentRoute: Route
  walletStore: state.BrowserStore<WALLET, "walletStore">

}

export const $LabLanding = ({ walletLink, parentRoute, walletStore }: IBerry) => component((
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [mintTestGbc, mintTestGbcTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,
) => {




  return [
    mergeArray([
      $responsiveFlex(style({ gap: '75px', justifyContent: 'space-between' }))(
        $column(layoutSheet.spacingBig, style({ maxWidth: '570px' }))(
          $column(style({ fontSize: '3.2em' }))(
            $node(
              $text(style({}))(`Blueberry `),
              $text(style({ fontWeight: 'bold' }))(`Lab`),
            ),
          ),

          $text(style({ lineHeight: '1.5em' }))(`Take your GBC to the next level with the Blueberry Lab... Customize your Berry with brand new NFT Accessories (hats, backgrounds and much more). Some of the new accessories will be airdropped to GBC Members over time and others will be available in the Blueberry Lab Store or on secondary sales for purchase.`),

          $seperator2,

          // $text(style({ lineHeight: '1.5em' }))(`Bootstraping the lab`),

          $node(style({ fontSize: '1.7em' }))(
            $text(style({ color: pallete.foreground, paddingRight: '15px' }))(`Launching in`),
            $text(style({ fontSize: '1.5em', fontWeight: 'bold' }))(map(t => countdownFn(Date.UTC(2022, 5, 7, 22), t * 1000), timeChange)),
          ),


          // $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
          //   $IntermediateConnectButton({
          //     walletStore,
          //     $container: $column,
          //     $display: map(() => {
          //       return $ButtonPrimary({
          //         $content: $text(`Mint 2 GBC's`)
          //       })({
          //         click: mintTestGbcTether(
          //           map(() => {
          //             const walletGbc = connectGbc(walletLink)
          //             return map(async contract => {
          //               const ctx = await contract.mint(2, { value: 2n * 30000000000000000n })
          //               return ctx
          //             }, walletGbc.contract)
          //           }),
          //           switchLatest,
          //           multicast
          //         )
          //       })
          //     }),

          //     walletLink: walletLink
          //   })({
          //     walletChange: walletChangeTether()
          //   }),


          //   switchLatest(mergeArray([
          //     now($text(style({ color: pallete.positive }))(`<- Hey anon, Start by minting test GBC's`)),
          //     constant(empty(), mintTestGbc)
          //   ])),

          //   $IntermediateTx({
          //     $$success: map(() => $text(`Minted 2 test GBC's`)),
          //     chain: USE_CHAIN,
          //     query: mintTestGbc
          //   })({}),
          // ),
          // $seperator2,
          // $row(layoutSheet.spacingBig)(
          //   $Link({
          //     $content: $anchor(
          //       $ButtonSecondary({
          //         $content: $text('Customize my GBC')
          //       })({}),
          //     ),
          //     url: '/p/wardrobe', route: parentRoute
          //   })({
          //     click: changeRouteTether()
          //   }),
          //   $Link({
          //     $content: $anchor(
          //       $ButtonPrimary({
          //         $content: $text('View Store')
          //       })({}),
          //     ),
          //     url: '/p/lab-store', route: parentRoute
          //   })({
          //     click: changeRouteTether()
          //   }),
          // ),


        ),
        $bgAnimation(
          // switchLatest(combineArray((selectedItem, selectedBackground) => {



          //   const displaytuple: Partial<IBerryDisplayTupleMap> = [selectedBackground || background, clothes, IAttributeBody.BLUEBERRY, expression, faceAccessory, hat]

          //   if (selectedItem) {
          //     displaytuple.splice(getLabItemTupleIndex(selectedItem), 1, selectedItem)
          //   }

          //   $berry = $displayBerry(displaytuple, 585, true)

          //   const labItemStyle = O(labItemBackground, style({ flex: 1 }))

          //   const gbcBackground: undefined | IAttributeBackground = undefined // IAttributeBackground.BLUE
          //   const gbcItem: undefined | IAttributeClothes = undefined // IAttributeClothes.AVALANCHE_HOODIE


          //   const $tradeBox = $row(style({
          //     height: '80px', minWidth: '80px', borderRadius: '8px', gap: '2px', overflow: 'hidden', boxShadow: '-1px 2px 7px 2px #0000002e',
          //     position: 'relative', backgroundColor: pallete.middleground,
          //     // backgroundImage: 'linear-gradient(to top right, #fff0 calc(50% - 2px), black , #fff0 calc(50% + 2px))'
          //   }))


          //   return $text('fe')

          // }, itemSelection, backgroundSelection)),
          style(
            screenUtils.isDesktopScreen ? { maxWidth: '80vw', placeSelf: 'center', overflow: 'hidden', minWidth: '460px', borderRadius: '30px' } : { alignSelf: 'center', borderRadius: '30px' },
            $loadBerry([
              undefined, IAttributeClothes.AVALANCHE_HOODIE, undefined, IAttributeExpression.DEAD, IAttributeFaceAccessory.BEARD_WHITE, IAttributeHat.CHRISTMAS_HAT
            ], screenUtils.isDesktopScreen ? 460 : 300)
          )
        ),
      ),

      $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
        $text(style({ fontWeight: 'bold', fontSize: screenUtils.isDesktopScreen ? '2.5em' : '1.45em', textAlign: 'center' }))('Want to get featured?'),
        $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '678px' }))('Are you an artist, a project or an influencer? It is possible to collaborate with us to create items that fit your art or your brand in the Blueberry Lab'),


        $buttonAnchor(style({ alignSelf: 'center' }), attr({ href: 'https://discord.com/invite/7ZMmeU3z9j', target: '_blank' }))($text('Contact us on Discord'))
      ),
    ].reverse()),

    { changeRoute, walletChange }
  ]
})
