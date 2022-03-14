import { Behavior, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, component, INode, nodeEvent, style, styleInline, stylePseudo } from "@aelea/dom"
import { $column, $icon, $NumberTicker, $row, $seperator, layoutSheet, state } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { ContractReceipt, ContractTransaction } from "@ethersproject/contracts"
import { LabItemDescription, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { ETH_ADDRESS_REGEXP, replayState } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, chain, continueWith, empty, fromPromise, map, merge, multicast, now, periodic, skipRepeats, snapshot, startWith, switchLatest, takeWhile, tap } from "@most/core"
import { GBC, GBC__factory } from "contracts"
import { IEthereumProvider } from "eip1193-provider"
import { $IntermediateTx, $spinner } from "../common/$IntermediateDisplay"
import { $responsiveFlex, $txHashRef } from "../elements/$common"
import { $gift, $tofunft } from "../elements/$icons"
import { $IntermediateConnect } from "./$ConnectAccount"
import { $ButtonPrimary } from "./form/$Button"
import { $Dropdown } from "./form/$Dropdown"
import { IToken } from "@gambitdao/gbc-middleware"
import { web3ProviderTestnet, WALLET } from "../logic/provider"
import { $alert, $anchor, $caretDown } from "@gambitdao/ui-components"
import { $mintDetails } from "./$common"




interface IFormState {
  canClaim: boolean
  hasPublicSaleStarted: boolean
  hasWhitelistSaleStarted: boolean
  mintAmount: null | number
  account: string | null
}


interface IMintEvent {
  amount: number
  contractReceipt: Promise<ContractReceipt>
  txHash: Promise<string>
}


export interface IMint {
  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">

  item: LabItemDescription
}


export const $Mint = ({ walletStore, walletLink, item }: IMint) => component((
  [selectMintAmount, selectMintAmountTether]: Behavior<number, number>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
  [clickClaim, clickClaimTether]: Behavior<PointerEvent, Promise<IMintEvent>>,
  [customNftAmount, customNftAmountTether]: Behavior<INode, number>,
) => {

  const hasAccount = map(address => address && !ETH_ADDRESS_REGEXP.test(address), walletLink.account)
  const supportedNetwork = map(x => x !== USE_CHAIN, walletLink.network)


  const gbc = GBC__factory.connect(item.contractAddress, web3ProviderTestnet)

  const contract = replayLatest(multicast(skipRepeats(awaitPromises(map(async w3p => {
    if (w3p === null || w3p?.network?.chainId !== USE_CHAIN) {
      return null
    }

    const contract = GBC__factory.connect(item.contractAddress, w3p.getSigner())


    if (await contract.deployed()) {
      return contract
    }

    return null
  }, walletLink.provider)))))


  const hasWhitelistSaleStarted = awaitPromises(map(c => {
    return c ? c.wlMintStarted() : false
  }, contract))

  const hasPublicSaleStarted = awaitPromises(map(c => {
    return c ? c.publicSaleStarted() : false
  }, contract))


  const totalMintedChangeInterval = multicast(awaitPromises(map(async () => (await gbc.totalSupply()).toNumber(), periodic(5000))))

  const totalMintedChange = continueWith(() => now(item.maxSupply), takeWhile(res => res < item.maxSupply, totalMintedChangeInterval))

  const hasMintEnded = skipRepeats(map(amount => {
    return amount === item.maxSupply
  }, totalMintedChange))


  const canClaim = awaitPromises(combineArray(async (c, account) => {
    if (c && account && getWhitelistSignature(account)) {
      return (await c.isBlacklisted(account)) === false
    }
    return false
  }, contract, walletLink.account))

  const accountChange = merge(hasAccount, supportedNetwork)
  const mintAmount = merge(customNftAmount, selectMintAmount)


  const formState = replayState({ canClaim, mintAmount, hasPublicSaleStarted, hasWhitelistSaleStarted, account: walletLink.account }, {
    canClaim: false, mintAmount: null, hasWhitelistSaleStarted: false, hasPublicSaleStarted: false, account: null
  } as IFormState)
  
  const buttonState = multicast(map(({ hasWhitelistSaleStarted, hasPublicSaleStarted, formState: { canClaim, mintAmount } }) => {
    if (!hasPublicSaleStarted && hasWhitelistSaleStarted) {
      return hasWhitelistSaleStarted && !canClaim
    }

    return !hasWhitelistSaleStarted || hasPublicSaleStarted && mintAmount === null
  }, combineObject({ formState, hasWhitelistSaleStarted, hasPublicSaleStarted })))

  return [
    $column(layoutSheet.spacing, style({ flex: 1 }))(
      
      $column(layoutSheet.spacing)(
        $responsiveFlex(layoutSheet.spacing, style({ fontSize: '1.5em' }))(
          switchLatest(map(hasEnded => {
            return hasEnded
              ? $text(style({ fontSize: '1.25em', fontWeight: 'bold' }))('Sale has ended!')
              : $text(style({ color: pallete.indeterminate }))(`Minting is Live!`)
          }, hasMintEnded)),

          $row(layoutSheet.spacingTiny)(
            $NumberTicker({
              value$: totalMintedChange,
              decrementColor: pallete.primary,
              incrementColor: pallete.primary,
            }),
            $text(style({ color: pallete.foreground }))('/'),
            $text(`10,000`)
          ),
        ),
        $row(layoutSheet.spacingSmall)(
          $icon({
            $content: $tofunft,
            viewBox: '0 0 32 32'
          }),
          $anchor(attr({ href: `https://tofunft.com/collection/blueberryclub/items?category=fixed-price` }))(
            $text('Trade On TofuNFT')
          ),
        ),
      ),

      $node(),

      $IntermediateConnect({
        walletStore,
        containerOp: style({ flex: 1 }),
        $display: switchLatest(map(hasEnded => {
          return hasEnded ? empty() : $row(layoutSheet.spacing, style({ flexWrap: 'wrap', alignItems: 'center' }))(
            switchLatest(map((hasPublicSaleStarted) => {
              return hasPublicSaleStarted ? $Dropdown({
                value: startWith(null, customNftAmount),
                // disabled: accountChange,
                // $noneSelected: $text('Choose Amount'),
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
                $selection: map(amount => 
                  $row(
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

                            return target.innerText !== '' && isFinite(val) && val > 0 && val <= 20 ? val : state
                          }

                          if (state === null) {
                            return ''
                          }

                          return state
                        }, startWith(null, selectMintAmount)),
                        multicast
                      )
                    )(
                      amount === null ? '' : String(amount)
                    ),
                    $icon({ $content: $caretDown, width: '13px', svgOps: style({ marginTop: '2px', marginRight: '10px' }), viewBox: '0 0 7.84 3.81' })
                  )
                ),
                select: {
                  $container: $column,
                  optionOp: map(option => $text(String(option))),
                  options: [ 1, 2, 3, 5, 10, 20 ],
                }
              })({
                select: selectMintAmountTether()
              })
                : empty()
            }, hasPublicSaleStarted)),
            $ButtonPrimary({
              disabled: buttonState,
              $content: switchLatest(
                map(({ canClaim, mintAmount, hasPublicSaleStarted, hasWhitelistSaleStarted, account }) => {

                  if (!hasPublicSaleStarted && hasWhitelistSaleStarted) {
                    const signature = getWhitelistSignature(account)
                    return signature ? $freeClaimBtn : $container($giftIcon, $text('Connected Account is not eligible'))
                  }

                  if (hasPublicSaleStarted) {
                    if (mintAmount === null) {
                      return $text('Select Amount')
                    }

                    if ((!canClaim || mintAmount > 1)) {
                      return $container(
                        canClaim ? $giftIcon : empty(),
                        $text(canClaim ? `Mint ${mintAmount - 1} + 1 free (${(mintAmount - 1) * .03}ETH)` : `Mint ${mintAmount} (${mintAmount * .03}ETH)`),
                      )
                    }
                  }
   

                  return $text('Awaiting Contract Approval...')
                }, formState)
              ),
            })({
              click: clickClaimTether(
                snapshot(async ({ formState: { canClaim, mintAmount, hasPublicSaleStarted, hasWhitelistSaleStarted }, contract, account }): Promise<IMintEvent> => {
                  if (contract === null || !account) {
                    throw new Error(`Unable to resolve contract`)
                  }

                  let contractAction: Promise<ContractTransaction>

                  if (hasWhitelistSaleStarted && !hasPublicSaleStarted) {
                    const signature = getWhitelistSignature(account)

                    if (!signature) {
                      throw Error('Connected Account is not eligible')
                    }
                    contractAction = contract.claim(signature)
                  } else {
                    if (mintAmount === null) {
                      throw new Error(`Unable to resolve contract`)
                    }
                    
                    contractAction = canClaim
                      ? contract.whitelistMint(mintAmount, getWhitelistSignature(account), { value: BigInt(mintAmount - 1) * item.mintPrice })
                      : contract.mint(mintAmount, { value: BigInt(mintAmount) * item.mintPrice })
                  }
   
                
                
                  const contractReceipt = contractAction.then(recp => recp.wait())


                  return {
                    amount: mintAmount || 1,
                    contractReceipt,
                    txHash: contractAction.then(t => t.hash),
                  }

                }, combineObject({ formState, contract, account: walletLink.account })),
              )
            })
        
          )
        }, hasMintEnded)),
        
        walletLink: walletLink
      })({
        walletChange: walletChangeTether()
      }),

      $node(),
      $node(),

      // join(snapshot(({ contract, provider }, minev) => {
      //   if (contract === null || provider === null) {
      //     return empty()
      //   }

      //   return $mintAction(contract, minev)
      // }, combineObject({ contract, provider: walletLink.provider, account: walletLink.account }), clickClaim)),

      // switchLatest(awaitPromises(map(async ({ contract, provider, account }) => {
      //   if (contract === null || provider === null || account === null) {
      //     return empty()
      //   }
      //   const mintHistory = await queryOwnerTrasnferNfts(account)

      //   return mergeArray(mintHistory.map(([txHash, tokenList]) => {
      //     return $column(layoutSheet.spacing)(
      //       style({ backgroundColor: colorAlpha(pallete.foreground, .15) }, $seperator),
      //       $mintDetails(txHash, tokenList.length, tokenList)
      //     )
      //   }))
      // }, combineObject({ contract, provider: walletLink.provider, account: walletLink.account })))),

    ),
    
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


function getWhitelistSignature(account: any) {
  // @ts-ignore
  return typeof account === 'string' ? WHITELIST[account] || WHITELIST[account.toLocaleLowerCase()] || WHITELIST[account.toUpperCase()] : ''
}

function $mintAction(contract: GBC, mintAction: Promise<IMintEvent>) {
  const contractAction = mintAction.then(me => me.txHash)
  const contractReceipt = mintAction.then(me => me.contractReceipt)


  return $column(layoutSheet.spacing)(
    style({ backgroundColor: colorAlpha(pallete.foreground, .15) }, $seperator),

    $IntermediateTx({
      query: now(contractReceipt),
      $loader: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
        $spinner,
        $text(startWith('Awaiting Approval', map(() => 'Minting...', fromPromise(contractAction)))),
        $node(style({ flex: 1 }))(),
        switchLatest(map(txHash => $txHashRef(txHash), fromPromise(contractAction)))
      ),
      $done: map((tx) => {
        const tokenIds = tx?.logs.map(log => contract.interface.parseLog(log).args.tokenId)
        if (contract && tokenIds && tokenIds.length) {
          const tokenList: Promise<IToken[]> = Promise.all(tokenIds.map(async t => {
            const uri = await contract.tokenURI(t)

            return {
              account: '',
              id: t,
              uri,
              transfers: []
            } as any as IToken
          }))
          return chain(tokL => $mintDetails(tx.transactionHash, tokenIds.length, tokL), fromPromise(tokenList))
        }

        return $alert($text('Unable to reach subgraph'))
      }),
    })({}),
  )
}






