import { $node, $text, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { BaseProvider } from "@ethersproject/providers"
import { intervalTimeMap } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $jazzicon } from "../common/$avatar"
import { blueberrySubgraph, getIdentityFromENS, IEnsClaim, IProfile } from "@gambitdao/gbc-middleware"
import { $berryByToken } from "../logic/common"
import { awaitPromises, empty, map, now, switchLatest } from "@most/core"


export interface IAccountPreview {
  address: string
  labelSize?: string
  avatarSize?: number
  showAddress?: boolean
}

export interface IProfilePreview {
  profile: IProfile
  labelSize?: string
  avatarSize?: number
  showAddress?: boolean
}

export interface IAccountClaim extends IAccountPreview {
  walletLink: IWalletLink
}


export const $AccountLabel = (address: string, fontSize = '1em') => {

  return $column(style({ fontSize }))(
    $text(style({ fontSize: '.75em' }))(address.slice(0, 6)),
    $text(style({ fontSize: '1em' }))(address.slice(address.length - 4, address.length))
  )
}


// export const $ProfileLinks = (address: string, claim?: IClaim) => {
//   const $explorer = $anchor(attr({ href: getAccountExplorerUrl(CHAIN.ARBITRUM, address) }))(
//     $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
//   )

//   const twitterHandle = claim?.sourceType === IClaimSource.TWITTER
//     ? claim.name
//     : claim?.sourceType === IClaimSource.ENS
//       ? JSON.parse(claim.data).twitterUrl : null

//   if (twitterHandle) {
//     return $row(layoutSheet.spacing)(
//       $explorer,
//       $anchor(attr({ href: `https://twitter.com/${twitterHandle}` }))(
//         $icon({ $content: $twitter, width: '16px', viewBox: `0 0 24 24` })
//       ),
//     )
//   }


//   return $explorer
// }



export const $discoverIdentityDisplay = (config: IAccountPreview) => {
  const { labelSize = '16px', avatarSize = 38, address, showAddress = true } = config

  const profile = awaitPromises(blueberrySubgraph.profile(now({ id: address.toLowerCase() })))
  // const profile = fromPromise(queryProfile({ id: address.toLowerCase() }).catch(() => null))

  return switchLatest(map(p => {
    return p
      ? $profilePreview({ labelSize, avatarSize, profile: p, showAddress })
      : $accountPreview(config)
  }, profile))
}

export const $accountPreview = ({
  labelSize = '16px', avatarSize = 38, address, showAddress = true
}: IAccountPreview) => {
  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center', flexDirection: 'row-reverse', pointerEvents: 'none', textDecoration: 'none' }))(
    showAddress ? $AccountLabel(address, labelSize) : empty(),
    $jazzicon(address, avatarSize),
  )
}


export const $profilePreview = ({
  labelSize = '16px', avatarSize = 38, profile, showAddress = true
}: IProfilePreview) => {

  return $row(layoutSheet.row, layoutSheet.spacingSmall, style({ alignItems: 'center', pointerEvents: 'none', textDecoration: 'none' }))(
    profile.token
      ? style({ borderRadius: '50%' }, $berryByToken(profile.token, avatarSize))
      : $jazzicon(profile.id, avatarSize),
    showAddress
      ? profile.name
        ? $text(style({ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: labelSize }))(profile.name)
        : $AccountLabel(profile.id, labelSize)
      : empty()
  )
}


export const $disconnectedWalletDisplay = (avatarSize = 38) => {
  const sizePx = avatarSize + 'px'
  const $wrapper = $node(style({ width: sizePx, height: sizePx, minWidth: sizePx, minHeight: sizePx, borderRadius: '50%' }))

  return $row(layoutSheet.row, layoutSheet.spacingSmall, style({ alignItems: 'center', textDecoration: 'none' }))(
    $wrapper(style({ display: 'flex', border: `1px solid ${pallete.foreground}`, placeContent: 'center', alignItems: 'center' }))(
      $text(style({ fontWeight: 800, color: pallete.foreground }))('?')
    ),
    $column(style({ whiteSpace: 'nowrap', paddingRight: '8px' }))(
      $text(style({ fontSize: '.75em' }))('0x----'),
      $text(style({ fontSize: '1em' }))('----')
    )
  )
}





const CACHE_TTL = intervalTimeMap.DAY7


type ICachedId = IEnsClaim & { createdAt: number }
export async function getCachedMetadata(address: string, provider: BaseProvider) {
  const normalizedAddress = address.toLowerCase()

  const cachedItem = window.localStorage.getItem(`ens-${normalizedAddress}`)
  const item: ICachedId = cachedItem && JSON.parse(cachedItem)

  if (!item || item.createdAt > Date.now() + CACHE_TTL) {
    const ensName = await getIdentityFromENS(address, provider)

    if (ensName?.ensName) {
      const data: ICachedId = { createdAt: Date.now(), ...ensName }
      window.localStorage.setItem(`ens-${normalizedAddress}`, JSON.stringify(data))
    }

    return null
  }

  return item
}



