import { Behavior, combineArray } from "@aelea/core"
import { $element, $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { $accountIconLink, $addToCalendar, $responsiveFlex } from "../../elements/$common"
import { attributeIndexToLabel, mintLabelMap, getLabItemTupleIndex, labItemDescriptionListMap, saleMaxSupply, SaleType } from "@gambitdao/gbc-middleware"
import { CHAIN, countdownFn, displayDate, formatFixed, unixTimestampNow } from "@gambitdao/gmx-middleware"
import { pallete } from "@aelea/ui-components-theme"
import { $labItem, takeUntilLast } from "../../logic/common"
import { $seperator2 } from "../common"
import { getMintCount } from "../../logic/contract/sale"
import { empty, map, multicast, switchLatest } from "@most/core"
import { $anchor } from "@gambitdao/ui-components"
import { $opensea } from "../../elements/$icons"
import { $HolderMint } from "../../components/mint/$HolderMint"
import { $WhitelistMint } from "../../components/mint/$WhitelistMint"
import { $PublicMint } from "../../components/mint/$PublicMint"
import { timeChange } from "../../components/mint/mintUtils2"
import { BrowserStore } from "../../logic/store"


interface ILabItem {
  chainList: CHAIN[],
  walletLink: IWalletLink
  parentRoute: Route
}

export const $LabItem = (config: ILabItem) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [clickNotifyMint, clickNotifyMintTether]: Behavior<PointerEvent, PointerEvent>,
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,
) => {

  const urlFragments = document.location.pathname.split('/')
  const [itemIdUrl] = urlFragments.slice(3)
  const itemId = Number(itemIdUrl)

  const item = labItemDescriptionListMap[itemId]
  const berrySize = screenUtils.isDesktopScreen ? '415px' : '100%'
  const totalMintCount = combineArray((...countList) => countList.reduce((seed, next) => seed + next, 0), ...item.mintRuleList.map(rule => getMintCount(rule, config.walletLink, 3500)))

  const externalLinks = [
    $anchor(layoutSheet.spacingTiny, attr({ href: `https://opensea.io/assets/arbitrum/0xf4f935f4272e6fd9c779cf0036589a63b48d77a7/${item.id}` }))(
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
        $anchor(layoutSheet.spacingTiny, attr({ href: el.link }))(
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

              const mintCount = multicast(getMintCount(mintRule, config.walletLink, 15000))
              const mintPriceEth = mintRule.cost === 0n ? 'Free' : formatFixed(mintRule.cost, 18) + ' ETH'

              const publicSaleTime = takeUntilLast(time => time > mintRule.start, timeChange)

              const time = unixTimestampNow()
              const endDate = mintRule.finish
              const isFinished = time > endDate
              const currentSaleType = mintLabelMap[mintRule.type]

              const sale = mintRule.type === SaleType.Public
                ? $PublicMint({ ...config, item, mintRule })({})
                : mintRule.type === SaleType.holder
                  ? $HolderMint({ ...config, item, mintRule })({}) : mintRule.type === SaleType.whitelist
                    ? $WhitelistMint({ ...config, item, mintRule })({}) : empty()

              return [

                $column(layoutSheet.spacingBig)(
                  $row(layoutSheet.spacing, style({ alignItems: 'baseline' }))(
                    $text(style({ fontWeight: 'bold', fontSize: '1.55em' }))(currentSaleType),
                    $row(layoutSheet.spacing)(
                      $accountIconLink(mintRule.contractAddress)
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

                    console.log(mintRule.start)

                    return time < mintRule.start
                      ? $row(layoutSheet.spacing, style({ alignItems: 'baseline' }))(
                        $text(style({ color: pallete.foreground }))('Starting In '),
                        $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                          $addToCalendar({
                            time: new Date(mintRule.start * 1000),
                            title: `blueberry.club MINT - ${item.name}`,
                            description: `${item.description}  \n\n${document.location.href}`
                          }),
                          // $row(style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }))(
                          //   $icon({ $content: $discord, width: '22px', viewBox: `0 0 32 32` })
                          // ),
                          $column(
                            $text(style({ fontSize: '1.55em', fontWeight: 'bold' }))(countdownFn(mintRule.start, time)),
                            $text(style({ fontSize: '.75em' }))(displayDate(mintRule.start)),
                          ),
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

