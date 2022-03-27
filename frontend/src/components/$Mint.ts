import { Behavior, combineObject, O } from "@aelea/core"
import { $element, $node, $text, attr, component, INode, nodeEvent, style, styleBehavior, styleInline, stylePseudo } from "@aelea/dom"
import { $column, $icon, $NumberTicker, $row, $seperator, layoutSheet, state } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { ContractReceipt } from "@ethersproject/contracts"
import { hasWhitelistSale, LabItemSaleDescription, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { countdownFn, ETH_ADDRESS_REGEXP, formatFixed, periodicRun, replayState, unixTimestampNow } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, empty, fromPromise, join, map, merge, multicast, never, now, periodic, skipRepeats, snapshot, startWith, switchLatest, tap } from "@most/core"
import { IEthereumProvider } from "eip1193-provider"
import { $responsiveFlex, $txHashRef } from "../elements/$common"
import { $caretDown, $gift, $tofunft } from "../elements/$icons"
import { $IntermediateConnect } from "./$ConnectAccount"
import { $ButtonPrimary } from "./form/$Button"
import { $defaultOptionContainer, $Dropdown, $MultiSelect } from "./form/$Dropdown"
import { WALLET } from "../logic/provider"
import { $alert, $anchor, $IntermediateTx, $spinner } from "@gambitdao/ui-components"
import { $berryTileId, $mintDetails } from "./$common"
import { itemsGlobal } from "../logic/items"
import { takeUntilLast } from "../logic/common"
import { connectGbc, connectLab, connectSale } from "../logic/gbc"
import { $seperator2 } from "../pages/common"




interface IFormState {
  // isSaleLive: boolean
  selectedMintAmount: null | number
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
  item: LabItemSaleDescription
}


export const $Mint = ({ walletStore, walletLink, item }: IMint) => component((
  [selectMintAmount, selectMintAmountTether]: Behavior<number, number>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
  [clickClaim, clickClaimTether]: Behavior<PointerEvent, Promise<IMintEvent>>,
  [customNftAmount, customNftAmountTether]: Behavior<INode, number>,
  [selectTokensForWhitelist, selectTokensForWhitelistTether]: Behavior<number[], number[]>,
) => {

  const hasAccount = map(address => address && !ETH_ADDRESS_REGEXP.test(address), walletLink.account)
  const supportedNetwork = map(x => x !== USE_CHAIN, walletLink.network)


  const wallet = connectGbc(walletLink)
  const lab = connectLab(walletLink)
  const sale = connectSale(walletLink, item.contractAddress)


  const mintCount = periodicRun(3500, map(async delta => (await itemsGlobal.totalSupply(item.id)).toBigInt()), true)

  const totalMintedChange = takeUntilLast(isLive => isLive === item.maxSupply, mintCount)

  const hasMintEnded = skipRepeats(map(amount => amount === item.maxSupply, totalMintedChange))


  const accountChange = merge(hasAccount, supportedNetwork)
  const selectedMintAmount = merge(customNftAmount, selectMintAmount)



  const formState = replayState({ selectedMintAmount, account: walletLink.account }, {
    selectedMintAmount: null, account: null
  } as IFormState)
  
  const buttonState = multicast(map(amount => {
    return amount === null
  }, selectedMintAmount))


  const whitelistTimeDelta = hasWhitelistSale(item)
    ? takeUntilLast(delta => delta === null, awaitPromises(map(async (time) => {
      const deltaTime = item.whitelistStartDate - time
      return deltaTime > 0 ? deltaTime : null
    }, timeChange)))
    : empty()

  const publicSaleTimeDelta = takeUntilLast(delta => delta === null, awaitPromises(map(async (time) => {
    const deltaTime = item.publicStartDate - time
    return deltaTime > 0 ? deltaTime : null
  }, timeChange)))


  return [
    $column(layoutSheet.spacing, style({ flex: 1 }))(
      
      $column(layoutSheet.spacing)(

        switchLatest(map(hasEnded => {

          return $responsiveFlex(layoutSheet.spacing, style({ fontSize: '1.5em' }))(
          
            hasEnded
              ? $text(style({ fontSize: '1.25em', fontWeight: 'bold' }))('Sale has ended!')
              : $text(style({ color: pallete.indeterminate }))(`Minting is Live!`),

            $row(layoutSheet.spacingTiny)(
              $NumberTicker({
                value$: map(Number, totalMintedChange),
                decrementColor: pallete.primary,
                incrementColor: pallete.primary,
              }),
              $text(style({ color: pallete.foreground }))('/'),
              $text(item.maxSupply.toString())
            ),

            hasEnded
              ? $row(layoutSheet.spacingSmall)(
                $icon({
                  $content: $tofunft,
                  viewBox: '0 0 32 32'
                }),
                $anchor(attr({ href: `https://tofunft.com/collection/blueberryclub/items?category=fixed-price` }))(
                  $text('Trade On TofuNFT')
                ),
              )
              : empty()
          )
      
        }, hasMintEnded))
      ),


      $node(),

      $IntermediateConnect({
        walletStore,
        $container: $column,
        $display: switchLatest(map(hasEnded => {
          if (hasEnded) {
            return empty()
          }

          return $column(layoutSheet.spacing)(

            switchLatest(map(timeDelta => {
              if (typeof timeDelta === 'number') {
                const plannedDate = Date.now() + timeDelta * 1000
                return $text(countdownFn(plannedDate, Date.now()))
              }

              return switchLatest(map(ownedGbcs => {

                if (ownedGbcs.length === 0) {
                  return $text(style({ color: pallete.foreground, fontSize: '.75em' }))(`Connected account does not own any GBC's`)
                }

                return $column(layoutSheet.spacing)(
                  $text(`Each GBC's is eligible to claim an item, mark any below`),

                  $MultiSelect({
                    value: now([]),
                    select: {
                      $container: $row,
                      value: never(),
                      optionOp: map(n => {

                        const highlightSelected = O(
                          style({ cursor: 'pointer' }),
                          styleBehavior(map(selected => ({ filter: selected.indexOf(n) !== -1 ? `grayscale(100%) sepia(100%) hue-rotate(74deg) saturate(2)` : '' }), selectTokensForWhitelist)),
                        )

                        return highlightSelected($berryTileId(n))
                      }),
                      options: ownedGbcs
                    }
                  })({ selection: selectTokensForWhitelistTether() }),

                  $row(
                    $ButtonPrimary({
                      disabled: map(s => s.length === 0, selectTokensForWhitelist),
                      $content: switchLatest(
                        map(({ selectTokensForWhitelist }) => {

                          if (!hasWhitelistSale(item) || selectTokensForWhitelist.length === 0) {
                            return $text('Select amount')
                          }

  
                          const cost = BigInt(selectTokensForWhitelist.length) * item.whitelistCost
                          const costUsd = formatFixed(cost, 18)
                          
   
                          return $text(`Mint (${cost > 0n ? costUsd + 'ETH' : 'Free'})`)

                        }, combineObject({ selectTokensForWhitelist }))
                      ),
                    })({
                      click: clickClaimTether(
                        snapshot(async ({ selectTokensForWhitelist, saleContract, account }): Promise<IMintEvent> => {
                          if (!hasWhitelistSale(item)) {
                            throw new Error(`Unable to resolve contract`)
                          }
                          if ((saleContract === null || !account)) {
                            throw new Error(`Unable to resolve contract`)
                          }

                    
                          const cost = BigInt(selectTokensForWhitelist.length) * item.whitelistCost                       
                          const contractAction = saleContract.mintWhitelist(selectTokensForWhitelist, { value: cost })
                          const contractReceipt = contractAction.then(recp => recp.wait())

                          return {
                            amount: selectTokensForWhitelist.length,
                            contractReceipt,
                            txHash: contractAction.then(t => t.hash),
                          }

                        }, combineObject({ selectTokensForWhitelist, saleContract: sale.contract, account: walletLink.account })),
                      )
                    })
                  ),

                  $seperator2,
                )

              }, wallet.tokenList))

            }, whitelistTimeDelta)),


            switchLatest(map(timeDelta => {
              if (typeof timeDelta === 'number') {
                const plannedDate = Date.now() + timeDelta * 1000
                return $text(countdownFn(plannedDate, Date.now()))
              }

              return $column(
                $seperator2,
                $text('Public Sale'),
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

                                return target.innerText !== '' && isFinite(val) && val > 0 && val <= item.maxPerTx ? val : state
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
                        $icon({ $content: $caretDown, width: '13px', svgOps: style({ marginTop: '2px', marginRight: '10px' }) })
                      )
                    ),
                    select: {
                      // $container: $column,
                      value: startWith(null, customNftAmount),
                      optionOp: map(option => $text(String(option))),
                      options: [ 1, 2, 3, 5, 10, 20 ].filter(n => Number(item.maxPerTx) >= n),
                    }
                  })({
                    select: selectMintAmountTether()
                  }),
                  $ButtonPrimary({
                    disabled: buttonState,
                    $content: switchLatest(
                      map(({ selectedMintAmount, account }) => {

                        if (selectedMintAmount === null) {
                          return $text('Select amount')
                        }

                        // if (!hasPublicSaleStarted && hasWhitelistSaleStarted) {
                        //   return accountCanMintPresale ? $freeClaimBtn : $container($giftIcon, $text('Connected Account is not eligible'))
                        // }

                        const priceFormated = formatFixed(item.publicCost, 18)

                        return $text(`Mint ${selectedMintAmount} (${selectedMintAmount * priceFormated}ETH)`)

                      }, formState)
                    ),
                  })({
                    click: clickClaimTether(
                      snapshot(async ({ formState: { selectedMintAmount }, saleContract, account }): Promise<IMintEvent> => {

                        if (saleContract === null || selectedMintAmount === null) {
                          throw new Error('could not resolve sales contract')
                        }
                    
                        const value = BigInt(selectedMintAmount) * item.publicCost

                        const contractAction = saleContract.mint(selectedMintAmount, { value })
                        const contractReceipt = contractAction.then(recp => recp.wait())

                        return {
                          amount: selectedMintAmount,
                          contractReceipt,
                          txHash: contractAction.then(t => t.hash),
                        }

                      }, combineObject({ formState, saleContract: sale.contract, account: walletLink.account })),
                    )
                  })
        
                )
              )

            }, publicSaleTimeDelta)),

          )
        }, hasMintEnded)),
        
        walletLink: walletLink
      })({
        walletChange: walletChangeTether()
      }),

      $node(),
      $node(),

      join(snapshot(({ contract, provider }, minev) => {
        if (contract === null || provider === null) {
          return empty()
        }

        const contractAction = minev.then(me => me.txHash)
        const contractReceipt = minev.then(me => me.contractReceipt)


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
                const tokenIdList = tokenIds.map(t => Number(BigInt(t)))

                return $mintDetails(tx.transactionHash, tokenIds.length, tokenIdList)
              }

              return $alert($text('Unable to reach subgraph'))
            }),
          })({}),
        )

      }, combineObject({ contract: sale.contract, provider: walletLink.provider, account: walletLink.account }), clickClaim)),


      // subgraph's historic mint list
      // switchLatest(awaitPromises(map(async ({ contract, provider, account }) => {
      //   if (contract === null || provider === null || account === null) {
      //     return empty()
      //   }
      //   const mintHistory = await queryOwnerTrasnferNfts(account).then(xx => xx.map(([txHash, tokenList]) => {
      //     return $column(layoutSheet.spacing)(
      //       style({ backgroundColor: colorAlpha(pallete.foreground, .15) }, $seperator),
      //       $mintDetails(txHash, tokenList.length, tokenList.map(x => Number(BigInt(x.id))))
      //     )
      //   }))

        
      //   return mergeArray(mintHistory)
      // }, combineObject({ contract: itemsUser, provider: walletLink.provider, account: walletLink.account })))),

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




const timeChange = map(_ => unixTimestampNow(), periodic(1000))





