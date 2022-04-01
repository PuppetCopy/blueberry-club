import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, state } from "@aelea/ui-components"
import { $anchor, $IntermediateTx, $Link } from "@gambitdao/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { $loadBerry } from "../../components/$DisplayBerry"
import { $ButtonPrimary, $ButtonSecondary } from "../../components/form/$Button"
import { $responsiveFlex } from "../../elements/$common"
import { IAttributeHat, IAttributeFaceAccessory, IAttributeClothes, IAttributeExpression } from "@gambitdao/gbc-middleware"
import { $seperator2 } from "../common"
import { map, merge, now, switchLatest } from "@most/core"
import { ContractReceipt } from "@ethersproject/contracts"
import { pallete } from "@aelea/ui-components-theme"
import { $IntermediateConnect } from "../../components/$ConnectAccount"
import { WALLET } from "../../logic/provider"
import { IEthereumProvider } from "eip1193-provider"
import { connectGbc } from "../../logic/contract/gbc"



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
  [mintTestGbc, mintTestGbcTether]: Behavior<PointerEvent, Promise<ContractReceipt>>,
) => {



  return [
    $column(layoutSheet.spacingBig)(
      $responsiveFlex(layoutSheet.spacingBig, style({ justifyContent: 'space-between' }))(
        $column(layoutSheet.spacingBig, style({ maxWidth: '570px' }))(
          $column(style({ fontSize: '3.2em' }))(
            $node(
              $text(style({}))(`Bluberry `),
              $text(style({ fontWeight: 'bold' }))( `Lab`),
            ),
          ),

          $text(style({ lineHeight: '1.5em' }))(`Take your GBC to the next level with the Blueberry Lab... Customize your Berry with brand new NFT Accessories (hats, backgrounds and much more). Some of the new accessories will be airdropped to GBC Members over time and others will be available in the Blueberry Lab Store or on secondary sales for purchase.`),

          $seperator2,

          $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
            $IntermediateConnect({
              walletStore,
              $container: $column,
              $display: $ButtonPrimary({
                $content: $text(`Mint 2 GBC's`)
              })({
                click: mintTestGbcTether(
                  map(() => {

                    const walletGbc = connectGbc(walletLink)
                    return map(async contract => {
                      const ctx = await contract.mint(2, { value: 2n * 30000000000000000n })
                      return await ctx.wait()
                    }, walletGbc.contract)
                  }),
                  switchLatest
                )
              }),
        
              walletLink: walletLink
            })({
              walletChange: walletChangeTether()
            }),
            

            $IntermediateTx({
              $done: map(res => {

                if (res === 0) {
                  return $text(style({ color: pallete.positive }))(`<- Hey anon, Start by minting test GBC's`)
                }

                return $text(style({ color: pallete.positive }))(`Minted 2 GBC's`)
              }),
              query: merge(map(q => q.then(_ => 1), mintTestGbc), now(Promise.resolve(0)))
            })({}),
          ),
          $seperator2,
          $row(layoutSheet.spacingBig)(
            $Link({
              $content: $anchor(
                $ButtonSecondary({
                  $content: $text('Customize my GBC')
                })({}),
              ),
              url: '/p/wardrobe', route: parentRoute
            })({
              click: changeRouteTether()
            }),
            $Link({
              $content: $anchor(
                $ButtonPrimary({
                  $content: $text('View Store')
                })({}),
              ),
              url: '/p/lab-store', route: parentRoute
            })({
              click: changeRouteTether()
            }),
          ),


        ),
        $row(style({ maxWidth: '80vw', placeSelf: 'center', minWidth: '460px', height: '460px', overflow: 'hidden', borderRadius: '30px' }))(
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
            $loadBerry([undefined, IAttributeClothes.AVALANCHE_HOODIE, undefined, IAttributeExpression.DEAD, IAttributeFaceAccessory.BEARD_WHITE, IAttributeHat.CHRISTMAS_HAT], 460)
          )
        ),
      ),


      $node(),
      $node(),

      $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
        $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Want to get featured?'),
        $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '678px' }))('Are you an artist, a project or an influencer? It is possible to collaborate with us to create items that fit your art or your brand in the Blueberry Lab'),


        $ButtonSecondary({
          $content: $text('Contact us on Telegram')
        })({})
      ),
    ),

    { changeRoute, walletChange }
  ]
})
