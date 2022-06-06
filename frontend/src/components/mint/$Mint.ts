import { Behavior } from "@aelea/core"
import { $element, $text, component, style } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { LabItemSale, SaleType } from "@gambitdao/gbc-middleware"
import { countdownFn } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, empty, map, switchLatest } from "@most/core"
import { IEthereumProvider } from "eip1193-provider"
import { $gift } from "../../elements/$icons"
import { $IntermediateConnectButton } from "../$ConnectAccount"
import { WALLET } from "../../logic/provider"
import { takeUntilLast } from "../../logic/common"
import { $seperator2 } from "../../pages/common"
import { $GbcWhitelist } from "./$GbcWhitelist"
import { timeChange } from "./mintUtils2"
import { $PublicMint } from "./$PublicMint"
import { mintLabelMap } from "../../logic/mappings/label"
import { $PrivateMint } from "./$Private"



export interface IMint {
  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">
  item: LabItemSale
}


export const $Mint = ({ walletStore, walletLink, item }: IMint) => component((
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,

) => {



  return [
    $IntermediateConnectButton({
      walletStore,
      $container: $column(layoutSheet.spacingBig),
      $display: map(() => {

        return $column(layoutSheet.spacingBig)(
          $column(style({ gap: '50px' }))(

            ...item.mintRuleList.flatMap(mintRule => {

              const publicSaleTimeDelta = takeUntilLast(delta => delta === null, awaitPromises(map(async (time) => {
                const deltaTime = mintRule.start - time
                return deltaTime > 0 ? deltaTime : null
              }, timeChange)))


              const sale = mintRule.type === SaleType.Public
                ? $PublicMint(item, mintRule, walletLink)({})
                : mintRule.type === SaleType.holder
                  ? $GbcWhitelist(item, mintRule, walletLink)({}) : mintRule.type === SaleType.private
                    ? $PrivateMint(item, mintRule, walletLink)({}) : empty()
              const currentSaleType = mintLabelMap[mintRule.type]

              return [
                switchLatest(map(timeDelta => {
                  const hasEnded = timeDelta === null

                  return $column(layoutSheet.spacing)(
                    $row(layoutSheet.spacing, style({ alignItems: 'baseline' }))(
                      $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))(currentSaleType),
                      ...!hasEnded
                        ? [
                          $text(countdownFn(Date.now() + timeDelta * 1000, Date.now()))
                        ]
                        : [
                          // $text(map(count => `${item.whitelistMax - count.toBigInt()}/${item.whitelistMax} left`, saleWallet.whitelistMinted)),
                        ],
                    ),
                    hasEnded ? sale : empty()
                  )
                }, publicSaleTimeDelta)),
                $seperator2
              ]
            })

          ),

          // join(snapshot(, combineObject({ contract: labWallet.contract, provider: walletLink.provider }), clickClaim)),
        )
      }),

      walletLink: walletLink
    })({
      walletChange: walletChangeTether()
    }),

    { walletChange }
  ]
})


const $giftIcon = $icon({ $content: $gift, width: '18px', fill: pallete.background, svgOps: style({ marginTop: '2px' }), viewBox: '0 0 32 32' })
const $container = $row(layoutSheet.spacingSmall)


const size = '44px'
const $img = $element('img')(style({ width: size, height: size, borderRadius: '5px' }))

const $freeClaimBtn = $container(
  $giftIcon,
  $text('Mint (Free)')
)








