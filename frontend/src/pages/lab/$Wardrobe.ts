import { Behavior, combineArray } from "@aelea/core"
import { $Branch, $Node, $text, component, INode, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { $anchor, $Link } from "@gambitdao/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { constant, empty, filter, map, merge, multicast, now, startWith, switchLatest } from "@most/core"
import { $berryTileId } from "../../components/$common"
import { $ButtonPrimary, $ButtonSecondary } from "../../components/form/$Button"
import { $defaultSelectContainer, $Dropdown } from "../../components/form/$Dropdown"
import { connect } from "../../logic/gbc"
import { IAttributeHat, IAttributeBackground, IAttributeFaceAccessory, ILabAttributeOptions, IAttributeClothes, IAttributeBody, IBerryDisplayTupleMap, getLabItemTupleIndex } from "@gambitdao/gbc-middleware"
import { $labItem, $labItemAlone } from "../../logic/common"
import { $Toggle } from "../../common/$ButtonToggle"
import { fadeIn } from "../../transitions/enter"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $displayBerry } from "../../components/$DisplayBerry"
import tokenIdAttributeTuple from "../../logic/mappings/tokenIdAttributeTuple"
import { $caretDown } from "../../elements/$icons"


interface IBerry {
  wallet: IWalletLink
  parentRoute: Route

  initialBerry?: number
}


export const $Wardrobe = ({ wallet, parentRoute, initialBerry, }: IBerry) => component((
  [changeRoute, changeRouteTether]: Behavior < string, string >,
  [changeBerry, changeBerryTether]: Behavior < number, number >,
  [selectedAttribute, selectedAttributeTether]: Behavior <ILabAttributeOptions, ILabAttributeOptions>,
  [changeLabItem, changeLabItemTether]: Behavior<INode, number>,
) => {

  const gbc = connect(wallet)
  const selectedBerry = multicast(merge(now(initialBerry), changeBerry))

  const selectedItem = startWith(null, filter(item => getLabItemTupleIndex(item) !== 0, changeLabItem))
  const selectedBackground = startWith(null, filter((item) => getLabItemTupleIndex(item) === 0, changeLabItem))

  
  const getLabel = (option: ILabAttributeOptions) => {
    return option === IAttributeBackground
      ? 'Background' : option === IAttributeClothes
        ? 'Clothes' : option === IAttributeHat
          ? 'Hat' : option === IAttributeFaceAccessory
            ? 'Accessory' : null
  }

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
              value: now(initialBerry || null),
              select: {
                $container: $defaultSelectContainer(style({ gap: 0, flexWrap: 'wrap', width: '300px', maxHeight: '400px', overflow: 'auto', flexDirection: 'row' })),
                $option: $row,
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
              return $row(style({ cursor: 'pointer', backgroundColor: colorAlpha(pallete.message, .95), borderRadius: '10%', overflow: 'hidden' }, ))(
                fadeIn(
                  changeLabItemTether(nodeEvent('click'), constant(id))(
                    $labItem(id, 118)
                  )
                )
              )
            })
          )
        }, gbc.ownedItemList, selectedAttribute)),

        $row(layoutSheet.spacing, style({ placeContent: 'space-between' }))(
          switchLatest(
            map(berry => $ButtonPrimary({
              $content: $text(`Apply Changes`)
            })({}), changeBerry)
          )

          
        )

      ),
      switchLatest(combineArray((id, item, bg) => {


        let $berry: $Node | null = null

        if (id) {
          const [background, clothes, body, expression, faceAccessory, hat] = tokenIdAttributeTuple[id - 1]

          const displaytuple: Partial<IBerryDisplayTupleMap> = [bg || background, clothes, IAttributeBody.BLUEBERRY, expression, faceAccessory, hat]

          if (item) {
            displaytuple.splice(getLabItemTupleIndex(item), 1, item)
          }

          $berry = $displayBerry(displaytuple, 585, true)
        }





        
        const $tradeBox = $row(style({
          width: '80px', height: '80px', borderRadius: '12px', boxShadow: '-1px 2px 7px 2px #0000002e',
          overflow: 'hidden', position: 'relative', marginLeft: '-50%', backgroundColor: pallete.middleground,
          // backgroundImage: 'linear-gradient(to top right, #fff0 calc(50% - 2px), black , #fff0 calc(50% + 2px))'
        }))

        return $row(
          style({ borderRadius: '30px', backgroundColor: pallete.horizon }, $berry ? $berry : $row(style({ width: '585px', height: '585px' }))()),
          $column(style({ position: 'absolute', top: '50%', marginTop: '-108px', gap: '16px' }))(
            $tradeBox(
              // clipPath: 'inset(0 0 0 50%)'
              bg ? style({ position: 'absolute', borderRadius: '12px' }, $labItemAlone(bg, 80)) : empty(),
              bg ? empty() : empty(),
            ),
            $tradeBox(
              item ? style({ position: 'absolute', borderRadius: '12px' }, $labItem(item, 80)) : empty()
            ),
          )
        )

      }, selectedBerry, selectedItem, selectedBackground)),
      
    ),

    { changeRoute }
  ]
})
