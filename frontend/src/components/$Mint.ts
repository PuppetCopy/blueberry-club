import { Behavior, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, component, INode, nodeEvent, style, styleInline, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { ContractReceipt } from "@ethersproject/contracts"
import { hasWhitelistSale, IAttributeMappings, IBerryIdentifable, LabItemSaleDescription, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { countdownFn, ETH_ADDRESS_REGEXP, formatFixed, replayState, unixTimestampNow } from "@gambitdao/gmx-middleware"
import { IWalletLink, parseError } from "@gambitdao/wallet-link"
import { awaitPromises, empty, fromPromise, join, map, merge, multicast, now, periodic, skipRepeats, snapshot, startWith, switchLatest, tap } from "@most/core"
import { IEthereumProvider } from "eip1193-provider"
import { $caretDown, $gift } from "../elements/$icons"
import { $IntermediateConnectButton } from "./$ConnectAccount"
import { $ButtonPrimary } from "./form/$Button"
import { $Dropdown } from "./form/$Dropdown"
import { WALLET } from "../logic/provider"
import { $alert, $IntermediatePromise, $IntermediateTx, $spinner, $txHashRef } from "@gambitdao/ui-components"
import { $labItem, takeUntilLast } from "../logic/common"
import { $seperator2 } from "../pages/common"
import { connectGbc } from "../logic/contract/gbc"
import { connectLab } from "../logic/contract/lab"
import { connectSale, getMintCount } from "../logic/contract/sale"
import { $SelectBerries } from "./$SelectBerries"
import { connectManager } from "../logic/contract/manager"
import { GBCLab } from "contracts"
import { Stream } from "@most/types"




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
  [clickMintWhitelist, clickMintWhitelistTether]: Behavior<PointerEvent, Promise<IMintEvent>>,
  [clickMintPublic, clickMintPublicTether]: Behavior<PointerEvent, Promise<IMintEvent>>,
  [customNftAmount, customNftAmountTether]: Behavior<INode, number>,
  [selectTokensForWhitelist, selectTokensForWhitelistTether]: Behavior<IBerryIdentifable[], IBerryIdentifable[]>,
) => {

  const hasAccount = map(address => address && !ETH_ADDRESS_REGEXP.test(address), walletLink.account)
  const supportedNetwork = map(x => x !== USE_CHAIN, walletLink.network)

  const mintCount = getMintCount(item.contractAddress)

  const gbcWallet = connectGbc(walletLink)
  const labWallet = connectLab(walletLink)
  const managerWallet = connectManager(walletLink)
  const saleWallet = connectSale(walletLink, item.contractAddress)
  

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

  const timer = hasWhitelistSale(item) && item.publicStartDate > item.whitelistStartDate ? whitelistTimeDelta : publicSaleTimeDelta


  const $whitelist = switchLatest(map(tokenList => {

    const $noBerriesOwnedMsg = $alert($text(`Connected account does not own any GBC's`))
    const chosenTokens = replayLatest(multicast(startWith([], selectTokensForWhitelist)))

    const ownerTokenList = awaitPromises(combineArray(async (manager, sale) => {

      const items = (await Promise.all(
        tokenList.map(async id => {
          const queryItems = manager.itemsOf(id)
          const queryIsUsed = sale.isAlreadyUsed(id)

          const [isUsed, res] = await Promise.all([queryIsUsed, queryItems])

          return { isUsed, background: res.background.toNumber(), custom: res.custom.toNumber(), special: res.special.toNumber(), id }
        })
      )).filter(x => x.isUsed === false)
      
      return items
    }, managerWallet.contract, saleWallet.contract))


    return $column(layoutSheet.spacing)(
      $row(layoutSheet.spacing, style({ alignItems: 'flex-start' }))(

        switchLatest(map(list => {

          return $SelectBerries({
            placeholder: 'Select Berries',
            options: list
          })({
            select: selectTokensForWhitelistTether()
          })
        }, ownerTokenList)),
        

        $ButtonPrimary({
          disabled: map(s => s.length === 0, chosenTokens),
          buttonOp: style({ alignSelf: 'flex-end' }),
          $content: switchLatest(
            map(({ chosenTokens }) => {
              if (!hasWhitelistSale(item) || chosenTokens.length === 0) {
                return $text('Select amount')
              }

  
              const cost = BigInt(chosenTokens.length) * item.whitelistCost
              const costUsd = formatFixed(cost, 18)
                          
   
              return $text(`Mint (${cost > 0n ? costUsd + 'ETH' : 'Free'})`)

            }, combineObject({ chosenTokens }))
          ),
        })({
          click: clickMintWhitelistTether(
            snapshot(async ({ selectTokensForWhitelist, saleContract, account }): Promise<IMintEvent> => {
              if (!hasWhitelistSale(item)) {
                throw new Error(`Unable to resolve contract`)
              }
              if ((saleContract === null || !account)) {
                throw new Error(`Unable to resolve contract`)
              }


              const idList = selectTokensForWhitelist.map(x => x.id)
                    
              const cost = BigInt(selectTokensForWhitelist.length) * item.whitelistCost                       
              const contractAction = saleContract.mintWhitelist(idList, { value: cost })
              const contractReceipt = contractAction.then(recp => recp.wait())

              return {
                amount: selectTokensForWhitelist.length,
                contractReceipt,
                txHash: contractAction.then(t => t.hash),
              }

            }, combineObject({ selectTokensForWhitelist: chosenTokens, saleContract: saleWallet.contract, account: walletLink.account })),
          )
        })
      ),
      tokenList.length === 0 ? $noBerriesOwnedMsg : empty(),

      $displayMintEvents(labWallet.contract, clickMintWhitelist)
    )

  }, gbcWallet.tokenList))


  const $public = $column(layoutSheet.spacing)(
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
          $container: $column,
          value: startWith(null, customNftAmount),
          $$option: map(option => $text(String(option))),
          options: [ 1, 2, 3, 5, 10, 20 ].filter(n => Number(item.maxPerTx) >= n),
        }
      })({
        select: selectMintAmountTether()
      }),
      $ButtonPrimary({
        disabled: buttonState,
        buttonOp: style({ alignSelf: 'flex-end' }),
        $content: switchLatest(
          map(({ selectedMintAmount, account }) => {

            if (selectedMintAmount === null) {
              return $text('Select amount')
            }

            // if (!hasPublicSaleStarted && hasWhitelistSaleStarted) {
            //   return accountCanMintPresale ? $freeClaimBtn : $container($giftIcon, $text('Connected Account is not eligible'))
            // }

            const priceFormated = formatFixed(item.publicCost, 18)
            const total = selectedMintAmount * priceFormated

            return $text(`Mint ${selectedMintAmount} (${total > 0n ? total + 'ETH' : 'Free'})`)

          }, formState)
        ),
      })({
        click: clickMintPublicTether(
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

          }, combineObject({ formState, saleContract: saleWallet.contract, account: walletLink.account })),
        )
      })   
    ),

    $displayMintEvents(labWallet.contract, clickMintPublic)
  )



  return [
    $IntermediateConnectButton({
      walletStore,
      $container: $column(layoutSheet.spacingBig),
      $display: map(() => {

        return $column(layoutSheet.spacingBig)(
          $column(style({ gap: '50px' }))(

            ... hasWhitelistSale(item)
              ? [
                $column(layoutSheet.spacing)(
                  $row(layoutSheet.spacing, style({ alignItems: 'baseline' }))(
                    $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))(`Whitelist`),

                    $text(
                      switchLatest(map(timeDelta => {
                        const hasEnded = timeDelta === null

                        return hasEnded
                          ? map(amount => {
                            const count = item.whitelistMax - amount.toBigInt()
                            return count ? `${count}/${item.whitelistMax} left` : 'Sold Out'
                          }, saleWallet.whitelistMinted)
                          : now(countdownFn(Date.now() + timeDelta * 1000, Date.now()))

                      }, whitelistTimeDelta))
                    ),
                  ),
                
                  switchLatest(map(timeDelta => {
                    if (typeof timeDelta === 'number') {
                      return empty()
                    }

                    return $whitelist

                  }, whitelistTimeDelta)),
                ),
                $seperator2
              ]
              : [],


            switchLatest(map(timeDelta => {

              const hasEnded = timeDelta === null

              return $column(layoutSheet.spacing)(
                $row(layoutSheet.spacing, style({ alignItems: 'baseline' }))(
                  $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))(`Public`),
                  ...!hasEnded
                    ? [
                      $text(countdownFn(Date.now() + timeDelta * 1000, Date.now()))
                    ]
                    : [
                    // $text(map(count => `${item.whitelistMax - count.toBigInt()}/${item.whitelistMax} left`, saleWallet.whitelistMinted)),
                    ],
                ),
                hasEnded ? $public : empty()
              )

            }, publicSaleTimeDelta)),

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


function $displayMintEvents(contract: Stream<GBCLab>, minev: Stream<Promise<IMintEvent>>) {
  return join(combineArray((lab, event) => {
    const contractAction = event.then(me => me.txHash)
    const contractReceipt = event.then(me => me.contractReceipt)

    return $IntermediatePromise({
      query: now(contractReceipt),
      $$fail: map(res => {
        const error = parseError(res)

        return $alert($text(error.message))
      }),
      $loader: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
        $spinner,
        $text(startWith('Awaiting Approval', map(() => 'Minting...', fromPromise(contractAction)))),
        $node(style({ flex: 1 }))(),
        switchLatest(map(txHash => $txHashRef(txHash, USE_CHAIN), fromPromise(contractAction)))
      ),
      $$done: map(tx => {
        if (tx?.logs.length === 0) {
          return $alert($text('Unable to reach subgraph'))
        }


        return $column(
          ...tx.logs.map(log => {
            const parsedLog = lab.interface.parseLog(log)
            const labItemId: number = parsedLog.args.id.toNumber()
            const amount: number = parsedLog.args.amount.toNumber()
                
            return $column(layoutSheet.spacing)(
              $row(style({ placeContent: 'space-between' }))(
                $text(style({ color: pallete.positive }))(`Minted ${amount} ${IAttributeMappings[labItemId]}`),
                $txHashRef(tx.transactionHash, USE_CHAIN)
              ),
              $row(layoutSheet.spacing, style({ flexWrap: 'wrap' }))(...Array(amount).fill($labItem(labItemId))),
            )
          })
        )
      }),
    })({})
  }, contract, minev))
}

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


const $giftIcon = $icon({ $content: $gift, width: '18px', fill: pallete.background, svgOps: style({ marginTop: '2px' }), viewBox: '0 0 32 32' })
const $container = $row(layoutSheet.spacingSmall)


const size = '44px'
const $img = $element('img')(style({ width: size, height: size, borderRadius: '5px' }))

const $freeClaimBtn = $container(
  $giftIcon,
  $text('Mint (Free)')
)




const timeChange = map(_ => unixTimestampNow(), periodic(1000))



