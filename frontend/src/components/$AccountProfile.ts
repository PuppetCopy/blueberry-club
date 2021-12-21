import { Behavior, O, Op } from "@aelea/core"
import { $element, $text, attr, component, INode, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { BaseProvider } from "@ethersproject/providers"
import { Stream } from "@most/types"
import { getGatewayUrl, getIdentityFromENS, IClaim, IClaimSource, IEnsClaim, intervalInMsMap } from "@gambitdao/gmx-middleware"
import * as wallet from "@gambitdao/wallet-link"
import { getAccountExplorerUrl, IWalletLink } from "@gambitdao/wallet-link"
import { $jazzicon } from "../common/$avatar"
import { $anchor } from "../elements/$common"
import { $ethScan, $twitter } from "../elements/$icons"
import { $Link } from "./$Link"
import { isAddress } from "@ethersproject/address"


export interface IAccountPreview {
  address: string
  labelSize?: string
  avatarSize?: string
  parentRoute?: Route
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

export const $AccountPhoto = (address: string, claim?: IClaim, size = '42px') => {
  const claimType = claim?.sourceType

  if (claimType) {
    const isTwitter = claimType === IClaimSource.TWITTER

    if (isTwitter) {
      return $photoContainer(
        style({ width: size, height: size, minWidth: size }),
        attr({ src: `https://unavatar.vercel.app/twitter/${claim.name}` })
      )()
    } else {
      const data: IEnsClaim = claim.data ? JSON.parse(claim.data) : {}
      const imageUrl = data.imageUrl

      return imageUrl
        ? $photoContainer(attr({ src: getGatewayUrl(imageUrl) }), style({ minWidth: size, height: size }))()
        : $jazzicon(address, size)
    }

  }

  return $jazzicon(address, size)
}

export const $AccountLabel = (address: string, claim?: IClaim, adressOp: Op<INode, INode> = O()) => {
  const isAddressValid = isAddress(address)

  if (!isAddressValid) {
    return $column(
      $text(style({ fontSize: '.75em' }))('0x----'),
      $text(adressOp, style({ fontSize: '1em' }))('----')
    )
  }

  if (claim) {
    return $text(style({ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }), adressOp)(claim.name)
  }

  return $column(
    $text(style({ fontSize: '.75em' }))(address.slice(0, 6)),
    $text(adressOp, style({ fontSize: '1em' }))(address.slice(address.length -4, address.length))
  )
}


export const $ProfileLinks = (address: string, claim?: IClaim) => {
  const $explorer = $anchor(attr({ href: getAccountExplorerUrl(wallet.CHAIN.ARBITRUM, address) }))(
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



export const $AccountPreview = ({
  address, labelSize = '16px', avatarSize = '38px',
  parentRoute, claim,
}: IAccountPreview) => component((
  [profileClick, profileClickTether]: Behavior<string, string>
) => {

  const $preview = $row(layoutSheet.row, layoutSheet.spacingSmall, style({ alignItems: 'center', pointerEvents: 'none', textDecoration: 'none' }))(
    $AccountPhoto(address, claim, avatarSize),
    $AccountLabel(address, claim, parentRoute ? style({ color: pallete.primary, fontSize: labelSize }) : style({ fontSize: labelSize }))
  )
  return [

    $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      parentRoute
        ? $Link({ route: parentRoute.create({ fragment: '2121212' }),
          $content: $preview,
          anchorOp: style({ minWidth: 0, overflow: 'hidden' }),
          url: `/p/account/${address}`,
        })({ click: profileClickTether() })
        : $preview,
      // parentRoute ? $ProfileLinks(address) : empty()
    ),

    { profileClick }
  ]
})





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



