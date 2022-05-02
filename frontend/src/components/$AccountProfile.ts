import { Behavior, O, Op } from "@aelea/core"
import { $element, $node, $text, attr, component, INode, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { BaseProvider } from "@ethersproject/providers"
import { Stream } from "@most/types"
import { CHAIN, getAccountExplorerUrl, IClaim, IClaimSource, intervalInMsMap } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $jazzicon } from "../common/$avatar"
import { getGatewayUrl, getIdentityFromENS, IEnsClaim } from "@gambitdao/gbc-middleware"
import { $anchor, $ethScan, $Link, $twitter } from "@gambitdao/ui-components"
import { getProfile } from "../logic/contract/manager"
import { $berryByLabItems } from "../logic/common"
import { fromPromise, map, switchLatest } from "@most/core"


export interface IAccountPreview {
  address: string
  labelSize?: string
  avatarSize?: number
  claim?: IClaim
}

export interface IAccountClaim extends IAccountPreview {
  walletLink: IWalletLink
}

export interface IProfile extends IAccountClaim {
  tempFix?: boolean
  claimMap: Stream<Map<string, IClaim>>
}


const $photoContainer = $element('img')(style({ display: 'block', backgroundColor: pallete.background, position: 'relative', backgroundSize: 'cover', borderRadius: '50%', overflow: 'hidden' }))

export const $AccountPhoto = (address: string, claim?: IClaim, size = 42) => {
  const claimType = claim?.sourceType
  const sizePx = size + 'px'

  const $wrapper = $node(style({ width: sizePx, height: sizePx, minWidth: sizePx, minHeight: sizePx, borderRadius: '50%' }))

 

  const profile = fromPromise(getProfile(address).catch(() => null))
  return $wrapper(
    switchLatest(map(profile => {
      if (profile === null || profile.tokenId === null) {
        if (claimType) {
          const isTwitter = claimType === IClaimSource.TWITTER

          if (isTwitter) {
            return $photoContainer(
              style({ width: sizePx, height: sizePx, minWidth: sizePx }),
              attr({ src: `https://unavatar.vercel.app/twitter/${claim.name}` })
            )()
          } else {
            const data: IEnsClaim = claim.data ? JSON.parse(claim.data) : {}
            const imageUrl = data.imageUrl

            if (imageUrl) {
              return $photoContainer(attr({ src: getGatewayUrl(imageUrl) }), style({ minWidth: sizePx, width: sizePx, minHeight: sizePx, height: sizePx }))()
            }
          }
        }

        return $jazzicon(address, sizePx)
      }

      return style({ borderRadius: '50%' }, $berryByLabItems(profile.tokenId, profile.background, profile.custom, size))
    }, profile))
  )
}



export const $AccountLabel = (address: string, claim?: IClaim, fontSize = '1em') => {
  if (claim) {
    return $text(style({ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize }))(claim.name)
  }

  return $column(style({ fontSize }))(
    $text(style({ fontSize: '.75em' }))(address.slice(0, 6)),
    $text(style({ fontSize: '1em' }))(address.slice(address.length -4, address.length))
  )

}


export const $ProfileLinks = (address: string, claim?: IClaim) => {
  const $explorer = $anchor(attr({ href: getAccountExplorerUrl(CHAIN.ARBITRUM, address) }))(
    $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
  )

  const twitterHandle = claim?.sourceType === IClaimSource.TWITTER
    ? claim.name
    : claim?.sourceType === IClaimSource.ENS
      ? JSON.parse(claim.data).twitterUrl : null

  if (twitterHandle) {
    return $row(layoutSheet.spacing)(
      $explorer,
      $anchor(attr({ href: `https://twitter.com/${twitterHandle}` }))(
        $icon({ $content: $twitter, width: '16px', viewBox: `0 0 24 24` })
      ),
    )
  }


  return $explorer
}



export const $accountPreview = ({
  labelSize = '16px', avatarSize = 38, claim, address,
}: IAccountPreview) => {

  return $row(layoutSheet.row, layoutSheet.spacingSmall, style({ alignItems: 'center', pointerEvents: 'none', textDecoration: 'none' }))(
    $AccountPhoto(address, claim, avatarSize),
    $AccountLabel(address, claim, labelSize)
  )
}


export const $walletAccountDisplay = (avatarSize = 38) => {
  const sizePx = avatarSize + 'px'
  const $wrapper = $node(style({ width: sizePx, height: sizePx, minWidth: sizePx, minHeight: sizePx, borderRadius: '50%' }))

  return $row(layoutSheet.row, layoutSheet.spacingSmall, style({ alignItems: 'center', textDecoration: 'none' }))(
    $wrapper(style({ display: 'flex', border: `1px solid ${pallete.foreground}`, placeContent: 'center', alignItems: 'center' }))(
      $text(style({ fontWeight: 800, color: pallete.foreground }))('?')
    ),
    $column(
      $text(style({ fontSize: '.75em' }))('0x----'),
      $text(style({ fontSize: '1em' }))('----')
    )
  )
}





const CACHE_TTL = intervalInMsMap.DAY7


type ICachedId = IEnsClaim & { createdAt: number }
export async function getCachedMetadata (address: string, provider: BaseProvider) {
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



