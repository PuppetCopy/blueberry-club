import { Behavior, combineArray, combineObject } from "@aelea/core"
import { component, style, $text, attr, nodeEvent, styleInline, stylePseudo, INode } from "@aelea/dom"
import { $column, layoutSheet, $row, $icon } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { ContractTransaction } from "@ethersproject/contracts"
import { LabItemSale, MintPrivate, LAB_CHAIN } from "@gambitdao/gbc-middleware"
import { formatFixed, filterNull, CHAIN } from "@gambitdao/gmx-middleware"
import { $alert } from "@gambitdao/ui-components"
import { IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { switchLatest, multicast, startWith, snapshot, map, tap, merge, empty } from "@most/core"
import { $caretDown } from "../../elements/$icons"
import { readContract } from "../../logic/common"
import { $ButtonPrimary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $displayMintEvents } from "./mintUtils2"
import { $IntermediateConnectButton } from "../$ConnectAccount"
import { Whitelist__factory } from "@gambitdao/gbc-contracts"




interface MintCmp {
  chainList: CHAIN[],
  item: LabItemSale
  mintRule: MintPrivate
  walletLink: IWalletLink
}


export const $WhitelistMint = (config: MintCmp) => component((
  [clickMintPublic, clickMintPublicTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,
  [customNftAmount, customNftAmountTether]: Behavior<INode, number>,
  [selectMintAmount, selectMintAmountTether]: Behavior<number, number>,
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,

) => {

  const account = filterNull(map(signer => signer ? signer.address : null, config.walletLink.wallet))

  const supportedNetwork = map(x => x !== LAB_CHAIN, config.walletLink.network)
  const sale = readContract(Whitelist__factory, config.walletLink.provider, config.mintRule.contractAddress)
  const accountChange = merge(account, supportedNetwork)
  const selectedMintAmount = merge(customNftAmount, selectMintAmount)

  const isPrimaryDisabled = combineArray((selectedAmount) => {
    return selectedAmount === null
  }, selectedMintAmount)


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
            list: [1, 2, 3, 5, 10, 20].filter(n => Number(config.mintRule.accountLimit) >= n),
          }
        })({
          select: selectMintAmountTether()
        }),

        $column(layoutSheet.spacingBig)(
          $IntermediateConnectButton({
            chainList: config.chainList,
            $$display: map((w3p) => {
              const proof = config.mintRule.signatureList[config.mintRule.addressList.map(s => s.toLowerCase()).indexOf(w3p.address.toLowerCase())]
              const isEligible = !!proof

              return $column(
                $ButtonPrimary({
                  disabled: startWith(true, isPrimaryDisabled),
                  $content: switchLatest(
                    map(selectedMintAmount => {

                      if (selectedMintAmount === null) {
                        return $text('Select amount')
                      }


                      const priceFormated = formatFixed(config.mintRule.cost, 18)
                      const total = selectedMintAmount * priceFormated

                      return $text(`Mint ${selectedMintAmount} (${total > 0n ? total + 'ETH' : 'Free'})`)

                    }, selectedMintAmount)
                  ),
                })({
                  click: clickMintPublicTether(
                    snapshot(async state => {
                      const value = BigInt(state.selectedMintAmount) * config.mintRule.cost

                      const { cost, start, accountLimit, finish, nonce, supply } = config.mintRule


                      const contractAction = state.contract.mint(nonce, { cost, start, accountLimit, finish, supply }, proof, state.selectedMintAmount, { value })

                      return contractAction

                    }, combineObject({ selectedMintAmount, contract: sale })),
                  )
                }),

                isEligible ? empty() : $alert($text('Connected Account is not eligible'))
              )
            }),
            walletLink: config.walletLink
          })({
            walletChange: walletChangeTether(),
          })
        )


      ),


      $displayMintEvents(sale, clickMintPublic)
    ),


    {
      walletChange
    }
  ]

})