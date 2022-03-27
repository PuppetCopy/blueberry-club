import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $responsiveFlex } from "../../elements/$common"
import { labItemDescriptionListMap } from "@gambitdao/gbc-middleware"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $Mint } from "../../components/$Mint"
import { WALLET } from "../../logic/provider"
import { $labItem } from "../../logic/common"



interface ILabItem {
  walletLink: IWalletLink
  parentRoute: Route
  walletStore: state.BrowserStore<WALLET, "walletStore">
}

export const $LabItem = ({ walletLink, walletStore, parentRoute }: ILabItem) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {
  const urlFragments = document.location.pathname.split('/')
  const [itemIdUrl] = urlFragments.slice(3)
  const itemId = Number(itemIdUrl)

  const item = labItemDescriptionListMap[itemId]


 
  
  return [
    $column(layoutSheet.spacingBig)(
      $responsiveFlex(style({ justifyContent: 'space-between' }))(
        style({  minWidth: '450px', height: '450px', overflow: 'hidden', borderRadius: '30px', backgroundColor: colorAlpha(pallete.message, .95) }, $labItem(item.id)),

        $column(layoutSheet.spacingBig, style({ maxWidth: '620px' }))(
          $column(style({ fontSize: screenUtils.isMobileScreen ? '2.1em' : '3.1em' }))(
            $node(
              $text(style({}))(`Lab's `),
              $text(style({ fontWeight: 'bold' }))( item.name),
            ),
          ),

          $text(style({ lineHeight: '1.5em' }))(item.description),



          $Mint({
            walletLink,
            walletStore,
            item,
          })({})





        ),
        
      ),



      
    ),

    { changeRoute }
  ]
})

