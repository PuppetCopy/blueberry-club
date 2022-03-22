import { Behavior, combineObject, O, replayLatest } from "@aelea/core"
import { $node, $text, attr, component, IBranch, nodeEvent, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { Route } from "@aelea/router"
import { $column, $icon, $Popover, $row, $seperator, $TextField, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { USE_CHAIN, GBC_ADDRESS, IAttributeBody } from "@gambitdao/gbc-middleware"
import { isAddress, timeSince } from "@gambitdao/gmx-middleware"
import { $anchor, $caretDblDown, $IntermediateTx } from "@gambitdao/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, empty, filter, fromPromise, map, merge, multicast, skipRepeats, snapshot, startWith, switchLatest } from "@most/core"
import { GBC__factory } from "contracts"
import { $Table2 } from "../common/$Table2"
import { $AccountPreview } from "../components/$AccountProfile"
import { $displayBerry } from "../components/$DisplayBerry"
import { $ButtonPrimary, $ButtonSecondary } from "../components/form/$Button"
import { $accountRef, $card, $responsiveFlex, $txHashRef, $txnIconLink } from "../elements/$common"
import { $tofunft } from "../elements/$icons"
import tokenIdAttributeTuple from "../logic/mappings/tokenIdAttributeTuple"
import { queryToken } from "../logic/query"
import { IAttributeMappings, IBerryDisplayTupleMap, IToken, ITransfer } from "@gambitdao/gbc-middleware"

export function bnToHex(n: bigint) {
  return '0x' + n.toString(16)
}


export function getMetadataLabels([bg, cloth, body, expr, faceAce, hat]: IBerryDisplayTupleMap) {

  return {
    background: {
      label: 'Background',
      value:  IAttributeMappings[bg]
    },
    clothes: {
      label: 'Clothes',
      value: IAttributeMappings[cloth],
    },
    body: {
      label: 'Body',
      value: IAttributeMappings[body],
    },
    expression: {
      label: 'Expression',
      value: IAttributeMappings[expr],
    },
    faceAccessory: {
      label: 'Face Accessory',
      value: IAttributeMappings[faceAce],
    },
    hat: {
      label: 'Hat',
      value: IAttributeMappings[hat],
    },
  }
}


interface IBerry {
  walletLink: IWalletLink
  parentRoute: Route
  // walletStore: cstate.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}

export const $Berry = ({ walletLink, parentRoute }: IBerry) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
) => {

  const berry = parentRoute.create({ fragment: /\d+/ })

  const urlFragments = document.location.pathname.split('/')
  const berryId = urlFragments[urlFragments.length - 1]
  
  const tokenId = bnToHex(BigInt(berryId))
  const token = fromPromise(queryToken(tokenId))
  
  const berryMetadata = tokenIdAttributeTuple[Number(tokenId) - 1]
  const [background, clothes, body, expression, faceAccessory, hat] = berryMetadata
  const metadata = getMetadataLabels(berryMetadata)

  return [
    router.match(berry)(
      $column(layoutSheet.spacingBig)(
        $responsiveFlex(layoutSheet.spacingBig)(
          $row(style({ minWidth: '400px', height: '400px', overflow: 'hidden', borderRadius: '30px' }))(
            $displayBerry([background, clothes, IAttributeBody.BLUEBERRY, expression, faceAccessory, hat], 400)
          ),
          $node(),
          switchLatest(map(token => {
            return $column(layoutSheet.spacingBig)(
              $text(style({ fontWeight: 800, fontSize: '2.25em' }))(`GBC #${berryId}`),
              $row(layoutSheet.spacingSmall)(
                $text(style({  }))(`Owned by `),
                $accountRef(token.owner.id),
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
              
              $row(layoutSheet.spacing, style({ flexWrap: 'wrap' }))(...Object.values(metadata).map(trait => $card(style({ padding: '16px', minWidth: '140px' }), layoutSheet.spacingSmall)(
                $text(style({ color: pallete.foreground, fontSize: '.75em' }))(trait.label),
                $text(trait.value),
              ))),
              
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
                    $txnIconLink(x.transactionHash),
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
      )
    )
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

    return (await contract.transferFrom(address, transferTo, token.id)).wait()
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
        switchLatest(map(ta => $AccountPreview({ address: ta })({}), transferTo))
      ),
      $IntermediateTx({
        query: transfer,
        $done: map(tx => $row(style({ color: pallete.positive }))($txHashRef(tx.transactionHash)))
      })({}),
    ),

    {  }
  ]
})