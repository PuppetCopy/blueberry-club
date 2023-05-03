import { Behavior } from "@aelea/core"
import { component, style, $text, attr, nodeEvent, styleInline, stylePseudo, INode } from "@aelea/dom"
import { $column, layoutSheet, $row, $icon } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { LabItemSale, MintRule, LAB_CHAIN } from "@gambitdao/gbc-middleware"
import { filterNull, formatFixed, takeUntilLast } from "@gambitdao/gmx-middleware"
import { IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { switchLatest, multicast, startWith, snapshot, map, tap, merge } from "@most/core"
import { $caretDown } from "../../elements/$icons"
import { getMintCount } from "../../logic/contract/sale"
import { $ButtonPrimary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $displayMintEvents } from "./mintUtils2"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { connectLab } from "../../logic/contract/gbc"
import { CHAIN } from "@gambitdao/const"




interface MintCmp {
  chainList: CHAIN[],

  item: LabItemSale
  mintRule: MintRule
  walletLink: IWalletLink
}

export const $PublicMint = (config: MintCmp) => component((
  [clickMintPublic, clickMintPublicTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,
  [customNftAmount, customNftAmountTether]: Behavior<INode, number>,
  [selectMintAmount, selectMintAmountTether]: Behavior<number, number>,
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,

) => {

  const account = filterNull(map(signer => signer ? signer.address : null, config.walletLink.wallet))

  const supportedNetwork = map(x => x !== LAB_CHAIN, config.walletLink.network)
  const mintCount = getMintCount(config.mintRule, config.walletLink)

  const totalMintedChange = takeUntilLast(isLive => Number(isLive) === config.mintRule.supply, mintCount)


  
  const labWallet = connectLab(config.walletLink.client)

  const accountChange = merge(account, supportedNetwork)
  const selectedMintAmount = merge(customNftAmount, selectMintAmount)

  const buttonState = multicast(map(amount => {
    return amount === null
  }, selectedMintAmount))



  return [
    $column(layoutSheet.spacing)(

      $row(layoutSheet.spacing, style({ flexWrap: 'wrap', alignItems: 'center' }))(
        $Dropdown({
          openMenuOp: tap(event => {
            const sel = window.getSelection()
            const range = document.createRange()
            const target = event.target

            if (sel && target instanceof HTMLElement) {
              range.selectNodeContents(target)

              sel.removeAllRanges()
              sel.addRange(range)
            }
          }),
          $selection: $row(
            layoutSheet.spacingSmall, style({ alignItems: 'center', borderBottom: `2px solid ${pallete.message}` }),
            styleInline(map(isDisabled => isDisabled ? { opacity: ".15", pointerEvents: 'none' } : { opacity: "1", pointerEvents: 'all' }, accountChange))
          )(
            $text(
              attr({ contenteditable: 'true', placeholder: 'Set Amount' }), style({ padding: '15px 0 15px 10px', minWidth: '50px', backgroundColor: 'transparent', cursor: 'text', outline: '0' }),
              stylePseudo(':empty:before', {
                content: 'attr(placeholder)',
                color: pallete.foreground
              }),
              customNftAmountTether(
                nodeEvent('blur'),
                snapshot((state, event) => {
                  const target = event.target


                  if (target instanceof HTMLElement) {
                    const val = Number(target.innerText)

                    return target.innerText !== '' && isFinite(val) && val > 0 && val <= config.mintRule.accountLimit ? val : state
                  }

                  if (state === null) {
                    return ''
                  }

                  return state
                }, startWith(null, selectMintAmount)),
                multicast
              )
            )(
              map(amount => amount === null ? '' : String(amount), selectMintAmount)
            ),
            $icon({ viewBox: '0 0 32 32', $content: $caretDown, width: '13px', svgOps: style({ marginTop: '2px', marginRight: '10px' }) })
          ),
          value: {
            $container: $defaultSelectContainer(style({})),
            value: startWith(null, customNftAmount),
            $$option: map(option => $text(String(option))),
            list: [...[1, 2, 3, 5, 10, 20].filter(n => Number(config.mintRule.accountLimit) > n), config.mintRule.accountLimit],
          }
        })({
          select: selectMintAmountTether()
        }),

        $column(layoutSheet.spacingBig)(
          $IntermediateConnectButton({
            chainList: config.chainList,
            $$display: map(w3p => {
              const sale = Public__factory.connect(config.mintRule.contractAddress, w3p.signer)

              return $ButtonPrimary({
                disabled: startWith(true, buttonState),
                $content: switchLatest(
                  map(amount => {

                    if (amount === null) {
                      return $text('Select amount')
                    }

                    const priceFormated = formatFixed(config.mintRule.cost, 18)
                    const total = amount * priceFormated

                    return $text(`Mint ${amount} (${total > 0n ? total + 'ETH' : 'Free'})`)

                  }, selectedMintAmount)
                ),
              })({
                click: clickMintPublicTether(
                  snapshot(async amount => {
                    const value = BigInt(amount) * config.mintRule.cost

                    const contractAction = sale.mint(amount, { value })

                    return contractAction
                  }, selectedMintAmount),
                )
              })
            }),
            walletLink: config.walletLink
          })({
            walletChange: walletChangeTether(),
          })
        )
      ),

      $displayMintEvents(labWallet.lab.contract, clickMintPublic)
    ),

    { walletChange }
  ]
})