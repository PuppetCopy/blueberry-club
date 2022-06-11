import { Tether } from "@aelea/core"
import { style, $text } from "@aelea/dom"
import { Route } from "@aelea/router"
import { screenUtils, $column, layoutSheet, $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { LabItemSale, saleMaxSupply, saleLastDate } from "@gambitdao/gbc-middleware"
import { unixTimestampNow, timeSince, readableNumber, formatFixed } from "@gambitdao/gmx-middleware"
import { $Link } from "@gambitdao/ui-components"
import { empty, map } from "@most/core"
import { $labItem } from "../../logic/common"
import { getMintCount } from "../../logic/contract/sale"
import { mintLabelMap } from "../../logic/mappings/label"

export const $StoreItemPreview = (item: LabItemSale, parentRoute: Route, changeRouteTether: Tether<string, string>) => {
  const max = saleMaxSupply(item)

  const activeMint = saleLastDate(item)

  const supplyLeft = map(amount => {
    const count = max - Number(amount)
    return count ? `${count} left` : 'Sold Out'
  }, getMintCount(item.contractAddress, 15000))

  const unixTime = unixTimestampNow()
  const currentSaleType = mintLabelMap[activeMint.type]
  const upcommingSaleDate = activeMint.start

  const isSaleUpcomming = upcommingSaleDate > unixTime

  const statusLabel = isSaleUpcomming ?
    `${currentSaleType} in ` + timeSince(upcommingSaleDate)
    : currentSaleType

  const price = activeMint.cost

  const mintPriceEth = price === 0n ? 'Free' : readableNumber(formatFixed(price, 18)) + ' ETH'



  return $Link({
    url: `/p/item/${item.id}`,
    anchorOp: screenUtils.isMobileScreen ? style({ maxWidth: '160px' }) : style({ flexBasis: '25' }),
    route: parentRoute.create({ fragment: 'fefef' }),
    $content: $column(layoutSheet.spacingSmall, style({ position: 'relative', flexDirection: 'column' }))(
      $column(style({ position: 'relative' }))(
        $labItem(item.id, screenUtils.isDesktopScreen ? 173 : 160, true, true),
        statusLabel ? $text(style({ fontWeight: 'bold', position: 'absolute', top: screenUtils.isDesktopScreen ? '15px' : '8px', left: screenUtils.isDesktopScreen ? '15px' : '8px', fontSize: '.75em', padding: '5px 10px', color: pallete.message, borderRadius: '8px', backgroundColor: pallete.background }))(
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