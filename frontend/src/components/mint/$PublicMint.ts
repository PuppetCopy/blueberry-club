import { Behavior, combineObject } from "@aelea/core"
import { component, style, $text, attr, nodeEvent, styleInline, stylePseudo, INode } from "@aelea/dom"
import { $column, layoutSheet, $row, $icon, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { ContractTransaction } from "@ethersproject/contracts"
import { LabItemSale, MintRule, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { ETH_ADDRESS_REGEXP, formatFixed, replayState } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { switchLatest, multicast, startWith, snapshot, map, tap, skipRepeats, merge } from "@most/core"
import { $caretDown } from "../../elements/$icons"
import { takeUntilLast } from "../../logic/common"
import { connectLab } from "../../logic/contract/lab"
import { connectPublic, getMintCount } from "../../logic/contract/sale"
import { $ButtonPrimary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $displayMintEvents } from "./mintUtils2"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { IEthereumProvider } from "eip1193-provider"
import { WALLET } from "../../logic/provider"
import { Stream } from "@most/types"



interface IFormState {
  // isSaleLive: boolean
  selectedMintAmount: null | number
  account: string | null
}

interface MintCmp {
  item: LabItemSale
  mintRule: MintRule
  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">
}

export const $PublicMint = (config: MintCmp) => component((
  [clickMintPublic, clickMintPublicTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,
  [customNftAmount, customNftAmountTether]: Behavior<INode, number>,
  [selectMintAmount, selectMintAmountTether]: Behavior<number, number>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,

) => {

  const hasAccount = map(address => address && !ETH_ADDRESS_REGEXP.test(address), config.walletLink.account)

  const supportedNetwork = map(x => x !== USE_CHAIN, config.walletLink.network)
  const mintCount = getMintCount(config.mintRule)

  const totalMintedChange = takeUntilLast(isLive => Number(isLive) === config.mintRule.supply, mintCount)

  const saleWallet = connectPublic(config.walletLink, config.mintRule.contractAddress)
  
  const labWallet = connectLab(config.walletLink)

  const hasMintEnded = skipRepeats(map(amount => Number(amount) === config.mintRule.supply, totalMintedChange))
  const accountChange = merge(hasAccount, supportedNetwork)
  const selectedMintAmount = merge(customNftAmount, selectMintAmount)

  const buttonState = multicast(map(amount => {
    return amount === null
  }, selectedMintAmount))

  const formState: Stream<IFormState> = replayState({ selectedMintAmount, account: config.walletLink.account })


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

        $IntermediateConnectButton({
          walletStore: config.walletStore,
          $container: $column(layoutSheet.spacingBig),
          $display: map(() => {

            return $ButtonPrimary({
              disabled: startWith(true, buttonState),
              buttonOp: style({ alignSelf: 'flex-end' }),
              $content: switchLatest(
                map(({ selectedMintAmount, account }) => {

                  if (selectedMintAmount === null) {
                    return $text('Select amount')
                  }

                  const priceFormated = formatFixed(config.mintRule.cost, 18)
                  const total = selectedMintAmount * priceFormated

                  return $text(`Mint ${selectedMintAmount} (${total > 0n ? total + 'ETH' : 'Free'})`)

                }, formState)
              ),
            })({
              click: clickMintPublicTether(
                snapshot(async ({ formState: { selectedMintAmount }, saleContract, account }) => {

                  if (saleContract === null || selectedMintAmount === null) {
                    throw new Error('could not resolve sales contract')
                  }
                  const value = BigInt(selectedMintAmount) * config.mintRule.cost

                  const contractAction = saleContract.mint(selectedMintAmount, { value })

                  return contractAction
                }, combineObject({ formState, saleContract: saleWallet.contract, account: config.walletLink.account })),
              )
            })
          }),
          ensureNetwork: true,
          walletLink: config.walletLink
        })({
          walletChange: walletChangeTether(),
        })
      ),

      $displayMintEvents(labWallet.contract, clickMintPublic)
    ),

    { walletChange }
  ]
})