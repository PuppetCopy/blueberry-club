import { Behavior, combineArray, combineObject } from "@aelea/core"
import { component, style, $text, attr, nodeEvent, styleInline, stylePseudo, INode } from "@aelea/dom"
import { $column, layoutSheet, $row, $icon } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { LabItemSale, MintPrivate, LAB_CHAIN, abi } from "@gambitdao/gbc-middleware"
import { formatFixed, filterNull } from "@gambitdao/gmx-middleware"
import { $alert } from "@gambitdao/ui-components"
import { IWalletLink, IWalletName, IWalletclient } from "@gambitdao/wallet-link"
import { switchLatest, multicast, startWith, snapshot, map, tap, merge, empty, mergeArray, now } from "@most/core"
import { $caretDown } from "../../elements/$icons"
import { $ButtonPrimary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $IntermediateConnectButton } from "../$ConnectAccount"
import { CHAIN } from "@gambitdao/const"
import { PublicClient, SimulateContractReturnType, WalletClient } from "viem"
import { $displayMintEvents } from "./mintUtils2"
import { connectContract } from "../../logic/common"



interface MintCmp {
  chainList: CHAIN[],
  item: LabItemSale
  mintRule: MintPrivate
  walletLink: IWalletLink
}

export const $WhitelistMint = (config: MintCmp) => component((
  [clickMintPublic, clickMintPublicTether]: Behavior<PointerEvent, Promise<Promise<WaitForTransactionReceiptReturnType<TChain>>>>,
  [customNftAmount, customNftAmountTether]: Behavior<INode, bigint>,
  [selectMintAmount, selectMintAmountTether]: Behavior<bigint, bigint>,
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,

) => {

  const holderConnect = connectContract(config.walletLink.client, config.mintRule.contractAddress, abi.whitelist)

  const account = filterNull(map(signer => signer ? signer.account.address : null, config.walletLink.wallet))

  const supportedNetwork = map(x => x !== LAB_CHAIN, config.walletLink.network)
  
  const accountChange = merge(account, supportedNetwork)
  const selectedMintAmount = mergeArray([customNftAmount, selectMintAmount, now(null)])


  function getIsEligible(mintRule: MintPrivate, w3p: IWalletclient) {
    return mintRule.signatureList[config.mintRule.addressList.map(s => s.toLowerCase()).indexOf(w3p.account.address.toLowerCase())]
  }


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
            list: [1n, 2n, 3n, 5n, 10n, 20n].filter(n => Number(config.mintRule.accountLimit) >= n),
          }
        })({
          select: selectMintAmountTether()
        }),

        $IntermediateConnectButton({
          chainList: config.chainList,
          $$display: map(w3p => {
            const proof = config.mintRule.signatureList[config.mintRule.addressList.map(s => s.toLowerCase()).indexOf(w3p.account?.address.toLowerCase())]
            const isEligible = !!getIsEligible(config.mintRule, w3p)

            const isPrimaryDisabled = combineArray((selectedAmount) => {
              return !proof || selectedAmount === null
            }, selectedMintAmount)

            return $column(
              $ButtonPrimary({
                disabled: startWith(true, isPrimaryDisabled),
                $content: switchLatest(
                  map(amount => {
                    if (amount === null) {
                      return $text('Select amount')
                    }


                    const priceFormated = formatFixed(config.mintRule.cost, 18)
                    const total = Number(amount) * priceFormated

                    return $text(`Mint ${amount} (${total > 0n ? total + 'ETH' : 'Free'})`)

                  }, selectedMintAmount)
                ),
              })({
                click: clickMintPublicTether(
                  snapshot(async params => {
                    const value = params.selectedMintAmount! * config.mintRule.cost

                    const { cost, start, accountLimit, finish, nonce, supply } = config.mintRule

                    const request = await params.contract.simulateContract({
                      value,
                      abi: abi.whitelist,
                      address: config.mintRule.contractAddress,
                      functionName: 'mint',
                      args: [nonce, { cost, start, accountLimit, finish, supply }, proof, params.selectedMintAmount!],
                    })

                    return request
                  }, combineObject({ selectedMintAmount, contract: config.walletLink.client })),
                )
              }),

              isEligible ? empty() : $alert($text('Connected Account is not eligible'))
            )
          }),
          walletLink: config.walletLink
        })({
          walletChange: walletChangeTether(),
        })
      ),

      $displayMintEvents(clickMintPublic)
    ),


    {
      walletChange
    }
  ]

})