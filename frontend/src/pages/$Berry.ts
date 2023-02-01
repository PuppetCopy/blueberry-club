import { Behavior, combineObject, O, replayLatest } from "@aelea/core"
import { $node, $text, attr, component, IBranch, nodeEvent, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $Popover, $row, $seperator, $TextField, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { LAB_CHAIN, GBC_ADDRESS, IAttributeMappings, attributeIndexToLabel, tokenIdAttributeTuple, blueberrySubgraph } from "@gambitdao/gbc-middleware"
import { GBC__factory } from "@gambitdao/gbc-contracts"
import { isAddress, readableDate, timeSince } from "@gambitdao/gmx-middleware"
import { $anchor, $Link, $caretDblDown, $IntermediateTx } from "@gambitdao/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, empty, filter, map, merge, multicast, now, skipRepeats, snapshot, startWith, switchLatest } from "@most/core"
import { $discoverIdentityDisplay } from "../components/$AccountProfile"
import { $ButtonPrimary, $ButtonSecondary } from "../components/form/$Button"
import { $accountRef, $card, $responsiveFlex, $txnIconLink } from "../elements/$common"
import { $opensea } from "../elements/$icons"
import { IToken } from "@gambitdao/gbc-middleware"
import { $berryByToken } from "../logic/common"
import { $CardTable } from "../components/$common"
import { IProfileActiveTab } from "./$Profile"




interface IBerry {
  walletLink: IWalletLink
  parentRoute: Route
}

export const $BerryPage = ({ walletLink, parentRoute }: IBerry) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {


  const urlFragments = document.location.pathname.split('/')
  const berryId = urlFragments[urlFragments.length - 1]

  const token = awaitPromises(blueberrySubgraph.token(now({ id: berryId })))

  const berryMetadata = tokenIdAttributeTuple[Number(berryId) - 1]
  const [background, clothes, body, expression, faceAccessory, hat] = berryMetadata

  const newLocal = map(md => {
    return md.transfers
  }, token)
  return [
    $column(layoutSheet.spacingBig)(
      $responsiveFlex(layoutSheet.spacingBig)(
        $row(style({ minWidth: '400px', height: '400px', overflow: 'hidden', borderRadius: '30px' }))(
          switchLatest(map(t => $berryByToken(t), token))
        ),
        $node(),
        switchLatest(map(token => {
          return $column(layoutSheet.spacingBig)(
            $text(style({ fontWeight: 800, fontSize: '2.25em' }))(`GBC #${berryId}`),
            $row(layoutSheet.spacingSmall)(
              $text(style({ color: pallete.foreground }))(`Owned by `),
              $Link({
                route: parentRoute.create({ fragment: 'df2f23f' }),
                $content: $discoverIdentityDisplay({ address: token.owner.id, labelSize: '1em' }),
                url: `/p/profile/${token.owner.id}/${IProfileActiveTab.BERRIES.toLowerCase()}`,
              })({ click: changeRouteTether() }),
            ),

            $row(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
              switchLatest(map(w3p => {

                if (w3p === null || token.owner.id.toLowerCase() !== w3p.address.toLowerCase()) {
                  return empty()
                }


                return $row(
                  $Popover({
                    $$popContent: map(() => {
                      return $TrasnferOwnership(w3p.address, token, walletLink)({
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
              }, walletLink.wallet)),

              $row(layoutSheet.spacingSmall)(
                $icon({
                  $content: $opensea,
                  viewBox: '0 0 32 32'
                }),
                $anchor(attr({ href: `https://opensea.io/assets/arbitrum/0x17f4baa9d35ee54ffbcb2608e20786473c7aa49f/${berryId}` }))(
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
        $CardTable({
          dataSource: newLocal,
          // cellOp: style({ alignItems: 'center' }),
          columns: [
            {
              $head: $text('From'),
              $$body: map(x => $accountRef(x.from.id))
            },
            {
              $head: $text('To'),
              $$body: map(x => $accountRef(x.to.id))
            },
            {
              $head: $text('Txn'),
              $$body: map(x => {
                const time = Number(BigInt(x.timestamp))
                const dateStr = readableDate(time)
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
    if (w3p === null || w3p.chain !== LAB_CHAIN) {
      return null
    }

    const contract = GBC__factory.connect(GBC_ADDRESS.GBC, w3p.provider.getSigner())

    if (await contract.deployed()) {
      return contract
    }

    return null
  }, walletLink.wallet)))))

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
        switchLatest(map(ta => $discoverIdentityDisplay({ address: ta }), transferTo))
      ),
      $IntermediateTx({
        chain: LAB_CHAIN,
        query: transfer,
      })({}),
    ),

    {}
  ]
})