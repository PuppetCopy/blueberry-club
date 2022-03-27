import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { $Node, $text, component, INode, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, combine, constant, empty, filter, map, merge, multicast, now, snapshot, startWith, switchLatest, tap } from "@most/core"
import { $berryTileId } from "../../components/$common"
import { $ButtonPrimary, $ButtonSecondary } from "../../components/form/$Button"
import { $defaultSelectContainer, $Dropdown } from "../../components/form/$Dropdown"
import { connectGbc, connectLab, connectManager } from "../../logic/gbc"
import { IAttributeHat, IAttributeBackground, IAttributeFaceAccessory, ILabAttributeOptions, IAttributeClothes, IAttributeBody, IBerryDisplayTupleMap, getLabItemTupleIndex } from "@gambitdao/gbc-middleware"
import { $labItem, $labItemAlone } from "../../logic/common"
import { $Toggle } from "../../common/$ButtonToggle"
import { fadeIn } from "../../transitions/enter"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $displayBerry } from "../../components/$DisplayBerry"
import tokenIdAttributeTuple from "../../logic/mappings/tokenIdAttributeTuple"
import { $caretDown } from "../../elements/$icons"
import { $IntermediateTx } from "@gambitdao/ui-components"
import { ContractReceipt } from "@ethersproject/contracts"
import { Stream } from "@most/types"
import { Manager } from "contracts"


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

const labItemBackground = style({ backgroundColor: colorAlpha(pallete.message, .95), overflow: 'hidden' })
const $itemWrapper = $row(style({ overflow: 'hidden', placeContent: 'center' }))

export const $Wardrobe = ({ wallet, parentRoute, initialBerry, }: IBerry) => component((
  [changeRoute, changeRouteTether]: Behavior < string, string >,
  [changeBerry, changeBerryTether]: Behavior < number, number >,
  [selectedAttribute, selectedAttributeTether]: Behavior <ILabAttributeOptions, ILabAttributeOptions>,
  [clickSave, clickSaveTether]: Behavior<PointerEvent, Promise<ContractReceipt>>,

  [updateItemState, updateItemStateTether]: Behavior<any, ItemSlotState | null>,
  [updateBackgroundState, updateBackgroundStateTether]: Behavior<any, ItemSlotState | null>,
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

  const exchangeState: Stream<ExchangeState> = tap(x => {
    // console.log(x)
  }, replayLatest(multicast(combineObject({
    updateItemState: startWith(null, updateItemState),
    updateBackgroundState: startWith(null, updateBackgroundState),
    selectedBerry,
    contract: manager.contract
  }))))

  return [
    $row(layoutSheet.spacingBig, style({ placeContent:'space-between' }))(
      
      $column(layoutSheet.spacingBig, style({ maxWidth: '480px', flex: 1, }))(
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

              return $row(style({ cursor: 'pointer', borderRadius: '10%' }), labItemBackground)(
                fadeIn(
                  selectBehavior(nodeEvent('click'), constant({ isRemove: false, id }))(
                    $labItem(id, 118)
                  )
                )
              )
            })
          )
        }, lab.itemList, selectedAttribute)),

        $row(layoutSheet.spacing, style({ placeContent: 'space-between' }))(
          $ButtonPrimary({
            $content: $text(`Apply Changes`)
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

          $IntermediateTx({
            query: clickSave,
            $done: map(tx => $text('done'))
          })({})
        )

      ),
      switchLatest(map(({ selectedBerry, updateItemState, updateBackgroundState }) => {


        let $berry: $Node | null = null

        const labCustom = !updateItemState?.isRemove && (updateItemState?.id || selectedBerry?.custom)
        const labBackground = updateBackgroundState?.id || selectedBerry?.background


        if (selectedBerry) {
          const [background, clothes, body, expression, faceAccessory, hat] = tokenIdAttributeTuple[selectedBerry.id - 1]

          const displaytuple: Partial<IBerryDisplayTupleMap> = [labBackground || background, clothes, body, expression, faceAccessory, hat]

          if (labCustom) {
            displaytuple.splice(getLabItemTupleIndex(labCustom), 1, labCustom)
          }

          $berry = $displayBerry(displaytuple, 585, true)
        }

        const labItemStyle = O(labItemBackground, style({ flex: 1 }))

        
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

        return $row(style({ alignItems: 'center', }))(
          style({ borderRadius: '30px', backgroundColor: pallete.middleground }, $berry ? $berry : $row(style({ width: '585px', height: '585px' }))()),
          $column(style({ position: 'absolute', gap: '16px', alignItems: 'center', width: '0px', placeContent: 'center' }))(

            $column(style({ position: 'relative' }))(
              labCustom && !updateItemState?.isRemove
                ? updateItemStateTether(nodeEvent('click'), constant(isItemSwap ? null : isItemSwap ? { isRemove: false, id: updateItemState.id } : { isRemove: true, id: selectedBerry?.custom }))($removeButton)
                : empty(),
              $tradeBox(
                isItemSwap && !isGbcItemRemove ? $itemWrapper(labItemStyle, style({ width: '65px' }))($labItem(selectedBerry.custom)) : empty(),
                $itemWrapper(style({ width: isItemSwap ? '65px' : '80px' }))(
                  labCustom ? labItemStyle($labItem(labCustom)): empty()
                )
              )
            ),


            $column(style({ position: 'relative' }))(
              labBackground && !updateBackgroundState?.isRemove
                ? updateItemStateTether(nodeEvent('click'), constant(isBackgroundSwap ? null : isBackgroundSwap ? { isRemove: false, id: updateBackgroundState.id } : { isRemove: true, id: selectedBerry?.background }))($removeButton)
                : empty(),
              $tradeBox(
                isBackgroundSwap && !isGbcBackgroundRemove ? $itemWrapper(labItemStyle, style({ width: '65px' }))($labItem(selectedBerry.background)) : empty(),
                $itemWrapper(style({ width: isItemSwap ? '65px' : '80px' }))(
                  labBackground ? labItemStyle($labItem(labBackground)): empty()
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
