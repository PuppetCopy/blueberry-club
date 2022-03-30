import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { $node, $Node, $text, attr, component, INode, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, combine, constant, empty, map, merge, multicast, now, snapshot, startWith, switchLatest } from "@most/core"
import { $berryTileId } from "../../components/$common"
import { $buttonAnchor, $ButtonPrimary, $ButtonSecondary } from "../../components/form/$Button"
import { $defaultSelectContainer, $Dropdown } from "../../components/form/$Dropdown"
import { IAttributeHat, IAttributeBackground, IAttributeFaceAccessory, ILabAttributeOptions, IAttributeClothes, IBerryDisplayTupleMap, getLabItemTupleIndex } from "@gambitdao/gbc-middleware"
import { $labItem } from "../../logic/common"
import { $Toggle } from "../../common/$ButtonToggle"
import { fadeIn } from "../../transitions/enter"
import { pallete } from "@aelea/ui-components-theme"
import { $loadBerry } from "../../components/$DisplayBerry"
import tokenIdAttributeTuple from "../../logic/mappings/tokenIdAttributeTuple"
import { $caretDown } from "../../elements/$icons"
import { $IntermediateTx } from "@gambitdao/ui-components"
import { ContractReceipt } from "@ethersproject/contracts"
import { Stream } from "@most/types"
import { Manager } from "contracts"
import { $responsiveFlex } from "../../elements/$common"
import { connectManager } from "../../logic/contract/manager"
import { connectGbc } from "../../logic/contract/gbc"
import { connectLab } from "../../logic/contract/lab"
import { $seperator2 } from "../common"


interface IBerry {
  wallet: IWalletLink
  parentRoute: Route

  initialBerry?: number
}

type ItemSlotState = {
  id: number
  isRemove: boolean
}

interface ExchangeState {
  updateItemState: ItemSlotState | null
  updateBackgroundState: ItemSlotState | null
  contract: Manager
  selectedBerry: SelectedBerry | null
}

type SelectedBerry = {
  id: number;
  background: number;
  special: number;
  custom: number;
}

const $itemWrapper = $row(style({ overflow: 'hidden', placeContent: 'center' }))

export const $Wardrobe = ({ wallet, parentRoute, initialBerry, }: IBerry) => component((
  [changeRoute, changeRouteTether]: Behavior < string, string >,
  [changeBerry, changeBerryTether]: Behavior < number, number >,
  [selectedAttribute, selectedAttributeTether]: Behavior <ILabAttributeOptions, ILabAttributeOptions>,
  [clickSave, clickSaveTether]: Behavior<PointerEvent, Promise<ContractReceipt>>,

  [updateItemState, updateItemStateTether]: Behavior<any, ItemSlotState | null>,
  [updateBackgroundState, updateBackgroundStateTether]: Behavior<any, ItemSlotState | null>,

  [clickBerry, clickBerryTether]: Behavior<INode, PointerEvent>,

  
) => {

  const lab = connectLab(wallet)
  const gbc = connectGbc(wallet)
  const manager = connectManager(wallet)


  const changeBerryId = merge(now(initialBerry || null), changeBerry)
  
  const selectedBerry = multicast(awaitPromises(combine(async (id, contract): Promise<SelectedBerry | null> => {
    if (id === null) {
      return null
    }

    const obj = await contract.itemsOf(id)

    return {
      id,
      background: obj.background.toNumber(),
      special: obj.special.toNumber(),
      custom: obj.custom.toNumber(),
    }
  }, changeBerryId, manager.contract)))

    
  const getLabel = (option: ILabAttributeOptions) => {
    return option === IAttributeBackground
      ? 'Background' : option === IAttributeClothes
        ? 'Clothes' : option === IAttributeHat
          ? 'Hat' : option === IAttributeFaceAccessory
            ? 'Accessory' : null
  }

  const exchangeState: Stream<ExchangeState> = replayLatest(multicast(combineObject({
    updateItemState: startWith(null, updateItemState),
    updateBackgroundState: startWith(null, updateBackgroundState),
    selectedBerry,
    contract: manager.contract
  })))

  return [
    $responsiveFlex(style({ gap: screenUtils.isDesktopScreen ? '150px' : '75px', alignItems: 'stretch', placeContent:'space-between' }))(
      
      $column(layoutSheet.spacingBig, style({ flex: 1, }))(
        $row(
          switchLatest(map(tokenList => {
            const options = tokenList

            return $Dropdown({
              $selection: map(s => {
                const $content = $row(style({ alignItems: 'center' }))(
                  style({ fontSize: screenUtils.isMobileScreen ? '1em' : '1.2em' }, s ? $text(`GBC #` + s) : $text('Select Berry')),
                  $icon({ $content: $caretDown, width: '18px', svgOps: style({ marginTop: '3px', marginLeft: '6px' }), viewBox: '0 0 32 32' }),
                )

                return $ButtonSecondary({
                  $content,
                })({})
              }),
              $option: $row,
              select: {
                $container: $defaultSelectContainer(style({ gap: 0, flexWrap: 'wrap', width: '300px', maxHeight: '400px', overflow: 'auto', flexDirection: 'row' })),
                value: now(initialBerry || null),
                optionOp: map(token => {

                  if (!token) {
                    throw new Error(`No berry id:${token} exists`)
                  }

                  return style({ cursor: 'pointer' }, $berryTileId(token))
                }),
                options
              }
            })({
              select: changeBerryTether()
            })
          }, gbc.tokenList)),
        ),

        $Toggle({
          $container: $row(style({ })),
          options: [
            IAttributeBackground,
            IAttributeClothes,
            IAttributeHat,
            IAttributeFaceAccessory,
          ],
          $option: map(option => {
            const label = getLabel(option)
            if (label === null) {
              throw new Error('Invalid Option')
            }

            const selectedBehavior = styleBehavior(
              map(selectedOpt =>
                selectedOpt === option
                  ? { borderColor: pallete.message, cursor: 'default' }
                  : { color: pallete.foreground }
              , selectedAttribute)
            )
                      
            return $text(selectedBehavior, style({ flex: 1, width: '120px', cursor: 'pointer', borderBottom: `1px solid ${pallete.middleground}`, textAlign: 'center', padding: '12px 0', fontSize: '13px' }))(label)
          }),
          selected: now(IAttributeHat)
        })({ select: selectedAttributeTether() }),

        switchLatest(combineArray((items, selected) => {
          const ownedItemList: number[] = items.filter(id => id in selected)

          if (ownedItemList.length === 0) {
            return $text(`No ${getLabel(selected)} owned`)
          }

          return $row(layoutSheet.spacingBig, style({ flexWrap: 'wrap' }))(
            ...ownedItemList.map(id => {
              const selectBehavior = getLabItemTupleIndex(id) === 0 ? updateBackgroundStateTether : updateItemStateTether

              return $row(style({ cursor: 'pointer' }))(
                fadeIn(
                  selectBehavior(nodeEvent('click'), constant({ isRemove: false, id }))(
                    $labItem(id, 118)
                  )
                )
              )
            })
          )
        }, lab.itemList, selectedAttribute)),

        $node(style({ flex: 1 }))(),

        $seperator2,

        $row(layoutSheet.spacing, style({ placeContent: 'flex-end' }))(

          switchLatest(map(berry => {
            if (berry === null) {
              return empty()
            }
            
            return $ButtonSecondary({ $content: $text(`Set #${berry.id} as Main`), })({})
          }, selectedBerry)),

          $ButtonPrimary({ $content: $text(`Apply Changes`) })({
            click: clickSaveTether(
              snapshot(async ({ selectedBerry, updateBackgroundState, updateItemState, contract }) => {

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
                
                const tx = (await contract.set(selectedBerry.id, changeList, removeList)).wait()

                return tx
              },  exchangeState)
            )
          }),

          $IntermediateTx({
            query: clickSave,
            $done: map(tx => $text('done'))
          })({})
        ),

      ),

      switchLatest(map(({ selectedBerry, updateItemState, updateBackgroundState }) => {

        let $berry: $Node | null = null

        const labCustom = !updateItemState?.isRemove && (updateItemState?.id || selectedBerry?.custom)
        const labBackground = !updateBackgroundState?.isRemove && (updateBackgroundState?.id || selectedBerry?.background)


        const previewSize = screenUtils.isDesktopScreen ? 475 : 350

        if (selectedBerry) {
          const [background, clothes, body, expression, faceAccessory, hat] = tokenIdAttributeTuple[selectedBerry.id - 1]

          const displaytuple: Partial<IBerryDisplayTupleMap> = [labBackground || background, clothes, body, expression, faceAccessory, hat]

          if (labCustom) {
            displaytuple.splice(getLabItemTupleIndex(labCustom), 1, labCustom)
          }

          $berry = $loadBerry(displaytuple, previewSize)
        }


        
        const $tradeBox = $row(style({
          height: '80px', minWidth: '80px', borderRadius: '8px', gap: '2px', overflow: 'hidden', boxShadow: '-1px 2px 7px 2px #0000002e',
          position: 'relative', backgroundColor: pallete.message,
          // border: `1px solid ${pallete.middleground}`
          // backgroundImage: 'linear-gradient(to top right, #fff0 calc(50% - 2px), black , #fff0 calc(50% + 2px))'
        }))


        const $removeButton = $text(style({
          backgroundColor: pallete.horizon, position: 'absolute', right: '-5px', top: '-5px', zIndex: 10, borderRadius: '50%', cursor: 'pointer',
          width: '15px', fontSize: '11px', textAlign: 'center', lineHeight: '15px', fontWeight: 'bold', height: '15px', color: pallete.message
        }))('X')



        const isGbcItemRemove = updateItemState?.isRemove === true
        const isItemSwap = selectedBerry?.custom && updateItemState?.id

        const isGbcBackgroundRemove = updateBackgroundState?.isRemove === true
        const isBackgroundSwap = selectedBerry?.background && updateBackgroundState?.id

        const clickBerryBehavior = clickBerryTether(
          nodeEvent('click')
        )


        return $row(style({ alignItems: 'center', position: 'relative', placeContent: 'center' }))(

          switchLatest(awaitPromises(map(async url => {
            const svg = document.querySelector('#BERRY')! as SVGElement
            const href = await getGbcDownloadableUrl(svg)

            return fadeIn($buttonAnchor(style({ position: 'absolute', bottom: '30px', right: '30px' }), attr({ download: `GBC-${selectedBerry?.id}.webp`, href }))($text('Download')))
          }, clickBerry))),

          style({ borderRadius: '30px', backgroundColor: pallete.middleground }, $berry ? clickBerryBehavior(attr({ id: 'BERRY' }, style({ cursor: 'pointer' }, $berry))) : $row(style({ width: previewSize + 'px', height: previewSize + 'px' }))()),
          $node(style({ display: 'flex', left: 0, flexDirection: 'column', position: 'absolute', gap: '16px', alignItems: 'center', placeContent: 'center', ...screenUtils.isDesktopScreen ? { width: '0px', top: 0, bottom: 0 } : { height: 0, right: 0, top: 0, flexDirection: 'row' } }))(

            $column(style({ position: 'relative' }))(
              labCustom && !updateItemState?.isRemove
                ? updateItemStateTether(nodeEvent('click'), constant(isItemSwap ? null : isItemSwap ? { isRemove: false, id: updateItemState.id } : { isRemove: true, id: selectedBerry?.custom }))($removeButton)
                : empty(),
              $tradeBox(
                isItemSwap && !isGbcItemRemove ? $itemWrapper(style({ width: '65px' }))($labItem(selectedBerry.custom)) : empty(),
                $itemWrapper(style({ width: isItemSwap ? '65px' : '80px' }))(
                  labCustom ? $labItem(labCustom): empty()
                )
              )
            ),

            $column(style({ position: 'relative' }))(
              labBackground && !updateBackgroundState?.isRemove
                ? updateBackgroundStateTether(nodeEvent('click'), constant(isBackgroundSwap ? null : isBackgroundSwap ? { isRemove: false, id: updateBackgroundState.id } : { isRemove: true, id: selectedBerry?.background }))($removeButton)
                : empty(),
              $tradeBox(
                isBackgroundSwap && !isGbcBackgroundRemove ? $itemWrapper(style({ width: '65px' }))($labItem(selectedBerry.background)) : empty(),
                $itemWrapper(style({ width: isBackgroundSwap ? '65px' : '80px' }))(
                  labBackground ? $labItem(labBackground): empty()
                )
              )
            ),

          )
        )

      }, exchangeState)),
      
    ),

    { changeRoute }
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
        
        resolve(URL.createObjectURL(blob))
        
      }, 'image/webp', 1)
    }
  })
}