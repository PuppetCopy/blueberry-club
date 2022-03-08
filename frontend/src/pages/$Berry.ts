import { Behavior } from "@aelea/core"
import { $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { $anchor } from "@gambitdao/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { $logo } from "../common/$icons"
import { $DisplayBerry } from "../components/$DisplayBerry"
import { $ButtonPrimary, $ButtonSecondary } from "../components/form/$Button"
import { $responsiveFlex } from "../elements/$common"
import { $tofunft } from "../elements/$icons"
import { IAttributeBackground, IAttributeClothes, IAttributeFaceAccessory, IAttributeHat, IAttributeMappings, IBerryMetadata, IIAttributeExpression } from "../types"
import { $seperator2 } from "./common"

export function bnToHex(n: bigint) {
  return '0x' + n.toString(16)
}


export function getMetadataLabels([bg, cloth, body, expr, faceAce, hat]: IBerryMetadata) {

  return {
    background: {
      label: 'Background',
      value:  IAttributeMappings[bg]
    },
    clothes: {
      label: 'Clothes',
      value: IAttributeMappings[cloth],
    },
    body: {
      label: 'Body',
      value: IAttributeMappings[body],
    },
    expression: {
      label: 'Expression',
      value: IAttributeMappings[expr],
    },
    faceAccessory: {
      label: 'Face Accessory',
      value: IAttributeMappings[faceAce],
    },
    hat: {
      label: 'Hat',
      value: IAttributeMappings[hat],
    },
  }
}


interface IBerry {
  walletLink: IWalletLink
  parentRoute: Route
  // walletStore: cstate.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}

export const $Berry = ({ walletLink, parentRoute }: IBerry) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
) => {


  return [
    $column(layoutSheet.spacingBig)(
      $responsiveFlex(style({ justifyContent: 'space-between' }))(
        $column(layoutSheet.spacingBig, style({ maxWidth: '620px' }))(
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
            $ButtonPrimary({
              $content: $text('Customize my GBC')
            })({}),
            $ButtonSecondary({
              $content: $text('Buy Items')
            })({})
          )

        ),
        $row(style({ minWidth: '400px', height: '400px', overflow: 'hidden', borderRadius: '30px' }))(
          $DisplayBerry({
            size: '400px',
            background: IAttributeBackground.BLUE,
            clothes: IAttributeClothes.ARMY_GREEN,
            expression: IIAttributeExpression.ANGRY,
            faceAccessory: IAttributeFaceAccessory.BEARD_GREEN,
            hat: IAttributeHat.AFRO_GREEN
          })({})
        ),
      ),


      
    )
  ]
})
