import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet } from "@aelea/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { $labItem } from "../../logic/common"
import { LabItemDescription, labItemDescriptionList } from "@gambitdao/gbc-middleware"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $Link } from "@gambitdao/ui-components"




interface ILabStore {
  walletLink: IWalletLink
  parentRoute: Route
}

export const $LabStore = ({ walletLink, parentRoute }: ILabStore) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {

  const $labStoreItem = (item: LabItemDescription) => {

    return $Link({
      url: `/p/lab-item/${item.id}`,
      route: parentRoute.create({ fragment: 'fefef' }),
      $content: $column(layoutSheet.spacingSmall, style({ position: 'relative' }))(
        style({ backgroundColor: colorAlpha(pallete.message, .95), borderRadius: '18px' }, $labItem(item.id, '185px')),
        $text(style({ fontWeight: 'bold' }))(item.name),
        $text(style({ fontWeight: 'bold', position: 'absolute', top: '15px', left: '15px', fontSize: '.75em', padding: '5px 10px', color: pallete.message, borderRadius: '8px', backgroundColor: pallete.background }))('NEW'),
      )
    })({
      click: changeRouteTether()
    })
  }


  return [
    $column(layoutSheet.spacingBig)(

      $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
        $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Blueberry Lab Store'),
        $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '678px' }))('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum a velit vitae quam gravida efficitur. Maecenas fringilla tempor eros, non congue justo placerat nec. '),
      ),

      $column(layoutSheet.spacingBig, style({ justifyContent: 'space-between' }))(
        $text(style({ fontWeight: 'bold', fontSize: '1.8em' }))('Items'),
        $row(layoutSheet.spacingBig, style({ overflow: 'hidden', flexWrap: 'wrap' }))(

          ...labItemDescriptionList.map(item => $labStoreItem(item))
          
        ),
      ),


      $node(),


      
    ),

    { changeRoute }
  ]
})
