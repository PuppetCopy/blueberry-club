import { Behavior } from "@aelea/core"
import { $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $accountIconLink, $responsiveFlex } from "../../elements/$common"
import { GBC_ADDRESS, getLabItemTupleIndex, labItemDescriptionListMap, saleConfig, saleLastDate, saleMaxSupply, SaleType } from "@gambitdao/gbc-middleware"
import { countdownFn, displayDate, unixTimestampNow } from "@gambitdao/gmx-middleware"
import { pallete } from "@aelea/ui-components-theme"
import { WALLET } from "../../logic/provider"
import { $labItem, takeUntilLast } from "../../logic/common"
import { $seperator2 } from "../common"
import { attributeIndexToLabel, mintLabelMap } from "../../logic/mappings/label"
import { connectMintable, getMintCount } from "../../logic/contract/sale"
import { awaitPromises, empty, map, switchLatest } from "@most/core"
import { $anchor } from "@gambitdao/ui-components"
import { $tofunft } from "../../elements/$icons"
import { $GbcWhitelist } from "../../components/mint/$HolderMint"
import { $PrivateMint } from "../../components/mint/$PrivateMint"
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


  const mintable = connectMintable(walletLink, item.contractAddress)

  const endDate = saleLastDate(item).start + saleConfig.saleDuration
  const isFinished = unixTimestampNow() > endDate

  return [
    $responsiveFlex(screenUtils.isDesktopScreen ? style({ gap: '50px' }) : layoutSheet.spacingBig)(
      $row(style({ minWidth: '415px' }))($labItem(item.id, 415, true, true)),

      $column(style({ gap: '50px', flex: 1 }))(

        $column(layoutSheet.spacingBig)(
          $column(style({}))(
            $text(style({ fontSize: screenUtils.isMobileScreen ? '2.1em' : '3.1em', fontWeight: 'bold' }))(item.name),

            $row(layoutSheet.spacingTiny)(
              $text(style({ color: pallete.foreground }))(attributeIndexToLabel[getLabItemTupleIndex(item.id)]),
              $text(style({}))(
                map(amount => {
                  const max = saleMaxSupply(item)
                  const count = max - Number(amount)

                  return `${amount} sold`
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
            $anchor(attr({
              href: `https://tofunft.com/nft/arbi/${GBC_ADDRESS.LAB}`
            }))(
              $text('Lab Marketplace')
            ),
          ),


          $row(layoutSheet.spacing)(
            $accountIconLink(item.contractAddress),
            $node(
              $text(style({ color: pallete.foreground }))(isFinished ? `Ended on ` : `Sale will close in `),
              $text(displayDate(endDate))
            )
          ),

        ),

        $seperator2,

        $column(layoutSheet.spacingBig)(
          $column(style({ gap: '50px' }))(

            ...item.mintRuleList.flatMap(mintRule => {

              const publicSaleTimeDelta = takeUntilLast(delta => delta === null, awaitPromises(map(async (time) => {
                const deltaTime = mintRule.start - time
                return deltaTime > 0 ? deltaTime : null
              }, timeChange)))

              const currentSaleType = mintLabelMap[mintRule.type]

              const sale = mintRule.type === SaleType.Public
                ? $PublicMint({ item, mintRule, walletLink, walletStore })({})
                : mintRule.type === SaleType.holder
                  ? $GbcWhitelist({ item, mintRule, walletLink, walletStore })({}) : mintRule.type === SaleType.private
                    ? $PrivateMint({ item, mintRule, walletLink, walletStore })({}) : empty()


              return [
                switchLatest(map(timeDelta => {

                  const whitelistTimeDelta = takeUntilLast(delta => delta === null, awaitPromises(map(async (time) => {
                    const deltaTime = mintRule.start - time
                    return deltaTime > 0 ? deltaTime : null
                  }, timeChange)))

                  // const max = saleMaxSupply(config.item)

                  return $column(layoutSheet.spacing)(
                    $row(layoutSheet.spacing, style({ alignItems: 'baseline' }))(
                      $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                        $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))(currentSaleType),
                        $text(style({}))(String(mintRule.amount)),
                      ),
                    ),

                    ...timeDelta
                      ? [
                        // $row(layoutSheet.spacing, style({ alignItems: 'baseline' }))(
                        //   $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))(`Whitelist`),

                        //   $text(
                        //     switchLatest(map(timeDelta => {
                        //       const hasEnded = timeDelta === null

                        //       return hasEnded
                        //         ? map(totalMinted => {
                        //           const count = max - totalMinted.toNumber()
                        //           return count ? `${config.mintRule.amount}/${config.mintRule.amount} left` : 'Sold Out'
                        //         }, saleWallet.whitelistMinted)
                        //         : now(countdownFn(unixTimestampNow() + timeDelta, unixTimestampNow()))

                        //     }, whitelistTimeDelta))
                        //   ),
                        // ),
                        $text(countdownFn(unixTimestampNow() + timeDelta, unixTimestampNow()))
                      ]
                      : [
                        sale
                        // $text(map(count => `${item.whitelistMax - count.toBigInt()}/${item.whitelistMax} left`, saleWallet.whitelistMinted)),
                      ],
                  )
                }, publicSaleTimeDelta)),
                $seperator2
              ]
            })

          ),
        )

      ),
    ),

    { changeRoute, walletChange }
  ]
})

