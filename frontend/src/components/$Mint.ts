import { Behavior, combineObject } from "@aelea/core"
import { $element, $node, $text, attr, component, INode, nodeEvent, style, styleBehavior, styleInline, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, $seperator, layoutSheet, state } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { ContractReceipt } from "@ethersproject/contracts"
import { hasWhitelistSale, IAttributeMappings, LabItemSaleDescription, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { countdownFn, ETH_ADDRESS_REGEXP, formatFixed, replayState, unixTimestampNow } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, empty, fromPromise, join, map, merge, multicast, now, periodic, skipRepeats, snapshot, startWith, switchLatest, tap } from "@most/core"
import { IEthereumProvider } from "eip1193-provider"
import { $txHashRef } from "../elements/$common"
import { $caretDown, $gift } from "../elements/$icons"
import { $IntermediateConnect } from "./$ConnectAccount"
import { $ButtonPrimary, $ButtonSecondary } from "./form/$Button"
import { $defaultSelectContainer, $Dropdown, $DropMultiSelect } from "./form/$Dropdown"
import { WALLET } from "../logic/provider"
import { $alert, $IntermediateTx, $spinner } from "@gambitdao/ui-components"
import { $berryTileId } from "./$common"
import { $labItem, takeUntilLast } from "../logic/common"
import { $seperator2 } from "../pages/common"
import { connectGbc } from "../logic/contract/gbc"
import { connectLab } from "../logic/contract/lab"
import { connectSale, getMintCount } from "../logic/contract/sale"




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

  const mintCount = getMintCount(item.contractAddress)

  const gbcWallet = connectGbc(walletLink)
  const labWallet = connectLab(walletLink)
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


  const $public = $row(layoutSheet.spacing, style({ flexWrap: 'wrap', alignItems: 'center' }))(
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
          const total = selectedMintAmount * priceFormated

          return $text(`Mint ${selectedMintAmount} (${total > 0n ? total + 'ETH' : 'Free'})`)

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

        }, combineObject({ formState, saleContract: saleWallet.contract, account: walletLink.account })),
      )
    })   
  )

  const $whitelist = switchLatest(map(ownedGbcs => {


    const $noBerriesOwnedMsg = $alert($text(`Connected account does not own any GBC's`))

    return switchLatest(map(tokenList => {
      const options = tokenList

      const chosenTokens = startWith([], selectTokensForWhitelist)

      return $column(layoutSheet.spacing)(
        $row(layoutSheet.spacing, style({ alignItems: 'flex-start' }))(

          $DropMultiSelect({
            $selection: map(s => {

              const $content = $row(style({ alignItems: 'center' }))(
                s.length === 0 ? $text(`Select Berry`) : $row(...s.map(i => $berryTileId(i))),
                $icon({ $content: $caretDown, width: '18px', svgOps: style({ marginTop: '3px', marginLeft: '6px' }), viewBox: '0 0 32 32' }),
              )

              return $ButtonSecondary({
                $content,
                disabled: now(tokenList.length === 0)
              })({})
            }),
            value: now([]),
            $option: $row,
            select: {
              $container: $defaultSelectContainer(style({ gap: 0, flexWrap: 'wrap', width: '300px', maxHeight: '400px', overflow: 'auto', flexDirection: 'row' })),
              optionOp: snapshot((list, token) => {

                if (!token) {
                  throw new Error(`No berry id:${token} exists`)
                }

                const isUsedStyle = styleBehavior(map(isUsed => (isUsed ? { filter: 'grayscale(100%)', pointerEvents: 'none' } : null), saleWallet.hasTokenUsed(token)))

                return isUsedStyle(style({ cursor: 'pointer', opacity: list.indexOf(token) === -1 ? 1 : .5 }, $berryTileId(token)))
              }, chosenTokens),
              options
            }
          })({
            selection: selectTokensForWhitelistTether()
          }),            

          $ButtonPrimary({
            disabled: map(s => s.length === 0, chosenTokens),
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

              }, combineObject({ selectTokensForWhitelist: chosenTokens, saleContract: saleWallet.contract, account: walletLink.account })),
            )
          })
        ),
        tokenList.length === 0 ? $noBerriesOwnedMsg : empty()
      )
    }, gbcWallet.tokenList))

  }, gbcWallet.tokenList))



  return [
    $IntermediateConnect({
      walletStore,
      $container: $column(layoutSheet.spacingBig),
      $display: $column(layoutSheet.spacingBig)(
        $column(layoutSheet.spacingBig)(

          hasWhitelistSale(item)
            ? $column(layoutSheet.spacing)(
              $row(layoutSheet.spacing, style({ alignItems: 'baseline' }))(
                $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))(`Whitelist`),

                $text(
                  switchLatest(map(timeDelta => {
                    const hasEnded = timeDelta === null

                    return hasEnded
                      ? map(count => `${item.whitelistMax - count.toBigInt()}/${item.whitelistMax} left`, saleWallet.whitelistMinted)
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
              $seperator2,
            
            )
            : empty(),


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
              $done: map(tx => {
                if (tx?.logs.length === 0) {
                  return $alert($text('Unable to reach subgraph'))
                }


                return $column(
                  ...tx.logs.map(log => {
                    const parsedLog = contract.interface.parseLog(log)
                    const labItemId: number = parsedLog.args.id.toNumber()
                    const amount: number = parsedLog.args.value.toNumber()
                  
                    return $column(layoutSheet.spacing)(
                      $row(style({ placeContent: 'space-between' }))(
                        $text(style({ color: pallete.positive }))(`Minted ${amount} ${IAttributeMappings[labItemId]}`),
                        $txHashRef(tx.transactionHash)
                      ),
                      $row(style({ flexWrap: 'wrap' }))(...Array(amount).map(tokenId => {     
                        return $labItem(labItemId)
                      })),
                    )
                  })
                )
              }),
            })({}),
          )

        }, combineObject({ contract: labWallet.contract, provider: walletLink.provider, account: walletLink.account }), clickClaim)),
      ),
        
      walletLink: walletLink
    })({
      walletChange: walletChangeTether()
    }),
    
    { walletChange }
  ]
})


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



