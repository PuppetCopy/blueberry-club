import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { $labItem } from "../../logic/common"
import { LabItemSaleDescription, saleDescriptionList, hasWhitelistSale } from "@gambitdao/gbc-middleware"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $Link } from "@gambitdao/ui-components"
import { itemsGlobal } from "../../logic/items"
import { empty, fromPromise, map } from "@most/core"
import { formatFixed, readableNumber, timeSince, unixTimestampNow } from "@gambitdao/gmx-middleware"



interface ILabStore {
  walletLink: IWalletLink
  parentRoute: Route
}

export const $LabStore = ({ walletLink, parentRoute }: ILabStore) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {

  const $labStoreItem = (item: LabItemSaleDescription) => {

    const totalSupply = fromPromise(itemsGlobal.totalSupply(item.id))
    const supplyLeft = map(s => {

      const total = s.toBigInt()

      return `${item.maxSupply - total} left`
    }, totalSupply)

    const unixTime = unixTimestampNow()

    const isWhitelist = hasWhitelistSale(item)
    const currentSaleType = isWhitelist ? 'Whitelist' : 'Public'
    const upcommingSaleDate = isWhitelist ? item.whitelistStartDate : item.publicStartDate

    const isSaleLive = upcommingSaleDate > unixTime

    const statusLabel = isSaleLive ?
      `${currentSaleType} in ` + timeSince(upcommingSaleDate)
      : currentSaleType
    
    const price = isWhitelist ? item.whitelistCost : item.publicCost

    const mintPriceEth = price === 0n ? 'Free' : readableNumber(formatFixed(price, 18)) + ' ETH'


    return $Link({
      url: `/p/lab-item/${item.id}`,
      route: parentRoute.create({ fragment: 'fefef' }),
      $content: $column(layoutSheet.spacingSmall, style({ position: 'relative' }))(
        style({ backgroundColor: colorAlpha(pallete.message, .95), borderRadius: '18px' }, $labItem(item.id, screenUtils.isDesktopScreen ? 185 : 140)),
        $text(style({ fontWeight: 'bold' }))(item.name),
        statusLabel ? $text(style({ fontWeight: 'bold', position: 'absolute', top: '15px', left: '15px', fontSize: '.75em', padding: '5px 10px', color: pallete.message, borderRadius: '8px', backgroundColor: pallete.background }))(
          statusLabel
        ) : empty(),

        $row(style({ placeContent: 'space-between', fontSize: '.75em' }))(
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
        $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '678px' }))('You will find here the different items available to customize your GBC'),
      ),

      $column(layoutSheet.spacingBig, style({ justifyContent: 'space-between' }))(
        $text(style({ fontWeight: 'bold', fontSize: '1.8em' }))('Items'),
        $row(screenUtils.isDesktopScreen ? style({ gap: '57px' }) : layoutSheet.spacingBig, style({ overflow: 'hidden', flexWrap: 'wrap' }))(
          ...saleDescriptionList.map(item => $labStoreItem(item))
        ),
      ),


      $node(),


      
    ),

    { changeRoute }
  ]
})
