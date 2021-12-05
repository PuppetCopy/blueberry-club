import { Behavior, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, attrBehavior, component, INode, nodeEvent, style, styleInline, stylePseudo } from "@aelea/dom"
import { $column, $icon, $NumberTicker, $row, $seperator, layoutSheet, state } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { ContractReceipt, ContractTransaction } from "@ethersproject/contracts"
import { DEPLOYED_CONTRACT, MINT_MAX_SUPPLY, MINT_PRICE, USE_CHAIN, WHITELIST } from "@gambitdao/gbc-middleware"
import { ETH_ADDRESS_REGEXP, getGatewayUrl, groupByMapMany, shortenTxAddress } from "@gambitdao/gmx-middleware"
import { getTxExplorerUrl, IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, chain, combineArray as combineArrayMost, constant, continueWith, empty, fromPromise, join, map, merge, mergeArray, multicast, now, periodic, scan, skipRepeats, snapshot, startWith, switchLatest, takeWhile, tap } from "@most/core"
import { Stream } from "@most/types"
import { GBC, GBC__factory } from "contracts"
import { IEthereumProvider } from "eip1193-provider"
import { $IntermediateTx, $spinner } from "../common/$IntermediateDisplay"
import { $alert, $anchor, $responsiveFlex } from "../elements/$common"
import { $caretDown, $gift } from "../elements/$icons"
import { $IntermediateConnect } from "./$ConnectAccount"
import { $ButtonPrimary } from "./form/$Button"
import { $Dropdown } from "./form/$Dropdown"
import { ClientOptions, createClient, gql, TypedDocumentNode } from "@urql/core"
import { BaseProvider, TransactionReceipt } from "@ethersproject/providers"


// export type ITransfer = ExtractAndParseEventType<GBC, 'Transfer'>

interface IToken {
  id: string
  account: string
  uri: string

  transfers: ITransfer[]
}

interface ITransfer {
  id: string
  token: IToken
  from: Owner
  to: Owner
  transactionHash: string
}

interface Owner {
  id: string
  ownedTokens: IToken[]
  balance: bigint
}

const schemaFragments = `

fragment tokenFields on Token {
  id
  account
  uri
}

fragment ownerFields on Owner {
  ownedTokens
  balance
}

`

type QueryAccountOwnerNfts = {
  account: string
}

export const accountOwnedNfts: TypedDocumentNode<{owner: Owner}, QueryAccountOwnerNfts> = gql`
${schemaFragments}

query ($account: Int) {
  owner(id: $account) {
    ownedTokens {
      uri
      id
    }
    balance
  }
}

`

export const mintSnapshot: TypedDocumentNode<{owner: Owner}, QueryAccountOwnerNfts> = gql`
${schemaFragments}

query ($account: String) {
  owner(id: $account) {
    ownedTokens {
      transfers {
        transactionHash
        id
        from {
          id
        }
      }
      uri
      id
    }
    balance
  }
}
`

interface Owner {
  id: string
}

export const prepareClient = (opts: ClientOptions) => {

  const client = createClient(opts)

  return async <Data, Variables extends object = {}>(document: TypedDocumentNode<Data, Variables>, params: Variables): Promise<Data> => {
    const result = await client.query(document, params)
      .toPromise()
  
    if (result.error) {
      throw new Error(result.error.message)
    }
  
    return result.data!
  }
}

export const vaultClient = prepareClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/bluberry-club',
  // requestPolicy: 'network-only'
})





export interface IMint {
  walletLink: IWalletLink
  walletStore: state.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}

interface IFormState {
  canClaim: boolean
  hasPublicSaleStarted: boolean
  hasWhitelistSaleStarted: boolean
  mintAmount: null | number
}


interface IMintEvent {
  amount: number
  contractReceipt: Promise<ContractReceipt>
  txHash: Promise<string>
}

type StreamInput<T> = {
  [P in keyof T]: Stream<T[P]>
}


export function replayState<A, K extends keyof A = keyof A>(state: StreamInput<A>, initialState: A): Stream<A> {
  const entries = Object.entries(state) as [keyof A, Stream<A[K]>][]
  const streams = entries.map(([key, stream]) => replayLatest(stream, initialState[key]))

  const combinedWithInitial = combineArrayMost((...arrgs: A[K][]) => {
    return arrgs.reduce((seed, val, idx) => {
      const key = entries[idx][0]
      seed[key] = val

      return seed
    }, {} as A)
  }, streams)

  return combinedWithInitial
}

const queryOwnedNfts = async (account: string) => {
  return (await vaultClient(accountOwnedNfts, { account })).owner
}

const $queryOwnerTrasnferNfts = async (contract: GBC, provider: BaseProvider, account: string) => {
  const owner = (await vaultClient(mintSnapshot, { account: account.toLowerCase() })).owner

  if (owner === null) {
    return []
  }

  const groupedByTxHash = Object.entries(groupByMapMany(owner.ownedTokens, token => token.transfers[0].transactionHash))
  const mints = groupedByTxHash.map(async ([hash, token]) => {
    const tx = provider.getTransactionReceipt(hash)

    const mintAction: IMintEvent = {
      amount: token.length,
      txHash: Promise.resolve(hash),
      contractReceipt: tx
    }

    return $mintAction(contract, Promise.resolve(mintAction))
  })
  return Promise.all(mints)
}

export const $Mint = (config: IMint) => component((
  [selectMintAmount, selectMintAmountTether]: Behavior<number, number>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
  [clickClaim, clickClaimTether]: Behavior<PointerEvent, Promise<IMintEvent>>,
  [customNftAmount, customNftAmountTether]: Behavior<INode, number>,

) => {

  const hasAccount = map(address => address && !ETH_ADDRESS_REGEXP.test(address), config.walletLink.account)
  const supportedNetwork = map(x => x !== USE_CHAIN, config.walletLink.network)




  const contract = replayLatest(multicast(skipRepeats(awaitPromises(map(async w3p => {
    if (w3p === null || (await w3p.getNetwork()).chainId !== USE_CHAIN) {
      return null
    }

    const contract = GBC__factory.connect(DEPLOYED_CONTRACT, w3p.getSigner())

    if (await contract.deployed()) {
      return contract
    }

    return null
  }, config.walletLink.provider)))))


  const hasWhitelistSaleStarted = awaitPromises(map(contract => {
    return contract ? contract.wlMintStarted() : false
  }, contract))

  const hasPublicSaleStarted = awaitPromises(map(contract => {
    return contract ? contract.publicSaleStarted() : false
  }, contract))


  const totalMinted = awaitPromises(map(async contract => {
    if (contract) {
      return (await contract.totalSupply()).toNumber()
    }

    return 0
  }, contract))


  const totalMintedChangeInterval = switchLatest(constant(totalMinted, periodic(1000)))

  const totalMintedChange = continueWith(() => now(MINT_MAX_SUPPLY), takeWhile(res => res < MINT_MAX_SUPPLY, totalMintedChangeInterval))
  const hasMintEnded = skipRepeats(map(amount => {
    return amount === MINT_MAX_SUPPLY
  }, totalMintedChange))


  const canClaim = awaitPromises(combineArray(async (contract, account) => {
    if (contract && account && WHITELIST[account.toLocaleLowerCase()]) {
      return (await contract.isBlacklisted(account)) === false
    }
    return false
  }, contract, config.walletLink.account))

  const accountChange = merge(hasAccount, supportedNetwork)
  const mintAmount = merge(customNftAmount, selectMintAmount)


  const formState = replayState({ canClaim, mintAmount, hasPublicSaleStarted, hasWhitelistSaleStarted }, { canClaim: false, mintAmount: null, hasWhitelistSaleStarted: false,  hasPublicSaleStarted: false } as IFormState)
  
  const buttonState = multicast(map(({ hasWhitelistSaleStarted, hasPublicSaleStarted, formState: { mintAmount } }) => {
    return !hasWhitelistSaleStarted || hasPublicSaleStarted && mintAmount === null
  }, combineObject({ formState, hasWhitelistSaleStarted, hasPublicSaleStarted })))

  return [
    $column(layoutSheet.spacing, style({ flex: 1 }))(
      
      $responsiveFlex(layoutSheet.spacing, style({ fontSize: '1.5em' }))(
        switchLatest(map(hasEnded => {
          return hasEnded
            ? $text(style({ fontSize: '1.25em', fontWeight: 'bold' }))('Sale has ended!')
            : $text(style({ color: pallete.indeterminate }))(`Whitelist Minting is Live!`)
        }, hasMintEnded)),
        switchLatest(map(provider => {

          if (provider === null) {
            return empty()
          }

          return $row(layoutSheet.spacingTiny)(
            $NumberTicker({
              value$: totalMintedChange,
              decrementColor: pallete.primary,
              incrementColor: pallete.primary,
            }),
            $text(style({ color: pallete.foreground }))('/'),
            $text(`10,000`)
          )
        }, contract)),
      ),

      $node(),

      $IntermediateConnect({
        walletStore: config.walletStore,
        containerOp: style({ flex: 1 }),
        $display: switchLatest(map(hasEnded => {
          return hasEnded ? empty() : $row(layoutSheet.spacing, style({ flexWrap: 'wrap', alignItems: 'center' }))(
            switchLatest(map(hasPublicSaleStarted => {
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
                  $option: map(option => $text(String(option))),
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
                map(({ canClaim, mintAmount, hasPublicSaleStarted, hasWhitelistSaleStarted }) => {

                  if (!hasPublicSaleStarted) {
                    if (!hasWhitelistSaleStarted) {
                      return $text('Awaiting Contract Approval...')
                    }

                    return $freeClaimBtn
                  }

                  if (mintAmount === null) {
                    return $text('Select Amount')
                  }

 
                  if ((!canClaim || mintAmount > 1) && hasPublicSaleStarted) {
                    return $container(
                      canClaim ? $giftIcon : empty(),
                      $text(canClaim ? `Mint ${mintAmount - 1} + 1 free (${(mintAmount - 1) * .03}ETH)` : `Mint ${mintAmount} (${mintAmount * .03}ETH)`),
                    )
                  }

                  return $freeClaimBtn
                }, formState)
              ),
            })({
              click: clickClaimTether(
                snapshot(async ({ formState: { canClaim, mintAmount, hasPublicSaleStarted, hasWhitelistSaleStarted }, contract, account }, click): Promise<IMintEvent> => {
                  if (contract === null || !account) {
                    throw new Error(`Unable to resolve contract`)
                  }

                  let contractAction: Promise<ContractTransaction>

                  if (hasWhitelistSaleStarted && !hasPublicSaleStarted) {
                    const signature = WHITELIST[account.toLocaleLowerCase()]

                    if (!signature) {
                      throw Error('Connected Account is not eligible')
                    }
                    contractAction = contract.claim(signature)
                  } else {
                    if (mintAmount === null) {
                      throw new Error(`Unable to resolve contract`)
                    }
                    
                    contractAction = canClaim
                      ? contract.whitelistMint(mintAmount, WHITELIST[account.toLocaleLowerCase()], { value: BigInt(mintAmount - 1) * MINT_PRICE })
                      : contract.mint(mintAmount, { value: BigInt(mintAmount) * MINT_PRICE })
                  }
   
                
                
                  const contractReceipt = contractAction.then(recp => recp.wait())


                  return {
                    amount: mintAmount || 1,
                    contractReceipt,
                    txHash: contractAction.then(t => t.hash),
                  }

                }, combineObject({ formState, contract, account: config.walletLink.account })),
              )
            })
        
          )
        }, hasMintEnded)),
        
        walletLink: config.walletLink
      })({
        walletChange: walletChangeTether()
      }),

      $node(),
      $node(),

      join(snapshot(({ contract, provider, account }, minev) => {
        if (contract === null || provider === null) {
          return empty()
        }

        return $mintAction(contract, minev)
      }, combineObject({ contract, provider: config.walletLink.provider, account: config.walletLink.account }), clickClaim)),

      switchLatest(awaitPromises(map(async ({ contract, provider, account }) => {

        if (contract === null || provider === null || account === null) {
          return empty()
        }
        const mintHistory = await $queryOwnerTrasnferNfts(contract, provider, account)

        return mergeArray(mintHistory)
      }, combineObject({ contract, provider: config.walletLink.provider, account: config.walletLink.account })))),

    ),
    
    { walletChange }
  ]
})


const $giftIcon = $icon({ $content: $gift, width: '18px', fill: pallete.background, svgOps: style({ marginTop: '2px' }), viewBox: '0 0 32 32' })
const $container = $row(layoutSheet.spacingSmall)


const counter = scan((seed, n: number) => seed + n, 0, constant(1, periodic(2000)))

const blueberriesPreviewList = ['/assets/blueberriesNFT/Green.png', '/assets/blueberriesNFT/Orange.png', '/assets/blueberriesNFT/Purple.png', '/assets/blueberriesNFT/Yellow.png']

const size = '44px'
const $img = $element('img')(style({ width: size, height: size, borderRadius: '5px', border: `1px solid ${pallete.middleground}` }))
const $nftBox = $img(attrBehavior(map(n => ({ src: blueberriesPreviewList[(n % blueberriesPreviewList.length)] }), counter)))

const $freeClaimBtn = $container(
  $giftIcon,
  $text('Mint (Free)')
)


function $mintAction(contract: GBC, mintAction: Promise<IMintEvent>) {
  const contractAction = mintAction.then(me => me.txHash)
  const contractReceipt = mintAction.then(me => me.contractReceipt)
  const berriesAmount = mintAction.then(me => me.amount)


  return $column(layoutSheet.spacing)(
    $IntermediateTx({
      query: now(contractReceipt),
      $loader: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
        $spinner,
        $text(startWith('Awaiting Approval', map(() => 'Minting...', fromPromise(contractAction)))),
        $node(style({ flex: 1 }))(),
        switchLatest(map(txHash => $txHashLink(txHash), fromPromise(contractAction)))
      ),
      $done: map(tx => $mintDetails(contract, tx, berriesAmount)),
    })({}),
    style({ backgroundColor: colorAlpha(pallete.foreground, .15) }, $seperator),
  )
}

function $mintDetails(contract: GBC, contractReceipt: TransactionReceipt, berriesAmount: Promise<number>) {
  const logs = contractReceipt?.logs

  if (contract && logs) {
    const $ownedList = logs.map(log => {
      const payload = contract.interface.parseLog(log).args
      const tokenId = payload.tokenId
      const metadata = fromPromise(getTokenIdMetadata(contract, tokenId).catch(() => null))

      return $column(
        switchLatest(map(metadata => {
          return metadata?.image ? $img(attr({ src: getGatewayUrl(metadata.image) }))() : $nftBox()
        }, metadata)),
        $text(style({ textAlign: 'center', fontSize: '.75em' }))(String(tokenId))
      )
    })

   
    return $column(layoutSheet.spacing)(
      $row(style({ placeContent: 'space-between' }))(
        $text(style({ color: pallete.positive }))(
          map(amount => `Minted ${amount} Berries`, fromPromise(berriesAmount))
        ),
        $txHashLink(contractReceipt.transactionHash)
      ),
      $row(layoutSheet.spacingSmall, style({ flexWrap: 'wrap' }))(...$ownedList)
    )
  }

  return $alert($text('Unable to reach subgraph'))
}

const $txHashLink = (txHash: string) => {
  const href = getTxExplorerUrl(USE_CHAIN, txHash)

  return $anchor(attr({ href, target: '_blank' }))($text(shortenTxAddress(txHash)))
}

async function getTokenIdMetadata(contract: GBC, tokenId: number) {
  const tokenUri = await contract.tokenURI(tokenId)
  const gateway = getGatewayUrl(tokenUri, BigInt(tokenId).toString(16))
  const metadata = await (await fetch(gateway)).json()

  return metadata
}

