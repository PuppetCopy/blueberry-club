import { Behavior, replayLatest } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, state } from "@aelea/ui-components"
import { IOwner, IToken } from "@gambitdao/gbc-middleware"

import { IWalletLink } from "@gambitdao/wallet-link"
import { map, multicast } from "@most/core"
import { $responsiveFlex } from "../elements/$common"
import { queryOwnerV2 } from "../logic/query"
import { IAccountStakingStore } from "@gambitdao/gbc-middleware"
import { $anchor, $IntermediatePromise, $Link } from "@gambitdao/ui-components"
import { connectGbc } from "../logic/contract/gbc"
import { $accountPreview } from "../components/$AccountProfile"
import { ContractTransaction } from "@ethersproject/contracts"
import { $berryTileId } from "../components/$common"
import { $ButtonSecondary } from "../components/form/$Button"
import { $berryByToken } from "../logic/common"


export interface IAccount {
  walletLink: IWalletLink
  parentRoute: Route
  accountStakingStore: state.BrowserStore<IAccountStakingStore, "accountStakingStore">
  // walletStore: cstate.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}

export const $ProfileWallet = ({ walletLink, parentRoute, accountStakingStore }: IAccount) => component((
  [selectTokensForWhitelist, selectTokensForWhitelistTether]: Behavior<IToken[], IToken[]>,
  [selectTokensToWithdraw, selectTokensToWithdrawTether]: Behavior<IToken[], IToken[]>,
  [clickWithdraw, clickWithdrawTether]: Behavior<PointerEvent, PointerEvent>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [stakeTxn, stakeTxnTether]: Behavior<any, Promise<ContractTransaction>>,
  [setApprovalForAll, setApprovalForAllTether]: Behavior<any, Promise<ContractTransaction>>,

) => {




  const queryOwner = replayLatest(multicast(map(address => {
    if (!address) {
      throw new Error('No account connected')
    }

    return queryOwnerV2(address)
  }, walletLink.account)))



  const gbcWallet = connectGbc(walletLink)


  return [
    $responsiveFlex(layoutSheet.spacingBig)(

      $column(layoutSheet.spacingBig)(
        $IntermediatePromise({
          query: queryOwner,
          $$done: map(owner => {
            if (owner === null) {
              return null
            }

            return $Profile(owner)({})
          }),
        })({}),

        $Link({
          $content: $anchor(
            $ButtonSecondary({
              $content: $text('Customize my GBC')
            })({}),
          ),
          url: '/p/wardrobe', route: parentRoute
        })({
          click: changeRouteTether()
        }),
      )

    ),

    { changeRoute }
  ]
})


export const $Profile = (owner: IOwner) => component((
  [selectTokensForWhitelist, selectTokensForWhitelistTether]: Behavior<IToken[], IToken[]>,

) => {


  return [
    $responsiveFlex(layoutSheet.spacingBig)(

      $column(layoutSheet.spacingBig, style({ width: '300px' }))(
        style({ placeContent: 'center' }, $accountPreview({
          labelSize: '2em',
          avatarSize: 130,
          address: owner.id
        })),

        $row(style({ flexWrap: 'wrap' }))(...owner.ownedTokens.map(token => {
          return $berryByToken(token, 75)
        })),


      ),

    )
  ]
})
