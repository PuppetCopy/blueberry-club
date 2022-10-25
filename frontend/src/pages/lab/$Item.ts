import { Behavior, combineArray } from "@aelea/core"
import { $element, $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $accountIconLink, $responsiveFlex } from "../../elements/$common"
import { attributeIndexToLabel, mintLabelMap, getLabItemTupleIndex, labItemDescriptionListMap, saleMaxSupply, SaleType } from "@gambitdao/gbc-middleware"
import { countdownFn, displayDate, formatFixed, unixTimestampNow } from "@gambitdao/gmx-middleware"
import { pallete } from "@aelea/ui-components-theme"
import { WALLET } from "../../logic/provider"
import { $labItem, takeUntilLast } from "../../logic/common"
import { $seperator2 } from "../common"
import { getMintCount } from "../../logic/contract/sale"
import { empty, map, multicast, switchLatest } from "@most/core"
import { $anchor } from "@gambitdao/ui-components"
import { $opensea } from "../../elements/$icons"
import { $GbcWhitelist } from "../../components/mint/$HolderMint"
import { $WhitelistMint } from "../../components/mint/$WhitelistMint"
import { $PublicMint } from "../../components/mint/$PublicMint"
import { timeChange } from "../../components/mint/mintUtils2"
import { IEthereumProvider } from "eip1193-provider"


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
  const totalMintCount = combineArray((...countList) => countList.reduce((seed, next) => seed + next, 0), ...item.mintRuleList.map(rule => getMintCount(rule, 3500)))

  const externalLinks = [
    $anchor(layoutSheet.spacingTiny, attr({ href: `https://opensea.io/assets/arbitrum/0xf4f935f4272e6fd9c779cf0036589a63b48d77a7/${item.id}`, target: '_blank' }))(
      $icon({
        $content: $opensea,
        viewBox: '0 0 32 32'
      }),
      $text('Trade')
    )
  ]

  if (item.externalLinks) {
    item.externalLinks.forEach(el => {
      externalLinks.unshift(
        $anchor(layoutSheet.spacingTiny, attr({ href: el.link, target: '_blank' }))(
          $text(el.name)
        )
      )
    })
  }

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
                }, totalMintCount)
              ),
            )
          ),
          $text(style({ lineHeight: '1.5em', whiteSpace: 'pre-wrap' }))(item.description.trim()),
          ...externalLinks,
        ),

        $seperator2,

        $column(layoutSheet.spacingBig)(
          $column(style({ gap: '50px' }))(

            ...item.mintRuleList.flatMap((mintRule, idx) => {

              const mintCount = multicast(getMintCount(mintRule, 15000))
              const mintPriceEth = mintRule.cost === 0n ? 'Free' : formatFixed(mintRule.cost, 18) + ' ETH'

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

                  switchLatest(combineArray((time, mintedAmount) => {
                    if (mintedAmount === mintRule.supply) {
                      return empty()
                    }

                    if (isFinished) {
                      return $text(style({ color: pallete.foreground }))(`Sale Finished!`)
                    }

                    return time < mintRule.start
                      ? $row(layoutSheet.spacing, style({ alignItems: 'baseline' }))(
                        $text(style({ color: pallete.foreground }))('Starting In '),
                        $column(
                          $text(style({ fontSize: '1.55em', fontWeight: 'bold' }))(countdownFn(mintRule.start, time)),
                          $text(style({ fontSize: '.75em' }))(displayDate(mintRule.start)),
                        )
                      )
                      : sale
                  }, publicSaleTime, mintCount)),

                  $row(layoutSheet.spacingTiny, style({ fontSize: '.75em' }))(
                    $element('ul')(style({ lineHeight: '1.5em' }))(
                      $element('li')(
                        $text(style({ color: pallete.foreground }))(`Cost to mint `),
                        $text(`${mintPriceEth}`),
                      ),
                      $element('li')(
                        $text(style({ color: pallete.foreground }))(`limit of `),
                        $text(`${mintRule.accountLimit}`),
                        $text(style({ color: pallete.foreground }))(` tokens per wallet address`),
                      ),
                      $element('li')(
                        $text(style({ color: pallete.foreground }))(isFinished ? 'Sale Settled on ' : 'Sale will automatically settle in '),
                        $text(displayDate(mintRule.finish))
                      ),
                    )
                  )

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

