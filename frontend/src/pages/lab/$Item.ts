import { Behavior } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $responsiveFlex } from "../../elements/$common"
import { getLabItemTupleIndex, labItemDescriptionListMap } from "@gambitdao/gbc-middleware"
import { pallete } from "@aelea/ui-components-theme"
import { $Mint } from "../../components/$Mint"
import { WALLET } from "../../logic/provider"
import { $labItem } from "../../logic/common"
import { $seperator2 } from "../common"
import { attributeIndexToLabel } from "../../logic/mappings/label"
import { getMintCount } from "../../logic/contract/sale"
import { map } from "@most/core"



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
    $responsiveFlex(screenUtils.isDesktopScreen ? style({ gap: '50px' }): layoutSheet.spacingBig)(
      $labItem(item.id, 415, true, true),

      $column(layoutSheet.spacingBig, style({ flex: 1 }))(
        $column(style({  }))(
          $text(style({ fontSize: screenUtils.isMobileScreen ? '2.1em' : '3.1em', fontWeight: 'bold' }))(item.name),

          $row(layoutSheet.spacingTiny)(
            $text(style({ color: pallete.foreground }))(attributeIndexToLabel[getLabItemTupleIndex(item.id)]),
            $text(style({  }))(map(count => count ? ` ${item.maxSupply - count}/${item.maxSupply} left` : '', getMintCount(item.contractAddress, 3500))),
          )
          
        ),
        $text(style({ lineHeight: '1.5em', whiteSpace: 'pre-wrap' }))(item.description.trim()),

        $seperator2,

        $Mint({
          walletLink,
          walletStore,
          item,
        })({})

      ),
    ),

    { changeRoute }
  ]
})

