import { Behavior, combineArray, combineObject, O, Op, replayLatest } from "@aelea/core"
import { $node, $Node, $text, attr, attrBehavior, component, INode, nodeEvent, style, stylePseudo } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, combine, constant, empty, filter, map, merge, mergeArray, multicast, now, snapshot, startWith, switchLatest, tap } from "@most/core"
import { $berryTileId } from "../../components/$common"
import { $buttonAnchor, $ButtonPrimary, $ButtonSecondary } from "../../components/form/$Button"
import { $defaultSelectContainer, $Dropdown } from "../../components/form/$Dropdown"
import {
  IAttributeHat, IAttributeBackground, IAttributeFaceAccessory, ILabAttributeOptions, IAttributeClothes,
  IBerryDisplayTupleMap, getLabItemTupleIndex,
  saleDescriptionList, LabItemSaleDescription, IBerry, USE_CHAIN, IToken, SaleType
} from "@gambitdao/gbc-middleware"
import { $labItem } from "../../logic/common"
import { fadeIn } from "../../transitions/enter"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $loadBerry } from "../../components/$DisplayBerry"
import tokenIdAttributeTuple from "../../logic/mappings/tokenIdAttributeTuple"
import { $caretDown } from "../../elements/$icons"
import { $alert, $arrowsFlip, $IntermediateTx, $xCross } from "@gambitdao/ui-components"
import { ContractTransaction } from "@ethersproject/contracts"
import { Stream } from "@most/types"
import { $iconCircular, $responsiveFlex } from "../../elements/$common"
import { connectManager } from "../../logic/contract/manager"
import { connectLab } from "../../logic/contract/lab"
import { $seperator2 } from "../common"
import { unixTimestampNow } from "@gambitdao/gmx-middleware"
import { WALLET } from "../../logic/provider"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { queryOwnerV2 } from "../../logic/query"
import { Closet } from "@gambitdao/gbc-contracts"


interface IBerryComp {
  walletLink: IWalletLink
  parentRoute: Route
  walletStore: state.BrowserStore<WALLET, "walletStore">

  initialBerry?: IToken
}

type ItemSlotState = {
  id: number
  isRemove: boolean
}

interface ExchangeState {
  updateItemState: ItemSlotState | null
  updateBackgroundState: ItemSlotState | null
  contract: Closet
  selectedBerry: IBerry & { id: number } | null
}

const getLabel = (option: ILabAttributeOptions) => {
  return option === IAttributeBackground
    ? 'Background' : option === IAttributeClothes
      ? 'Clothes' : option === IAttributeHat
        ? 'Hat' : option === IAttributeFaceAccessory
          ? 'Accessory' : null
}

type Slot = 0 | 7 | null

export const $Wardrobe = ({ walletLink, initialBerry, walletStore }: IBerryComp) => component((
  [changeRoute, changeRouteTether]: Behavior<any, string>,
  [changeBerry, changeBerryTether]: Behavior<IToken, IToken>,
  // [selectedAttribute, selectedAttributeTether]: Behavior<ILabAttributeOptions, ILabAttributeOptions>,
  [selectedSlot, selectedSlotTether]: Behavior<Slot, Slot>,
  [clickSave, clickSaveTether]: Behavior<PointerEvent, PointerEvent>,

  [changeItemState, changeItemStateTether]: Behavior<any, ItemSlotState | null>,
  [changeBackgroundState, changeBackgroundStateTether]: Behavior<any, ItemSlotState | null>,
  [changeDecoState, changeDecoStateTether]: Behavior<any, ItemSlotState | null>,

  [hoverDownloadBtn, hoverDownloadBtnTether]: Behavior<INode, PointerEvent>,
  [setMainBerry, setMainBerryTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,

) => {

  const lab = connectLab(walletLink)
  // const gbc = connectGbc(walletLink)
  const manager = connectManager(walletLink)


  const owner = awaitPromises(map(async n => {
    if (n === null) {
      return null
    }
    return queryOwnerV2(n)
  }, walletLink.account))

  const tokenList = map(xz => xz ? xz.ownedTokens : [], owner)
  const itemList = map(xz => xz ? xz.ownedLabItems : [], owner)


  const changeBerryId = merge(now(initialBerry || null), changeBerry)

  const reEmitBerryAfterSave = snapshot((berry) => berry, changeBerryId, clickSave)

  const newLoca2l = merge(changeBerryId, reEmitBerryAfterSave)
  const selectedBerry = multicast(awaitPromises(combine(async (token, contract): Promise<ExchangeState['selectedBerry'] | null> => {
    if (token === null) {
      return null
    }

    const seedObj = {
      id: token.id,
      background: 0,
      special: 0,
      custom: 0,
    }
    const list = await contract.get(token.id, 0, 2)

    return list.reduce((seed, next) => {

      const ndx = getLabItemTupleIndex(next.toNumber())

      if (ndx === 0) {
        seed.background = ndx
      } else if (ndx === 7) {
        seed.special = ndx
      } else {
        seed.custom = ndx
      }

      return seed
    }, seedObj)

  }, newLoca2l, manager.contract)))




  const itemChangeState = startWith(null, changeItemState)
  const backgroundChangeState = startWith(null, changeBackgroundState)
  // const selectedTabState = startWith(IAttributeHat, selectedAttribute)

  const exchangeState: Stream<ExchangeState> = replayLatest(multicast(combineObject({
    updateItemState: itemChangeState,
    updateBackgroundState: backgroundChangeState,
    selectedBerry,
    contract: manager.contract
  })))

  const previewSize = screenUtils.isDesktopScreen ? 475 : 350

  const mustBerry = filter((b): b is NonNullable<ExchangeState['selectedBerry']> => b !== null, selectedBerry)

  const primaryActionLabel = combineArray((updateItemState, updateBackgroundState, berry) => {

    const swapItem = !updateItemState?.isRemove && berry.custom && updateItemState?.id
    const swapBg = !updateBackgroundState?.isRemove && berry.background && updateBackgroundState?.id

    const isRemoving = updateBackgroundState?.isRemove || updateItemState?.isRemove
    const isSwapping = swapBg || swapItem

    if (isSwapping && isRemoving) {
      return 'Swap & Remove'
    }

    const label = isSwapping
      ? 'Swap' : updateBackgroundState?.isRemove || updateItemState?.isRemove
        ? 'Remove' : 'Save'

    return label
  }, itemChangeState, backgroundChangeState, mustBerry)


  const itemSetTxn = multicast(snapshot(async ({ selectedBerry, updateBackgroundState, updateItemState, contract }) => {
    const changeList: number[] = []
    const removeList: boolean[] = []

    if (updateBackgroundState) {
      changeList.push(updateBackgroundState.id)
      removeList.push(updateBackgroundState.isRemove)
    }

    if (updateItemState) {
      changeList.push(updateItemState.id)
      removeList.push(updateItemState.isRemove)
    }

    if (!selectedBerry) {
      throw 'no berry selected'
    }

    const tx = (await contract.set(selectedBerry.id, changeList, []))

    return tx
  }, exchangeState, clickSave))


  const berrySel = map(b => b?.custom || null, selectedBerry)
  const berryBgSel = map(b => b?.background || null, selectedBerry)
  const selectedSlotState = startWith(null, selectedSlot)

  return [
    $responsiveFlex(style({ gap: screenUtils.isDesktopScreen ? '125px' : '75px', alignItems: 'stretch', placeContent: 'space-between' }))(

      $column(layoutSheet.spacingBig, style({ flex: 1, }))(

        switchLatest(combineArray((ownedItems, selected) => {
          const storeItemList: LabItemSaleDescription[] = selected === 0 || selected === 7
            ? saleDescriptionList.filter(item => getLabItemTupleIndex(item.id) === selected)
            : saleDescriptionList.filter(item => {
              const attrTupleId = getLabItemTupleIndex(item.id)
              return attrTupleId > 0 && attrTupleId < 7
            })

          return $row(layoutSheet.spacingBig, style({ flexWrap: 'wrap' }))(
            ...storeItemList.map(item => {
              const id = item.id

              const unixTime = unixTimestampNow()


              const isWhitelist = item.type === SaleType.whitelist
              const upcommingSaleDate = isWhitelist ? item.whitelistStartDate : item.publicStartDate
              const itemOwned = ownedItems.find(ownedItem => ownedItem.item.id === id)

              const isSaleUpcomming = upcommingSaleDate > unixTime



              const wearBehavior = getLabItemTupleIndex(id) === 0 ? changeBackgroundStateTether : changeItemStateTether
              const selectBehavior: Op<any, any> = wearBehavior(nodeEvent('click'), constant({ isRemove: false, id }))


              return $row(style({ position: 'relative' }))(
                $row(style({ cursor: 'pointer', overflow: 'hidden', borderRadius: '8px', backgroundColor: colorAlpha(pallete.message, .95) }))(
                  fadeIn(
                    style({ filter: itemOwned ? '' : 'grayscale(1)' }, selectBehavior($labItem(id, 100)))
                  )
                ),
                switchLatest(awaitPromises(combineArray(async (exchangeState, contract, account) => {
                  if (!account) {
                    throw new Error('No account connected')
                  }
                  const delta = exchangeState.updateBackgroundState?.id === id || exchangeState.updateItemState?.id === id ? -1 : 0


                  if (!itemOwned) {
                    return $ButtonSecondary({
                      buttonOp: style({
                        zoom: .6,
                        position: 'absolute',
                        top: '-15px',
                        width: '50px',
                        height: '50px',
                        right: '-15px',
                        padding: '4px'
                      }),
                      $content: $text(style({ padding: '4px 6px' }))('Buy'),
                    })({
                      click: changeRouteTether(
                        constant(`/p/item/${id}`),
                        tap(x => history.pushState(null, '', x)),
                      )
                    })
                  }

                  const count = ((await contract.balanceOf(account, id)).toNumber() + delta)


                  return $text(style({ position: 'absolute', top: '1px', right: '4px', fontSize: '.75em', fontWeight: 'bold', color: pallete.background }))(`${count < 0 ? 0 : count}x`)
                }, exchangeState, lab.contract, walletLink.account))),
              )
            })
          )
        }, itemList, selectedSlotState)),


        $row(style({ flex: 1, placeContent: 'center' }))(
          switchLatest(map(list => {
            return list.length === 0 ? style({ alignSelf: 'center' }, $alert($text(`Connected account does not own any GBC's`))) : empty()
          }, tokenList))
        ),

        $seperator2,

        $column(layoutSheet.spacing, style({ flexDirection: 'row-reverse', placeContent: screenUtils.isDesktopScreen ? 'flex-start' : 'center', flexWrap: 'wrap-reverse' }))(
          $IntermediateTx({
            chain: USE_CHAIN,
            query: mergeArray([itemSetTxn, setMainBerry])
          })({}),

          $row(layoutSheet.spacing, style({ flex: 1 }))(
            switchLatest(map(tokenList => {
              return $row(layoutSheet.spacing, style({ placeSelf: 'flex-start' }))(
                $Dropdown({
                  $selection: map(s => {
                    const $content = $row(style({ alignItems: 'center' }))(
                      style({}, s ? $text(`GBC #` + s.id) : $text('Choose Berry')),
                      $icon({ $content: $caretDown, width: '18px', svgOps: style({ marginTop: '3px', marginLeft: '6px' }), viewBox: '0 0 32 32' }),
                    )

                    return $ButtonSecondary({
                      disabled: now(tokenList.length === 0),
                      $content,
                    })({})
                  }),
                  $option: $row,
                  select: {
                    $container: $defaultSelectContainer(style({ gap: 0, padding: '15px', flexWrap: 'wrap', width: '300px', maxHeight: '400px', overflow: 'auto', flexDirection: 'row' })),
                    value: now(initialBerry || null),
                    $$option: map(token => {

                      if (!token) {
                        throw new Error(`No berry id:${token} exists`)
                      }

                      return style({ cursor: 'pointer' }, $berryTileId(token.id, token))
                    }),
                    list: tokenList
                  }
                })({
                  select: changeBerryTether()
                })
              )

            }, tokenList)),

            $node(style({ flex: 1 }))(),

            switchLatest(awaitPromises(combineArray(async (contract, account, berry) => {

              if (berry === null || account === null) {
                return empty()
              }

              try {
                const mainId = (await contract.getDataOf(account)).tokenId.toNumber()
                if (berry.id === mainId) {
                  return empty()
                }

              } catch (err) {
                console.error(err)
              }


              return $ButtonSecondary({ $content: $text(`Set PFP`) })({
                click: setMainBerryTether(map(async () => {
                  return (await contract.chooseMain(berry.id))
                }))
              })
            }, manager.profileContract, walletLink.account, selectedBerry))),

            $IntermediateConnectButton({
              $display: map(() => {
                return $ButtonPrimary({
                  $content: $text(startWith('Choose Berry', primaryActionLabel as Stream<string>)),
                  disabled: startWith(true, combineArray((updateItemState, updateBackgroundState, berry) => {
                    if (berry === null || updateItemState === null && updateBackgroundState === null) {
                      return true
                    }

                    if (!updateItemState?.isRemove && updateItemState?.id === berry.custom || !updateBackgroundState?.isRemove && updateBackgroundState?.id === berry.background) {
                      return true
                    }

                    return false
                  }, itemChangeState, backgroundChangeState, selectedBerry))
                })({
                  click: clickSaveTether()
                })
              }),
              walletLink,
              walletStore,
            })({})
          ),
        )

      ),


      $row(style({ alignItems: 'center', alignSelf: 'center', borderRadius: '30px', backgroundColor: pallete.middleground, position: 'relative', placeContent: 'center', width: previewSize + 'px', height: previewSize + 'px' }))(

        $node(style({ display: 'flex', left: 0, flexDirection: 'column', position: 'absolute', gap: '16px', alignItems: 'center', placeContent: 'center', ...screenUtils.isDesktopScreen ? { width: '0px', top: 0, bottom: 0 } : { height: 0, right: 0, top: 0, flexDirection: 'row' } }))(
          switchLatest(combineArray(((a, b, c) => $ItemSlot(null, c, a, b)({ remove: changeItemStateTether(), select: selectedSlotTether() })), itemChangeState, berrySel, selectedSlotState)),
          switchLatest(combineArray(((a, b, c) => $ItemSlot(0, c, a, b)({ remove: changeBackgroundStateTether(), select: selectedSlotTether() })), backgroundChangeState, berryBgSel, selectedSlotState)),
          // style({ opacity: '0.2', pointerEvents: 'none' }, switchLatest(combineArray(((a, b, c) => $ItemSlot(7, c, a, b)({ remove: changeDecoStateTether(), select: selectedSlotTether() })), backgroundChangeState, berryBgSel, selectedSlotState)),)
        ),

        switchLatest(map(({ selectedBerry, updateItemState, updateBackgroundState }) => {

          let $berry: $Node | null = null

          const labCustom = !updateItemState?.isRemove && (updateItemState?.id || selectedBerry?.custom)
          const labBackground = !updateBackgroundState?.isRemove && (updateBackgroundState?.id || selectedBerry?.background)

          if (selectedBerry) {
            const [background, clothes, body, expression, faceAccessory, hat] = tokenIdAttributeTuple[selectedBerry.id - 1]

            const displaytuple: Partial<IBerryDisplayTupleMap> = [labBackground || background, clothes, body, expression, faceAccessory, hat]

            if (labCustom) {
              displaytuple.splice(getLabItemTupleIndex(labCustom), 1, labCustom)
            }

            $berry = style({ borderRadius: '30px' }, $loadBerry(displaytuple, previewSize))
          }

          const hoverDownloadBehavior = hoverDownloadBtnTether(
            nodeEvent('pointerenter')
          )

          return $berry ? $row(
            $buttonAnchor(
              hoverDownloadBehavior,
              style({ position: 'absolute', bottom: '-20px', right: '50%', transform: 'translateX(50%)' }),
              attr({ target: '_blank', download: `GBC-${selectedBerry?.id}.png` }),
              attrBehavior(awaitPromises(map(async x => {
                const svg = document.querySelector('#BERRY')! as SVGElement
                const href = await getGbcDownloadableUrl(svg)

                return { href }
              }, hoverDownloadBtn)))
            )($text('Download')),

            attr({ id: 'BERRY' }, style({ cursor: 'pointer' }, $berry))
          ) : $row(style({}))()

        }, exchangeState)),
      ),

    ),

    { changeRoute }
  ]
})


const $ItemSlot = (id: Slot, activeSlot: Slot, change: ItemSlotState | null, gbcItemId: number | null) => component((
  [remove, removeTether]: Behavior<INode, ItemSlotState | null>,
  [select, selectTether]: Behavior<any, any>
) => {

  const isGbcItemRemove = change?.isRemove === true
  const changeItemId = change?.id

  const isSwap = gbcItemId && changeItemId
  const item = !change?.isRemove && (changeItemId || gbcItemId)

  const state = change === null && gbcItemId
    ? { isRemove: true, id: gbcItemId }
    : null


  const itemSize = 80
  const itemSizePx = itemSize + 'px'

  const $itemWrapper = $row(style({ overflow: 'hidden', placeContent: 'center', width: '65px' }))
  const $tradeBox = $row(
    style({
      height: itemSizePx, minWidth: itemSizePx, borderRadius: '12.75px', gap: '1px', overflow: 'hidden', boxShadow: '-1px 2px 7px 2px #0000002e',
      position: 'relative', backgroundColor: pallete.background, border: `2px solid`, cursor: 'pointer'
    }),
    stylePseudo(':hover', { borderColor: pallete.primary }),
    style(activeSlot === id ? { borderColor: pallete.primary, cursor: 'default' } : { borderColor: pallete.message })
  )


  return [
    $column(style({ position: 'relative' }))(
      item
        ? removeTether(nodeEvent('click'), constant(state))(
          style({ right: '-5px', boxShadow: '1px 1px 6px #00000063', padding: '4px', top: '-5px', })($iconCircular($xCross))
        )
        : empty(),
      $tradeBox(selectTether(nodeEvent('click'), constant(id)))(
        gbcItemId && isSwap && !isGbcItemRemove ? $itemWrapper($labItem(gbcItemId, itemSize)) : empty(),
        gbcItemId && isSwap && !isGbcItemRemove ? style({ left: '50%', top: '50%', marginLeft: '-12px', marginTop: '-12px' })($iconCircular($arrowsFlip)) : empty(),
        $itemWrapper(style({ width: isSwap ? '65px' : itemSizePx }))(
          item ? style({ borderRadius: 0 }, $labItem(item, itemSize)) : empty()
        )
      )
    ),

    { remove, select }
  ]
})

function getGbcDownloadableUrl(svg: SVGElement): Promise<string> {
  const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  const image = new Image()

  image.src = url
  image.crossOrigin = 'anonymous'

  image.width = 1500
  image.height = 1500

  // image.style.display = 'none'

  // svg.append(image)

  return new Promise(resolve => {
    image.onload = () => {
      image.onload = null

      image.remove()

      const canvas = document.createElement('canvas')

      canvas.width = 1500
      canvas.height = 1500

      const context = canvas.getContext('2d')
      context?.drawImage(image, 0, 0, 1500, 1500)

      canvas.toBlob(blob => {
        if (!blob) throw new Error('Unable to create an image')

        const downloadableLink = URL.createObjectURL(blob)
        resolve(downloadableLink)
      })
    }
  })
}
