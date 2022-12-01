import { Behavior } from "@aelea/core"
import { $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { $anchor, $IntermediatePromise, $Link } from "@gambitdao/ui-components"

import { IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { $berry } from "../../components/$DisplayBerry"
import { $buttonAnchor, $ButtonPrimary, $ButtonSecondary } from "../../components/form/$Button"
import { $responsiveFlex } from "../../elements/$common"
import { IAttributeHat, IAttributeFaceAccessory, IAttributeClothes, IAttributeExpression, IProfile } from "@gambitdao/gbc-middleware"
import { $seperator2 } from "../common"
import { map, mergeArray, now } from "@most/core"
import { ContractTransaction } from "@ethersproject/contracts"
import { queryProfileList } from "../../logic/query"
import { $berryByToken } from "../../logic/common"
import { $profilePreview } from "../../components/$AccountProfile"
import { BrowserStore } from "../../logic/store"



const styleEl = document.createElement('style')

const spinnerId = (Math.random() + 1).toString(36).substring(7)

const keyFrames = `
@keyframes anim${spinnerId} {
  10% {
    background-color: rgb(173 173 173);
  }
  20% {
    background-color: #EE883D;
  }
  30% {
    background-color: #FF4747;
  }
  40% {
    background-color: #964CF2;
  }
  60% {
    background-color: #F94CEC;
  }
  70% {
    background-color: #6A8494;
  }
  85% {
    background-color: #FFD130;
  }
  100% {
    background-color: #4E41EE;
  }
}
`
styleEl.innerHTML = keyFrames.replace(/A_DYNAMIC_VALUE/g, "180deg")
document.getElementsByTagName('head')[0].appendChild(styleEl)

export const $bgAnimation = style({
  backgroundColor: 'white',
  backgroundImage: `linear-gradient(125deg, rgb(255 255 255 / 75%), rgba(0, 0, 0, 0))`,
  animation: `anim${spinnerId} 30s infinite alternate`,
})


interface IBerry {
  walletLink: IWalletLink
  parentRoute: Route
}

export const $LabHome = ({ walletLink, parentRoute }: IBerry) => component((
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [mintTestGbc, mintTestGbcTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,
) => {


  return [
    mergeArray([
      $responsiveFlex(style({ gap: '75px', justifyContent: 'space-between', alignItems: 'center' }))(
        $column(layoutSheet.spacingBig, style({ maxWidth: '570px' }))(
          $column(style({ fontSize: '3.2em' }))(
            $node(
              $text(style({}))(`Blueberry `),
              $text(style({ fontWeight: 'bold' }))(`Lab`),
            ),
          ),

          $text(style({ lineHeight: '1.5em' }))(`The Blueberry Lab is a tool that allows GBC owners to customize their Berries with new attributes which must be owned on-chain. Stay tuned for upcoming item releases on the Blueberry Lab Store or on our Twitter.`),

          $seperator2,

          $row(layoutSheet.spacingBig)(
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
            $Link({
              $content: $anchor(
                $ButtonPrimary({
                  $content: $text('View Store')
                })({}),
              ),
              url: '/p/lab-store', route: parentRoute
            })({
              click: changeRouteTether()
            }),
          ),


        ),
        $bgAnimation(
          style(
            screenUtils.isDesktopScreen ? { maxWidth: '80vw', placeSelf: 'center', overflow: 'hidden', minWidth: '460px', borderRadius: '30px' } : { alignSelf: 'center', borderRadius: '30px' },
            $berry([
              undefined, IAttributeClothes.AVALANCHE_HOODIE, undefined, IAttributeExpression.DEAD, IAttributeFaceAccessory.BEARD_WHITE, IAttributeHat.CHRISTMAS_HAT
            ], screenUtils.isDesktopScreen ? 460 : 300)
          )
        ),
      ),

      $column(layoutSheet.spacingBig)(
        $text(style({ fontWeight: 'bold', textAlign: 'center', fontSize: '2.5em' }))(`Latest Lab PFP's`),
        $text(style({ textAlign: 'center' }))(`Latest Identities that were picked by GBC Owners`),
        $node(),
        $row(
          $IntermediatePromise({
            query: now(queryProfileList({ pageSize: screenUtils.isDesktopScreen ? 12 : 8 })),
            $$done: map(berryWallList => {

              if (berryWallList.length === 0) {
                return $text('No Identiees have been chosen yet. help us get this section filled using the Wardrobe or Profile section')
              }

              return $node(style({ display: 'flex', flexWrap: 'wrap', width: '100%', placeContent: 'space-evenly', gap: screenUtils.isDesktopScreen ? '20px 3px' : `15px` }))(
                ...berryWallList.reverse().map(profile => {
                  return $Link({
                    route: parentRoute.create({ fragment: 'df2f23f' }),
                    $content: $profilePreview({ profile, avatarSize: 80, labelSize: '1em' }),
                    anchorOp: style({ minWidth: '15.6%', overflow: 'hidden' }),
                    url: `/p/profile/${profile.id}`,
                  })({ click: changeRouteTether() })
                })
              )
            })
          })({}),
        ),
      ),


      // $column(layoutSheet.spacingBig)(

      //   $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
      //     $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Blueberry Lab Store'),
      //     $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '678px' }))('You will find here the different items available to customize your GBC'),
      //   ),

      //   $column(layoutSheet.spacingBig, style({ justifyContent: 'space-between' }))(
      //     $text(style({ fontWeight: 'bold', fontSize: '1.8em' }))('Items'),
      //     $row(screenUtils.isDesktopScreen ? style({ gap: '50px', placeContent: 'center', flexWrap: 'wrap' }) : O(layoutSheet.spacingBig, style({ overflow: 'hidden', placeContent: 'space-evenly', flexWrap: 'wrap' })))(
      //       ...saleDescriptionList.map(item =>
      //         $StoreItemPreview(item, parentRoute, changeRouteTether)
      //       )
      //     ),
      //   ),

      //   $node(),
      // ),

      $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
        $text(style({ fontWeight: 'bold', fontSize: screenUtils.isDesktopScreen ? '2.5em' : '1.45em', textAlign: 'center' }))('Want to get featured?'),
        $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '678px' }))('Are you an artist, a project or an influencer? It is possible to collaborate with us to create items that fit your art or your brand in the Blueberry Lab'),


        $buttonAnchor(style({ alignSelf: 'center' }), attr({ href: 'https://discord.com/invite/7ZMmeU3z9j', target: '_blank' }))($text('Contact us on Discord'))
      ),
    ].reverse()),

    { changeRoute, walletChange }
  ]
})

const $mosaicProfile = (profile: IProfile, size: number) => {
  const token = profile.token!

  return $anchor(style({ position: 'relative' }), attr({ href: '/p/berry/' + token.id }))(
    style({ borderRadius: '10px' }, $berryByToken(token, size)),
    $text(style({ textAlign: 'left', padding: screenUtils.isDesktopScreen ? '8px 0 0 8px' : '5px 0 0 5px', color: '#fff', textShadow: '#0000005e 0px 0px 5px', fontSize: screenUtils.isDesktopScreen ? '.6em' : '.6em', position: 'absolute', fontWeight: 'bold' }))(
      String(Number(token.id))
    )
  )
}

