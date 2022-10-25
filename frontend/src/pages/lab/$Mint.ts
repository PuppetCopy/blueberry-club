import { Tether } from "@aelea/core"
import { style, $text } from "@aelea/dom"
import { Route } from "@aelea/router"
import { screenUtils, $column, layoutSheet, $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { LabItemSale, MintRule, mintLabelMap } from "@gambitdao/gbc-middleware"
import { unixTimestampNow, timeSince, formatFixed } from "@gambitdao/gmx-middleware"
import { $Link } from "@gambitdao/ui-components"
import { map, multicast } from "@most/core"
import { $labItem } from "../../logic/common"
import { getMintCount } from "../../logic/contract/sale"

export const $Mint = (item: LabItemSale, rule: MintRule, parentRoute: Route, changeRouteTether: Tether<string, string>) => {

  const mintCount = multicast(getMintCount(rule, 15000))

  const supplyLeft = map(amount => {
    const count = rule.supply - Number(amount)
    return unixTime > rule.finish ? `${amount} Sold` : `${count} left`
  }, mintCount)

  const unixTime = unixTimestampNow()
  const upcommingSaleDate = rule.start

  const isSaleUpcomming = upcommingSaleDate > unixTime
  const price = rule.cost

  const mintPriceEth = price === 0n ? 'Free' : formatFixed(price, 18) + ' ETH'

  const currentSaleType = mintLabelMap[rule.type]

  const statusLabel = isSaleUpcomming ?
    `${currentSaleType} in ` + timeSince(upcommingSaleDate)
    : currentSaleType


  const $saleRuleType = $row(style({ borderRadius: '8px', overflow: 'hidden', position: 'absolute', top: screenUtils.isDesktopScreen ? '15px' : '8px', left: screenUtils.isDesktopScreen ? '15px' : '8px', }))(
    $text(
      style({ fontWeight: 'bold', backgroundColor: pallete.background, fontSize: '.65em', padding: '5px 10px', color: pallete.message }),
    )(
      statusLabel
    )
  )

  return $Link({
    url: `/p/item/${item.id}`,
    anchorOp: screenUtils.isMobileScreen ? style({ maxWidth: '160px' }) : style({ maxWidth: '180px' }),
    route: parentRoute.create({ fragment: 'fefef' }),
    $content: $column(layoutSheet.spacingSmall, style({ position: 'relative', flexDirection: 'column' }))(
      $column(style({ position: 'relative' }))(
        $labItem(item.id, screenUtils.isDesktopScreen ? 173 : 160, true, true),
        $saleRuleType,
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