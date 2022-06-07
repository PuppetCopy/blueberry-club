import { Behavior, combineObject, O, replayLatest } from "@aelea/core"
import { $node, $text, attr, component, IBranch, nodeEvent, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $Popover, $row, $seperator, $TextField, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { USE_CHAIN, GBC_ADDRESS, IAttributeBody, IAttributeMappings } from "@gambitdao/gbc-middleware"
import { GBC__factory } from "@gambitdao/gbc-contracts"
import { isAddress, shortenAddress, timeSince } from "@gambitdao/gmx-middleware"
import { $anchor, $Link, $caretDblDown, $IntermediateTx } from "@gambitdao/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, empty, filter, fromPromise, map, merge, multicast, skipRepeats, snapshot, startWith, switchLatest } from "@most/core"
import { $Table2 } from "../common/$Table2"
import { $accountPreview } from "../components/$AccountProfile"
import { $loadBerry } from "../components/$DisplayBerry"
import { $ButtonPrimary, $ButtonSecondary } from "../components/form/$Button"
import { $accountRef, $card, $responsiveFlex, $txnIconLink } from "../elements/$common"
import { $tofunft } from "../elements/$icons"
import tokenIdAttributeTuple from "../logic/mappings/tokenIdAttributeTuple"
import { queryToken, queryTokenv2 } from "../logic/query"
import { IToken, ITransfer } from "@gambitdao/gbc-middleware"
import { attributeIndexToLabel } from "../logic/mappings/label"

export function bnToHex(n: bigint) {
  return '0x' + n.toString(16)
}




interface IBerry {
  walletLink: IWalletLink
  parentRoute: Route
  // walletStore: cstate.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}

export const $BerryPage = ({ walletLink, parentRoute }: IBerry) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {


  const urlFragments = document.location.pathname.split('/')
  const berryId = urlFragments[urlFragments.length - 1]

  const tokenId = bnToHex(BigInt(berryId))
  const token = fromPromise(queryTokenv2(tokenId))

  const berryMetadata = tokenIdAttributeTuple[Number(tokenId) - 1]
  const [background, clothes, body, expression, faceAccessory, hat] = berryMetadata

  return [
    $column(layoutSheet.spacingBig)(
      $responsiveFlex(layoutSheet.spacingBig)(
        $row(style({ minWidth: '400px', height: '400px', overflow: 'hidden', borderRadius: '30px' }))(
          $loadBerry([background, clothes, IAttributeBody.BLUEBERRY, expression, faceAccessory, hat], 400)
        ),
        $node(),
        switchLatest(map(token => {
          return $column(layoutSheet.spacingBig)(
            $text(style({ fontWeight: 800, fontSize: '2.25em' }))(`GBC #${berryId}`),
            $row(layoutSheet.spacingSmall)(
              $text(style({ color: pallete.foreground }))(`Owned by `),
              $Link({
                route: parentRoute.create({ fragment: 'df2f23f' }),
                $content: $accountPreview({ address: token.owner.id, avatarSize: 40, labelSize: '1em' }),
                url: `/p/profile/${token.owner.id}`,
              })({ click: changeRouteTether() }),
            ),

            $row(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
              switchLatest(map(account => {
                const isOwner = account && account.toLowerCase() === token.owner.id.toLowerCase()

                if (!isOwner) {
                  return empty()
                }

                return $row(
                  $Popover({
                    $$popContent: map(() => {
                      return $TrasnferOwnership(account, token, walletLink)({
                        // transfer: trasnferOwnershipTether()
                      })
                    }, trasnferPopup),
                  })(
                    $row(
                      $ButtonSecondary({
                        $content: $text('Transfer Ownership')
                      })({
                        click: trasnferPopupTether()
                      })
                    )
                  )({})
                )
              }, walletLink.account)),

              $row(layoutSheet.spacingSmall)(
                $icon({
                  $content: $tofunft,
                  viewBox: '0 0 32 32'
                }),
                $anchor(attr({ href: `https://tofunft.com/nft/arbi/0x17f4BAa9D35Ee54fFbCb2608e20786473c7aa49f/${berryId}` }))(
                  $text('Trade')
                ),
              ),
            ),

            $row(layoutSheet.spacing, style({ flexWrap: 'wrap' }))(
              ...berryMetadata.map((val, idx) => {

                return $card(style({ padding: '16px', minWidth: '140px' }), layoutSheet.spacingSmall)(
                  $text(style({ color: pallete.foreground, fontSize: '.75em' }))(attributeIndexToLabel[idx]),
                  $text(IAttributeMappings[val]),
                )
              })
            ),

          )
        }, token)),
      ),

      $column(layoutSheet.spacing)(
        $text(style({ fontSize: '1.5em' }))('Transaction History'),
        $seperator,
        $Table2<ITransfer>({
          dataSource: map(md => {
            return md.transfers
          }, token),
          cellOp: style({ alignItems: 'center' }),
          columns: [
            {
              $head: $text('From'),
              $body: map(x => $accountRef(x.from.id))
            },
            {
              $head: $text('To'),
              $body: map(x => $accountRef(x.to.id))
            },
            {
              $head: $text('Txn'),
              $body: map(x => {
                const time = Number(BigInt(x.timestamp))
                const dateStr = new Date(Math.floor(time * 1000)).toLocaleDateString()

                const timeAgo = timeSince(time)

                return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                  $txnIconLink(x.transaction.id),
                  $column(
                    $text(style({ fontSize: '.75em' }))(`${timeAgo}`),
                    $text(`${dateStr}`),
                  ),
                )
              })
            },
          ]
        })({})
      )
    ),

    {
      changeRoute
    }
  ]
})


const $TrasnferOwnership = (address: string, token: IToken, walletLink: IWalletLink) => component((
  [submit, submitTether]: Behavior<any, any>,
  [clipboardInput, clipboardInputTether]: Behavior<IBranch, string>,
  [inputValueChange, inputValueChangeTether]: Behavior<string, string>,
) => {

  const contract = replayLatest(multicast(skipRepeats(awaitPromises(map(async w3p => {
    if (w3p === null || w3p?.network?.chainId !== USE_CHAIN) {
      return null
    }

    const contract = GBC__factory.connect(GBC_ADDRESS.GBC, w3p.getSigner())

    if (await contract.deployed()) {
      return contract
    }

    return null
  }, walletLink.provider)))))

  const value = startWith('', clipboardInput)
  const transferTo = merge(value, inputValueChange)

  const transfer = snapshot(async ({ contract, transferTo }, submit) => {
    if (contract === null) {
      throw new Error('no contract ')
    }

    const owner = (await contract.ownerOf(token.id)).toLowerCase()

    if (owner !== token.owner.id) {
      throw new Error(`Connected account does not own this token`)
    }

    return (await contract.transferFrom(address, transferTo, token.id))
  }, combineObject({ contract, transferTo }), submit)

  return [
    $column(layoutSheet.spacingBig)(
      $TextField({
        value,
        containerOp: style({ flexDirection: 'column' }),
        label: 'Address',
        hint: 'Copying an address will automatically fill this field',
        inputOp: O(
          clipboardInputTether(
            nodeEvent('focus'),
            map(async focusEvent => navigator.clipboard.readText().catch(() => '')),
            awaitPromises,
            filter(clipBoard => isAddress(clipBoard)),
          ),
          attr({ placeholder: 'Paste Address' }),
          style({ textAlign: 'center', minWidth: '250px' })
        ),
      })({
        change: inputValueChangeTether()
      }),

      $row(layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center' }))(

        $ButtonPrimary({
          $content: $text('Send To')
        })({
          click: submitTether()
        }),
        $icon({
          $content: $caretDblDown,
          width: '13px',
          svgOps: style({ transform: 'rotate(-90deg)' }),
          fill: pallete.foreground,
          viewBox: '0 0 32 32'
        }),
        switchLatest(map(ta => $accountPreview({ address: ta }), transferTo))
      ),
      $IntermediateTx({
        chain: USE_CHAIN,
        query: transfer,
      })({}),
    ),

    {}
  ]
})