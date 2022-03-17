import { Behavior, replayLatest } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $responsiveFlex } from "../../elements/$common"
import { labItemDescriptionListMap, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { $seperator2 } from "../common"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $Mint } from "../../components/$Mint"
import { WALLET } from "../../logic/provider"
import { $labItem } from "../../logic/common"
import { awaitPromises, map, multicast, now, skipRepeats } from "@most/core"
import { GBCLab__factory, GBC__factory, Public__factory } from "contracts"
import { countdown, EXPLORER_URL, NETWORK_METADATA } from "@gambitdao/gmx-middleware"



interface ILabItem {
  walletLink: IWalletLink
  parentRoute: Route
  walletStore: state.BrowserStore<WALLET, "walletStore">
}

export const $LabItem = ({ walletLink, walletStore, parentRoute }: ILabItem) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {
  const urlFragments = document.location.pathname.split('/')
  const [itemIdUrl] = urlFragments.slice(3)
  const itemId = Number(itemIdUrl)

  const item = labItemDescriptionListMap[itemId]

  const contract = replayLatest(multicast(skipRepeats(awaitPromises(map(async w3p => {
    if (w3p === null) {
      throw new Error('No wallet provider')
    }
    if (w3p?.network?.chainId !== USE_CHAIN) {
      throw new Error(`Chain is not connected to ${NETWORK_METADATA[USE_CHAIN].chainName}`)
    }

    return Public__factory.connect(item.contractAddress, w3p.getSigner()).deployed()
  }, walletLink.provider)))))

  const hasWhitelistSaleStarted = awaitPromises(map(async c => {
    return c.saleStarted()
  }, contract))

  const hasPublicSaleStarted = awaitPromises(map(async c => {
    return c.saleStarted()
  }, contract))


  const newLocal = $text(countdown(item.saleDate))
  return [
    $column(layoutSheet.spacingBig)(
      $responsiveFlex(style({ justifyContent: 'space-between' }))(
        style({  minWidth: '450px', height: '450px', overflow: 'hidden', borderRadius: '30px', backgroundColor: colorAlpha(pallete.message, .95) }, $labItem(item.id)),

        $column(layoutSheet.spacingBig, style({ maxWidth: '620px' }))(
          $column(style({ fontSize: screenUtils.isMobileScreen ? '2.1em' : '3.1em' }))(
            $node(
              $text(style({}))(`Lab's `),
              $text(style({ fontWeight: 'bold' }))( item.name),
            ),
          ),

          $text(style({ lineHeight: '1.5em' }))(item.description),

          // $node(),

          $seperator2,

          item.saleDate > Date.now() ? newLocal : $Mint({
            walletLink,
            walletStore,
            item,
            presaleLive: hasWhitelistSaleStarted,
            publicSaleLive: hasPublicSaleStarted,
            accountCanMintPresale: now(false)
          })({}),


        ),
        
      ),



      
    ),

    { changeRoute }
  ]
})


export const $testGBCItem = ({ walletLink, walletStore, parentRoute }: ILabItem) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {
  const urlFragments = document.location.pathname.split('/')
  const [itemIdUrl] = urlFragments.slice(3)
  const itemId = Number(itemIdUrl)

  const item = labItemDescriptionListMap[itemId]

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


  return [
    $column(layoutSheet.spacingBig)(
      $responsiveFlex(style({ justifyContent: 'space-between' }))(
        style({  minWidth: '450px', height: '450px', overflow: 'hidden', borderRadius: '30px', backgroundColor: colorAlpha(pallete.message, .95) }, $labItem(item.id)),

        $column(layoutSheet.spacingBig, style({ maxWidth: '620px' }))(
          $column(style({ fontSize: screenUtils.isMobileScreen ? '2.1em' : '3.1em' }))(
            $node(
              $text(style({}))(`Lab's `),
              $text(style({ fontWeight: 'bold' }))( item.name),
            ),
          ),

          $text(style({ lineHeight: '1.5em' }))(item.description),

          // $node(),

          $seperator2,

          $Mint({
            walletLink,
            walletStore,
            item,
            presaleLive: hasWhitelistSaleStarted,
            publicSaleLive: hasPublicSaleStarted,
            accountCanMintPresale: now(true)
          })({}),


        ),
        
      ),



      
    ),

    { changeRoute }
  ]
})
