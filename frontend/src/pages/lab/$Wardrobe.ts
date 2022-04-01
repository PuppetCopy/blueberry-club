import { Behavior, combineArray, combineObject, O, replayLatest, Tether } from "@aelea/core"
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
import { $alert, $arrowsFlip, $IntermediateTx, $path, $xCross } from "@gambitdao/ui-components"
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


export const $Wardrobe = ({ wallet, parentRoute, initialBerry, }: IBerry) => component((
  [changeRoute, changeRouteTether]: Behavior < string, string >,
  [changeBerry, changeBerryTether]: Behavior < number, number >,
  [selectedAttribute, selectedAttributeTether]: Behavior <ILabAttributeOptions, ILabAttributeOptions>,
  [clickSave, clickSaveTether]: Behavior<PointerEvent, Promise<ContractReceipt>>,

  [changeItemState, changeItemStateTether]: Behavior<any, ItemSlotState | null>,
  [changeBackgroundState, changeBackgroundStateTether]: Behavior<any, ItemSlotState | null>,

  [clickBerry, clickBerryTether]: Behavior<INode, PointerEvent>,
  [setMainBerry, setMainBerryTether]: Behavior<PointerEvent, Promise<ContractReceipt>>,
  
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
    updateItemState: startWith(null, changeItemState),
    updateBackgroundState: startWith(null, changeBackgroundState),
    selectedBerry,
    contract: manager.contract
  })))

  const previewSize = screenUtils.isDesktopScreen ? 475 : 350

  const itemChangeState = startWith(null, changeItemState)
  const backgroundChangeState = startWith(null, changeBackgroundState)



  return [
    $responsiveFlex(style({ gap: screenUtils.isDesktopScreen ? '150px' : '75px', alignItems: 'stretch', placeContent:'space-between' }))(
      
      $column(layoutSheet.spacingBig, style({ flex: 1, }))(
        switchLatest(map(tokenList => {
          return $row(layoutSheet.spacing)(
            $Dropdown({
              $selection: map(s => {
                const $content = $row(style({ alignItems: 'center' }))(
                  style({ fontSize: screenUtils.isMobileScreen ? '1em' : '1.2em' }, s ? $text(`GBC #` + s) : $text('Choose Berry')),
                  $icon({ $content: $caretDown, width: '18px', svgOps: style({ marginTop: '3px', marginLeft: '6px' }), viewBox: '0 0 32 32' }),
                )

                return $ButtonSecondary({
                  disabled: now(tokenList.length === 0),
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
                options: tokenList
              }
            })({
              select: changeBerryTether()
            }),
            tokenList.length === 0 ? $alert($text(`Connected account does not own any GBC's`)) : empty()
          )

        }, gbc.tokenList)),
        
      

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
              const selectBehavior = getLabItemTupleIndex(id) === 0 ? changeBackgroundStateTether : changeItemStateTether

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

        $column(layoutSheet.spacing)(
          $row(layoutSheet.spacing, style({ placeContent: screenUtils.isDesktopScreen ? 'flex-end' : 'center' }))(

            switchLatest(map(berry => {
              if (berry === null) {
                return empty()
              }
            
              return $ButtonSecondary({ $content: $text(`Set #${berry.id} as Profile`), })({
                click: setMainBerryTether(snapshot(async contract => {
                  return (await contract.chooseMain(berry.id)).wait()
                }, manager.profileContract))
              })

            }, selectedBerry)),

            $ButtonPrimary({
              $content: $text(`Apply Changes`),
              disabled: map(b => b === null, selectedBerry)
            })({
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
          ),

          $IntermediateTx({
            query: merge(clickSave, setMainBerry),
            $done: map(tx => $text('done'))
          })({})
        )

      ),


      $row(style({ alignItems: 'center', alignSelf: 'center', borderRadius: '30px', backgroundColor: pallete.middleground, position: 'relative', placeContent: 'center', width: previewSize + 'px', height: previewSize + 'px' }))(

        $node(style({ display: 'flex', left: 0, flexDirection: 'column', position: 'absolute', gap: '16px', alignItems: 'center', placeContent: 'center', ...screenUtils.isDesktopScreen ? { width: '0px', top: 0, bottom: 0 } : { height: 0, right: 0, top: 0, flexDirection: 'row' } }))(
          switchLatest(combineArray(itemChangeFn(changeItemStateTether), itemChangeState, map(b => b?.custom || null, selectedBerry))),
          switchLatest(combineArray(itemChangeFn(changeBackgroundStateTether), backgroundChangeState, map(b => b?.background || null, selectedBerry))),
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


          const clickBerryBehavior = clickBerryTether(
            nodeEvent('click')
          )


          return $row(
            switchLatest(awaitPromises(map(async url => {
              const svg = document.querySelector('#BERRY')! as SVGElement
              const href = await getGbcDownloadableUrl(svg)

              return fadeIn($buttonAnchor(style({ position: 'absolute', bottom: '30px', right: '30px' }), attr({ download: `GBC-${selectedBerry?.id}.webp`, href }))($text('Download')))
            }, clickBerry))),

            $berry ? clickBerryBehavior(attr({ id: 'BERRY' }, style({ cursor: 'pointer' }, $berry))) : $row(style({  }))(),
          )

        }, exchangeState)),
      ),
      
    ),

    { changeRoute }
  ]
})


function itemChangeFn(changeItemStateTether: Tether<INode, ItemSlotState | null>) {
  return (change: ItemSlotState | null, gbcItemId: number | null) => {
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
    const $tradeBox = $row(style({
      height: itemSizePx, minWidth: itemSizePx, borderRadius: '8px', gap: '1px', overflow: 'hidden', boxShadow: '-1px 2px 7px 2px #0000002e',
      position: 'relative', backgroundColor: '#D1D1D1', border: `1px solid #D1D1D1`
    }))
    const circleButtonStyle = style({
      backgroundColor: pallete.middleground, position: 'absolute', zIndex: 10, borderRadius: '50%', cursor: 'pointer',
      height: '22px', width: '22px', fontSize: '11px', textAlign: 'center', lineHeight: '15px', fontWeight: 'bold', color: pallete.message,
    })

    const $exchangeIcon = $icon({
      $content: $arrowsFlip,
      svgOps: O(circleButtonStyle, style({ left: '50%', top: '50%', marginLeft: '-12px', marginTop: '-12px' })),
      width: '18px', viewBox: '0 0 32 32'
    })

    
    return $column(style({ position: 'relative' }))(
      item
        ? changeItemStateTether(nodeEvent('click'), constant(state))(
          $icon({
            $content: $xCross,
            svgOps: O(circleButtonStyle, style({ right: '-5px', padding: '4px', top: '-5px', })),
            width: '18px', viewBox: '0 0 32 32'
          })
        )
        : empty(),
      $tradeBox(
        gbcItemId && isSwap && !isGbcItemRemove ? $itemWrapper($labItem(gbcItemId, itemSize)) : empty(),
        gbcItemId && isSwap && !isGbcItemRemove ? $exchangeIcon  : empty(),
        $itemWrapper(style({ width: isSwap ? '65px' : itemSizePx }))(
          item ? $labItem(item, itemSize) : empty()
        )
      )
    )
  }
}

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