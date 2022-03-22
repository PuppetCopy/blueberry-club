import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { $alert, $anchor, $IntermediateTx, $Link } from "@gambitdao/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { $displayBerry } from "../../components/$DisplayBerry"
import { $ButtonPrimary, $ButtonSecondary } from "../../components/form/$Button"
import { $responsiveFlex } from "../../elements/$common"
import { IAttributeHat, IAttributeFaceAccessory, IAttributeClothes, IAttributeExpression, BI_18_PRECISION } from "@gambitdao/gbc-middleware"
import { $seperator2 } from "../common"
import { map, switchLatest } from "@most/core"
import { connect } from "../../logic/gbc"
import { ContractReceipt } from "@ethersproject/contracts"
import { pallete } from "@aelea/ui-components-theme"



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
}

export const $LabLanding = ({ walletLink, parentRoute }: IBerry) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [mintTestGbc, mintTestGbcTether]: Behavior<PointerEvent, Promise<ContractReceipt>>,
) => {



  return [
    $column(layoutSheet.spacingBig)(
      $responsiveFlex(style({ justifyContent: 'space-between' }))(
        $column(layoutSheet.spacingBig, style({ maxWidth: '570px' }))(
          $column(style({ fontSize: screenUtils.isMobileScreen ? '2.1em' : '3.1em' }))(
            $node(
              $text(style({}))(`Bluberry `),
              $text(style({ fontWeight: 'bold' }))( `Lab`),
            ),
          ),

          $text(style({ lineHeight: '1.5em' }))(`Take your GBC to the next level with the Blueberry Lab... Customize your Berry with brand new NFT Accessories (hats, backgrounds and much more). Some of the new accessories will be airdropped to GBC Members over time and others will be available in the Blueberry Lab Store or on secondary sales for purchase.`),

          // $node(),

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

          $seperator2,

          $row(layoutSheet.spacing)(
            $ButtonPrimary({
              $content: $text(`Mint 2 test GBC's`)
            })({
              click: mintTestGbcTether(
                map(() => {
                  const gbc = connect(walletLink)
                  return map(x => {
                    return x.gbc.mint(2, { value: 2n * 30000000000000000n }).then(x => x.wait())
                  }, gbc.contract)
                }),
                switchLatest
              )
            }),

            $IntermediateTx({
              $done: map(res => {
                return $text(style({ color: pallete.positive }))(`Minted 2 GBC's`)
              }),
              query: mintTestGbc
            })({}),
          )

        ),
        $row(style({ minWidth: '460px', height: '460px', overflow: 'hidden', borderRadius: '30px' }))(
          $bgAnimation(
            $displayBerry([undefined, IAttributeClothes.AVALANCHE_HOODIE, undefined, IAttributeExpression.DEAD, IAttributeFaceAccessory.BEARD_WHITE, IAttributeHat.CHRISTMAS_HAT], 460)
          )
        ),
      ),


      $node(),
      $node(),

      $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
        $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Want to get featured?'),
        $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '678px' }))('Are you an artist, a project or an influencer? It is possible to collaborate with us to create items that fit your art or your brand  in the Blueberry Club. '),


        $ButtonSecondary({
          $content: $text('Contact us on Telegram')
        })({})
      ),
      
    ),

    { changeRoute }
  ]
})
