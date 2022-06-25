import { Behavior } from "@aelea/core"
import { $element, $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $accountIconLink, $responsiveFlex } from "../../elements/$common"
import { attributeIndexToLabel, mintLabelMap, GBC_ADDRESS, getLabItemTupleIndex, labItemDescriptionListMap, saleLastDate, saleMaxSupply, SaleType } from "@gambitdao/gbc-middleware"
import { countdownFn, displayDate, unixTimestampNow } from "@gambitdao/gmx-middleware"
import { pallete } from "@aelea/ui-components-theme"
import { WALLET } from "../../logic/provider"
import { $labItem, takeUntilLast } from "../../logic/common"
import { $seperator2 } from "../common"
import { getMintCount } from "../../logic/contract/sale"
import { empty, map, multicast, switchLatest } from "@most/core"
import { $anchor } from "@gambitdao/ui-components"
import { $tofunft } from "../../elements/$icons"
import { $GbcWhitelist } from "../../components/mint/$HolderMint"
import { $WhitelistMint } from "../../components/mint/$WhitelistMint"
import { $PublicMint } from "../../components/mint/$PublicMint"
import { timeChange } from "../../components/mint/mintUtils2"
import { IEthereumProvider } from "eip1193-provider"
import { $logo } from "../../common/$icons"


interface ILabItem {
  walletLink: IWalletLink
  parentRoute: Route
  walletStore: state.BrowserStore<WALLET, "walletStore">
}

export const $LabItem = ({ walletLink, walletStore, parentRoute }: ILabItem) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
) => {

  const urlFragments = document.location.pathname.split('/')
  const [itemIdUrl] = urlFragments.slice(3)
  const itemId = Number(itemIdUrl)

  const item = labItemDescriptionListMap[itemId]
  const berrySize = screenUtils.isDesktopScreen ? '415px' : '100%'
  const activeMint = saleLastDate(item)


  return [
    $responsiveFlex(screenUtils.isDesktopScreen ? style({ gap: '50px' }) : layoutSheet.spacingBig)(
      $column(style({ width: berrySize, minHeight: berrySize }))(
        $labItem(item.id, berrySize, true, true)
      ),

      $column(style({ gap: '50px', flex: 5 }))(

        $column(layoutSheet.spacingBig)(
          $column(style({}))(
            $text(style({ fontSize: screenUtils.isMobileScreen ? '2.1em' : '3.1em', fontWeight: 'bold' }))(item.name),

            $row(layoutSheet.spacingTiny)(
              $text(style({ color: pallete.foreground }))(attributeIndexToLabel[getLabItemTupleIndex(item.id)]),
              $text(style({}))(
                map(amount => {
                  const max = saleMaxSupply(item)

                  return `${amount}/${max} minted`
                }, getMintCount(activeMint, 3500))
              ),
            )
          ),
          $text(style({ lineHeight: '1.5em', whiteSpace: 'pre-wrap' }))(item.description.trim()),

          $row(layoutSheet.spacingSmall)(
            $icon({
              $content: $logo,
              viewBox: '0 0 32 32'
            }),
            $anchor(attr({
              href: `https://stratosnft.io/collection/blueberrylab`
            }))(
              $text('Lab Marketplace')
            ),
          ),


        ),

        $seperator2,

        $column(layoutSheet.spacingBig)(
          $column(style({ gap: '50px' }))(

            ...item.mintRuleList.flatMap((mintRule, idx) => {

              const mintCount = multicast(getMintCount(mintRule, 15000))


              const publicSaleTime = takeUntilLast(time => time > mintRule.start, timeChange)

              const time = unixTimestampNow()
              const endDate = mintRule.finish
              const isFinished = time > endDate
              const currentSaleType = mintLabelMap[mintRule.type]

              const sale = mintRule.type === SaleType.Public
                ? $PublicMint({ item, mintRule, walletLink, walletStore })({})
                : mintRule.type === SaleType.holder
                  ? $GbcWhitelist({ item, mintRule, walletLink, walletStore })({}) : mintRule.type === SaleType.whitelist
                    ? $WhitelistMint({ item, mintRule, walletLink, walletStore })({}) : empty()

              return [

                $column(layoutSheet.spacingBig)(
                  $row(layoutSheet.spacing, style({ alignItems: 'baseline' }))(
                    $text(style({ fontWeight: 'bold', fontSize: '1.55em' }))(currentSaleType),
                    $row(layoutSheet.spacing)(
                      $accountIconLink(mintRule.contractAddress),
                      $node(
                        // $text(style({ color: pallete.foreground }))(isFinished ? `Ended on ` : `Sale will close in `),
                        // $text(displayDate(endDate))
                      )
                    ),
                    $node(style({ flex: 1 }))(),
                    switchLatest(map(amount => {
                      const count = Number(amount)
                      const isSoldOut = count === mintRule.supply

                      const $supply = isSoldOut
                        ? $row(layoutSheet.spacingTiny)(
                          $text(style({ color: pallete.foreground }))(`Sold Out`),
                          $text(String(mintRule.supply))
                        )
                        : $row(layoutSheet.spacingTiny)(
                          $text(style({ color: pallete.foreground }))(`Minted`),
                          $text(`${count}/${mintRule.supply}`)
                        )

                      return $supply
                    }, mintCount))
                  ),

                  isFinished ? empty() : switchLatest(map(time => {

                    return time < mintRule.start
                      ? $row(layoutSheet.spacing, style({ alignItems: 'baseline' }))(
                        $text(style({ color: pallete.foreground }))('Starting In '),
                        $text(style({ fontSize: '1.55em', fontWeight: 'bold' }))(countdownFn(mintRule.start, time))
                      )
                      : sale
                  }, publicSaleTime)),

                  switchLatest(map(amount => {
                    const count = Number(amount)
                    const isSoldOut = count === mintRule.supply

                    return $row(layoutSheet.spacingTiny, style({ fontSize: '.75em' }))(
                      isSoldOut
                        ? $text(style({ color: pallete.foreground }))('Sale has sold out!')
                        : $element('ul')(style({ lineHeight: '1.5em' }))(
                          $element('li')(
                            $text(style({ color: pallete.foreground }))(`limit of `),
                            $text(`${mintRule.accountLimit}`),
                            $text(style({ color: pallete.foreground }))(` tokens per address`),
                          ),
                          $element('li')(
                            $text(style({ color: pallete.foreground }))(isFinished ? 'Sale Settled on ' : 'Sale will automatically settle in '),
                            $text(displayDate(mintRule.finish))
                          ),
                        )
                    )
                  }, mintCount))
                ),
                idx < item.mintRuleList.length - 1 ? $seperator2 : empty()
              ]
            })

          ),
        )

      ),
    ),

    { changeRoute, walletChange }
  ]
})

