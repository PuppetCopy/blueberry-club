import { Behavior } from "@aelea/core"
import { $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $responsiveFlex } from "../../elements/$common"
import { getLabItemTupleIndex, labItemDescriptionListMap } from "@gambitdao/gbc-middleware"
import { pallete } from "@aelea/ui-components-theme"
import { $Mint } from "../../components/mint/$Mint"
import { WALLET } from "../../logic/provider"
import { $labItem } from "../../logic/common"
import { $seperator2 } from "../common"
import { attributeIndexToLabel } from "../../logic/mappings/label"
import { getMintCount } from "../../logic/contract/sale"
import { map } from "@most/core"
import { readableNumber } from "../../../../@gambitdao-gmx-middleware/src"
import { $anchor } from "@gambitdao/ui-components"
import { $tofunft } from "../../elements/$icons"



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

      $column(style({ gap: '50px', flex: 1 }))(

        $column(layoutSheet.spacingBig)(
          $column(style({  }))(
            $text(style({ fontSize: screenUtils.isMobileScreen ? '2.1em' : '3.1em', fontWeight: 'bold' }))(item.name),

            $row(layoutSheet.spacingTiny)(
              $text(style({ color: pallete.foreground }))(attributeIndexToLabel[getLabItemTupleIndex(item.id)]),
              $text(style({}))(
                map(amount => {
                  const count = item.maxSupply - amount
                  return count
                    ? amount
                      ? `${readableNumber(count)}/${readableNumber(item.maxSupply)} left`
                      : `${readableNumber(item.maxSupply)} in total`
                    : 'Sold Out'
                }, getMintCount(item.contractAddress, 3500))
              ),
            )
          ),
          $text(style({ lineHeight: '1.5em', whiteSpace: 'pre-wrap' }))(item.description.trim()),

          $row(layoutSheet.spacingSmall)(
            $icon({
              $content: $tofunft,
              viewBox: '0 0 32 32'
            }),
            $anchor(attr({ href: `https://tofunft.com/nft/arbi/0x000/` }))(
              $text('Lab Marketplace')
            ),
          ),
        ),

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

