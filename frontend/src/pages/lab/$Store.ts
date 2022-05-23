import { Behavior, O, Tether } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { $labItem } from "../../logic/common"
import { LabItemSaleDescription, saleDescriptionList, SaleType } from "@gambitdao/gbc-middleware"
import { pallete } from "@aelea/ui-components-theme"
import { $Link } from "@gambitdao/ui-components"
import { empty, map } from "@most/core"
import { formatFixed, readableNumber, timeSince, unixTimestampNow } from "@gambitdao/gmx-middleware"
import { getMintCount } from "../../logic/contract/sale"



interface ILabStore {
  walletLink: IWalletLink
  parentRoute: Route
}

export const $LabStore = ({ walletLink, parentRoute }: ILabStore) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {
  

  return [
    $column(layoutSheet.spacingBig)(

      $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
        $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Blueberry Lab Store'),
        $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '678px' }))('You will find here the different items available to customize your GBC'),
      ),

      $column(layoutSheet.spacingBig, style({ justifyContent: 'space-between' }))(
        $text(style({ fontWeight: 'bold', fontSize: '1.8em' }))('Items'),
        $row(screenUtils.isDesktopScreen ? style({ gap: '50px', placeContent: 'center', flexWrap: 'wrap' }) : O(layoutSheet.spacingBig, style({ overflow: 'hidden', placeContent: 'space-evenly', flexWrap: 'wrap' })))(
          ...saleDescriptionList.map(item =>
            $labStoreItem(item, parentRoute, changeRouteTether)
          )
        ),
      ),

      $node(),
    ),

    { changeRoute }
  ]
})

const $labStoreItem = (item: LabItemSaleDescription, parentRoute: Route, changeRouteTether: Tether<string, string>) => {

  const supplyLeft = map(amount => {
    const count = item.maxSupply - amount
    return count ? `${count} left` : 'Sold Out'
  }, getMintCount(item.contractAddress, 15000))

  const unixTime = unixTimestampNow()

  const isWhitelist = item.type === SaleType.GbcWhitelist
  const currentSaleType = isWhitelist ? 'Whitelist' : 'Public'
  const upcommingSaleDate = isWhitelist ? item.whitelistStartDate : item.publicStartDate

  const isSaleUpcomming = upcommingSaleDate > unixTime

  const statusLabel = isSaleUpcomming ?
    `${currentSaleType} in ` + timeSince(upcommingSaleDate)
    : currentSaleType
    
  const price = isWhitelist ? item.whitelistCost : item.publicCost

  const mintPriceEth = price === 0n ? 'Free' : readableNumber(formatFixed(price, 18)) + ' ETH'



  return $Link({
    url: `/p/item/${item.id}`,
    anchorOp: screenUtils.isMobileScreen ? style({ maxWidth: '160px' }) : style({ flexBasis: '25' }),
    route: parentRoute.create({ fragment: 'fefef' }),
    $content: $column(layoutSheet.spacingSmall, style({ position: 'relative', flexDirection: 'column' }))(
      $column(style({ position: 'relative' }))(
        $labItem(item.id, screenUtils.isDesktopScreen ? 173 : 160, true, true),
        statusLabel ? $text(style({ fontWeight: 'bold', position: 'absolute', top:  screenUtils.isDesktopScreen ? '15px' : '8px', left: screenUtils.isDesktopScreen ? '15px' : '8px', fontSize: '.75em', padding: '5px 10px', color: pallete.message, borderRadius: '8px', backgroundColor: pallete.background }))(
          statusLabel
        ) : empty(),
      ),
      $text(style({ fontWeight: 'bold' }))(item.name),

      $row(style({ placeContent: 'space-between', fontSize: '.75em' }))(
        $text(supplyLeft),
        $text(style({ color: pallete.positive }))(mintPriceEth)
      )
    )
  })({
    click: changeRouteTether()
  })
}
