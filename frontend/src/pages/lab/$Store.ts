import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { $labItem } from "../../logic/common"
import { LabItemDescription, labItemDescriptionList } from "@gambitdao/gbc-middleware"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $Link } from "@gambitdao/ui-components"
import { itemsGlobal } from "../../logic/items"
import { empty, fromPromise, map } from "@most/core"
import { formatFixed, readableNumber, timeSince } from "@gambitdao/gmx-middleware"



interface ILabStore {
  walletLink: IWalletLink
  parentRoute: Route
}

export const $LabStore = ({ walletLink, parentRoute }: ILabStore) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {

  const $labStoreItem = (item: LabItemDescription) => {

    const totalSupply = fromPromise(itemsGlobal.totalSupply(item.id))
    const supplyLeft = map(s => {

      const total = s.toNumber()

      return `${item.maxSupply - total} left`
    }, totalSupply)

    const mintPriceEth = readableNumber(formatFixed(item.mintPrice, 18)) + ' ETH'

    const statusLabel = item.saleDate > Date.now()
      ? 'in ' + timeSince(item.saleDate / 1000) : null
    
    

    return $Link({
      url: `/p/lab-item/${item.id}`,
      route: parentRoute.create({ fragment: 'fefef' }),
      $content: $column(layoutSheet.spacingSmall, style({ position: 'relative' }))(
        style({ backgroundColor: colorAlpha(pallete.message, .95), borderRadius: '18px' }, $labItem(item.id, '185px')),
        $text(style({ fontWeight: 'bold' }))(item.name),
        statusLabel ? $text(style({ fontWeight: 'bold', position: 'absolute', top: '15px', left: '15px', fontSize: '.75em', padding: '5px 10px', color: pallete.message, borderRadius: '8px', backgroundColor: pallete.background }))(
          statusLabel
        ) : empty(),

        $row(style({ placeContent: 'space-evenly', fontSize: '.75em' }))(
          $text(supplyLeft),
          $text(style({ color: pallete.positive }))(mintPriceEth)
        )
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
        $row(screenUtils.isDesktopScreen ? style({ gap: '30px' }) : layoutSheet.spacingBig, style({ overflow: 'hidden', placeContent: 'space-between', flexWrap: 'wrap' }))(
          ...labItemDescriptionList.map(item => $labStoreItem(item))
        ),
      ),


      $node(),


      
    ),

    { changeRoute }
  ]
})
