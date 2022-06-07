import { Behavior, combineArray, combineObject } from "@aelea/core"
import { component, style, $text, attr, nodeEvent, styleInline, stylePseudo, INode } from "@aelea/dom"
import { $column, layoutSheet, $row, $icon } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { LabItemSale, MintRule, MintPrivate, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { ETH_ADDRESS_REGEXP, formatFixed, replayState } from "@gambitdao/gmx-middleware"
import { $alert } from "@gambitdao/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { filterNull } from "@gambitdao/wallet-link/src/common"
import { switchLatest, multicast, startWith, snapshot, map, tap, skipRepeats, merge, mergeArray, empty } from "@most/core"
import { $caretDown } from "../../elements/$icons"
import { takeUntilLast } from "../../logic/common"
import { connectLab } from "../../logic/contract/lab"
import { connectPrivateSale, connectPublic, getMintCount } from "../../logic/contract/sale"
import { $ButtonPrimary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $displayMintEvents, IMintEvent } from "./mintUtils2"



interface IFormState {
  // isSaleLive: boolean
  selectedMintAmount: null | number
  account: string | null
}



export const $PrivateMint = (item: LabItemSale, mintRule: MintPrivate, walletLink: IWalletLink) => component((
  [clickMintPublic, clickMintPublicTether]: Behavior<PointerEvent, Promise<IMintEvent>>,
  [customNftAmount, customNftAmountTether]: Behavior<INode, number>,
  [selectMintAmount, selectMintAmountTether]: Behavior<number, number>,

) => {

  const hasAccount = map(address => address && !ETH_ADDRESS_REGEXP.test(address), walletLink.account)

  const supportedNetwork = map(x => x !== USE_CHAIN, walletLink.network)
  const mintCount = getMintCount(item.contractAddress)

  const totalMintedChange = takeUntilLast(isLive => Number(isLive) === mintRule.amount, mintCount)

  const saleWallet = connectPrivateSale(walletLink, item.contractAddress)
  const labWallet = connectLab(walletLink)

  const hasMintEnded = skipRepeats(map(amount => Number(amount) === mintRule.amount, totalMintedChange))
  const accountChange = merge(hasAccount, supportedNetwork)
  const selectedMintAmount = merge(customNftAmount, selectMintAmount)

  const isConnectedAccountEligible = map(address => {
    if (address === null) {
      return false
    }

    const proof = mintRule.signatureList[mintRule.addressList.map(s => s.toLowerCase()).indexOf(address.toLowerCase())]
    return !!proof
  }, filterNull(walletLink.account))

  const isPrimaryDisabled = combineArray((isEligible, selectedAmount) => {
    return selectedAmount === null || isEligible === false
  }, isConnectedAccountEligible, selectedMintAmount)

  const formState = replayState({ selectedMintAmount, account: walletLink.account }, {
    selectedMintAmount: null, account: null
  } as IFormState)

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

                    return target.innerText !== '' && isFinite(val) && val > 0 && val <= mintRule.transaction ? val : state
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
            list: [1, 2, 3, 5, 10, 20].filter(n => Number(mintRule.transaction) >= n),
          }
        })({
          select: selectMintAmountTether()
        }),
        $ButtonPrimary({
          disabled: startWith(true, isPrimaryDisabled),
          buttonOp: style({ alignSelf: 'flex-end' }),
          $content: switchLatest(
            map(({ selectedMintAmount, account }) => {

              if (selectedMintAmount === null) {
                return $text('Select amount')
              }


              const priceFormated = formatFixed(mintRule.cost, 18)
              const total = selectedMintAmount * priceFormated

              return $text(`Mint ${selectedMintAmount} (${total > 0n ? total + 'ETH' : 'Free'})`)

            }, formState)
          ),
        })({
          click: clickMintPublicTether(
            snapshot(async ({ formState: { selectedMintAmount }, saleContract, account }): Promise<IMintEvent> => {

              if (saleContract === null || selectedMintAmount === null || account === null) {
                throw new Error('could not resolve sales contract')
              }

              const proof = mintRule.signatureList[mintRule.addressList.map(s => s.toLowerCase()).indexOf(account.toLowerCase())]

              const value = BigInt(selectedMintAmount) * mintRule.cost

              const { cost, start, transaction, amount, nonce } = mintRule


              const contractAction = saleContract.merkleMint({ cost, start, transaction, amount, to: account.toLowerCase(), nonce }, proof, selectedMintAmount, { value })
              const contractReceipt = contractAction.then(recp => recp.wait())

              return {
                amount: selectedMintAmount,
                contractReceipt,
                txHash: contractAction.then(t => t.hash),
              }

            }, combineObject({ formState, saleContract: saleWallet.contract, account: walletLink.account })),
          )
        })
      ),

      switchLatest(map(isEligible => isEligible ? empty() : $alert($text('Connected Account is not eligible')), isConnectedAccountEligible)),

      $displayMintEvents(labWallet.contract, clickMintPublic)
    )
  ]
})