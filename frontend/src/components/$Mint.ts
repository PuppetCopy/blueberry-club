import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $element, $text, attrBehavior, component, style } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { Web3Provider } from "@ethersproject/providers"
import { CHAIN, IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, constant, empty, map, merge, mergeArray, multicast, now, periodic, scan, snapshot, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { $gift } from "../elements/$icons"
import { $IntermediateConnect } from "./$ConnectAccount"
import { $ButtonPrimary } from "./form/$Button"
import { $Dropdown } from "./form/$Dropdown"
import { GBC__factory } from "contracts"
import { ContractTransaction } from "@ethersproject/contracts"
import { $IntermediateTx } from "../common/$IntermediateDisplay"
import { ETH_ADDRESS_REGEXP } from "@gambitdao/gmx-middleware"
import { DEPLOYED_CONTRACT } from "../const"


export interface IMint {
  walletLink: Stream<IWalletLink | null>

}


export const $Mint = (config: IMint) => component((
  [selectMintAmount, selectMintAmountTether]: Behavior<number, number>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
  [clickClaim, clickClaimTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,

) => {

  const accountChange = switchLatest(map(wallet => {
    if (!wallet) {
      return now(true)
    }

    const hasAccount = map(address => !ETH_ADDRESS_REGEXP.test(address), wallet.account)
    const supportedNetwork = map(x => x !== CHAIN.ETH_ROPSTEN, wallet.network)
    // const supportedNetwork = map(x => CHAIN.ARBITRUM !== x, wallet.network)

    return merge(hasAccount, supportedNetwork)
  }, config.walletLink))



  const $giftIcon = $icon({ $content: $gift, width: '18px', fill: pallete.background, svgOps: style({ marginTop: '2px' }), viewBox: '0 0 32 32' })
  const $container = $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))
  const $mintFreeText = $container(
    $giftIcon,
    $text('Claim (Free)')
  )

  const counter = scan((seed, n: number) => seed + n, 0, constant(1, periodic(2000)))

  const blueberriesPreviewList = ['/assets/blueberriesNFT/Green.png', '/assets/blueberriesNFT/Orange.png', '/assets/blueberriesNFT/Purple.png', '/assets/blueberriesNFT/Yellow.png']

  const size = '54px'
  const $img = $element('img')(style({ width: size, height: size, borderRadius: '5px', border: `1px solid ${pallete.middleground}` }))
  const $nftBox = $img(attrBehavior(map(n => ({ src: blueberriesPreviewList[(n % blueberriesPreviewList.length)] }), counter)))
  const provider: Stream<Web3Provider> = switchLatest(map(x => {
    return x?.provider ? now(x.provider) : empty()
  }, config.walletLink))


  const contract = replayLatest(multicast(map(w3p => {
    return GBC__factory.connect(DEPLOYED_CONTRACT, w3p.getSigner())
  }, provider)))


  const hasPresaleStarted = awaitPromises(map(x => x.wlMintStarted(), contract))

  return [
    $column(layoutSheet.spacing)(
      $row(layoutSheet.spacing, style({ flexWrap: 'wrap' }))(
        $Dropdown({
          disabled: accountChange,
          $noneSelected: $text('Mint Amount'),
          select: {
            list: [
              1, 2, 5, 10, 20
            ],
          }
        })({
          select: selectMintAmountTether(multicast)
        }),
        $IntermediateConnect({
          $display: $ButtonPrimary({
            disabled: startWith(true, map(({ hasPresaleStarted, selectMintAmount }) =>
              !hasPresaleStarted || !Number.isFinite(selectMintAmount)
            , combineObject({ selectMintAmount, hasPresaleStarted }))),
            $content: switchLatest(mergeArray([
              snapshot((contract, amount) => {

                if (amount > 1) {
                  return $container(
                    $giftIcon,
                    $text(`${amount - 1} + 1 free (${(amount - 1) * .03}ETH)`),
                  )
                }

                return $mintFreeText
              }, contract, selectMintAmount),
              now($mintFreeText)
            ])),
          })({
            click: clickClaimTether(
              snapshot(async ({ contract, selectMintAmount, provider }, click) => {

                const mintCost = 30000000000000000n

                // const publicSaleStarted = await contract.publicSaleStarted()
                // const saleTx = await contract.startPublicSale()

                // const signer = provider.getSigner()
                // const signature = await signer.signMessage('address')
                // debugger
                const ww = contract.whitelistMint(selectMintAmount, '0x0a', { value: BigInt(selectMintAmount) * mintCost })

                return ww

              }, combineObject({ contract, selectMintAmount, provider })),
            )
          }),
          walletLink: config.walletLink
        })({
          walletChange: walletChangeTether()
        }),
        $IntermediateTx({
          query: clickClaim,
          clean: merge(accountChange, selectMintAmount),
          $done: map(res => $text('done')),
        })({})

      // $ButtonPrimary({ buttonOp: style({ pointerEvents: 'none' }), $content: $row(layoutSheet.spacingSmall)($text(style({ fontWeight: 'normal' }))(`We're building...`), $text(`see you soon`)) })({})
      ),

      $row(layoutSheet.spacing, style({ minHeight: '54px', flexWrap: 'wrap' }))(
        switchLatest(map(amount => mergeArray(Array(amount).fill($nftBox())), selectMintAmount))
      )

    ),
    { walletChange }
  ]
})