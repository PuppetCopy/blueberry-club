import { Behavior, combineArray } from "@aelea/core"
import { $Node, $node, $text, component, INode, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { $anchor, $Link } from "@gambitdao/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { constant, filter, map, merge, multicast, now, startWith, switchLatest } from "@most/core"
import { $berryTileId } from "../../components/$common"
import { $ButtonPrimary, $ButtonSecondary } from "../../components/form/$Button"
import { $defaultSelectContainer, $Dropdown } from "../../components/form/$Dropdown"
import { connect } from "../../logic/gbc"
import { IAttributeLabHat, IAttributeLabBackground, IAttributeLabFaceAccessory, ILabAttributeOptions, IAttributeLabClothes, IAttributeBody, IBerryDisplayTupleMap } from "@gambitdao/gbc-middleware"
import { $labItem, getLabItemTupleIndex } from "../../logic/common"
import { $Toggle } from "../../common/$ButtonToggle"
import { fadeIn } from "../../transitions/enter"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $DisplayBerry } from "../../components/$DisplayBerry"
import tokenIdAttributeTuple from "../../logic/mappings/tokenIdAttributeTuple"


interface IBerry {
  wallet: IWalletLink
  parentRoute: Route

  initialBerry?: number
}


interface IBerryLab {

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
    return option === IAttributeLabBackground
      ? 'Background' : option === IAttributeLabClothes
        ? 'Clothes' : option === IAttributeLabHat
          ? 'Hat' : option === IAttributeLabFaceAccessory
            ? 'Accessory' : null
  }

  return [
    $row(layoutSheet.spacingBig, style({ placeContent:'space-between' }))(
      
      $column(layoutSheet.spacingBig, style({  }))(
        $column(style({ fontSize: screenUtils.isMobileScreen ? '2.1em' : '3.1em' }))(
          $node(
            $text(style({}))(`Bluberry `),
            $text(style({ fontWeight: 'bold' }))(map(String, selectedBerry)),
          ),
        ),

        $row(layoutSheet.spacing)(
          $Toggle({
            $container: $row(style({  })),
            options: [
              IAttributeLabBackground,
              IAttributeLabClothes,
              IAttributeLabHat,
              IAttributeLabFaceAccessory,
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
                      
              return $text(selectedBehavior, style({ width: '120px', cursor: 'pointer', borderBottom: `1px solid ${pallete.middleground}`, textAlign: 'center', padding: '12px 0', fontSize: '13px' }))(label)
            }),
            selected: now(IAttributeLabHat)
          })({ select: selectedAttributeTether() }),
        ),

        switchLatest(combineArray((items, selected) => {
          const ownedItemList: number[] = items.filter(id => id in selected)

          if (ownedItemList.length === 0) {
            return $text(`No ${getLabel(selected)} owned`)
          }

          return $row(
            ...ownedItemList.map(id => {
              return $row(style({ cursor: 'pointer', backgroundColor: colorAlpha(pallete.message, .95), borderRadius: '10%', overflow: 'hidden' }, ))(
                fadeIn(
                  changeLabItemTether(nodeEvent('click'), constant(id))(
                    $labItem(id)
                  )
                )
              )
            })
          )
        }, gbc.ownedItemList, selectedAttribute)),

        $row(layoutSheet.spacingBig, style({ placeContent: 'space-between' }))(
          $Link({
            $content: $anchor(
              $ButtonPrimary({
                $content: $text('Save')
              })({}),
            ),
            url: '/p/wardrobe', route: parentRoute
          })({
            click: changeRouteTether()
          }),

          switchLatest(map(tokenList => {
            const options = tokenList

            return $Dropdown({
              $selection: map(s => {
                const $content = s ? $text(String(s)) : $text('Select Berry')

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

                  return $berryTileId(token)
                }),
                options
              }
            })({
              select: changeBerryTether()
            })
          }, gbc.tokenList)),
        )

      ),
      switchLatest(combineArray((id, item, bg) => {
        if (!id) {
          return $text('none')
        }

        const metaTuple = tokenIdAttributeTuple[id - 1]

        if (!metaTuple) {
          throw new Error('Could not find berry #' + id)
        }

        const [background, clothes, body, expression, faceAccessory, hat] = metaTuple

        const displaytuple = [bg || background, clothes, IAttributeBody.BLUEBERRY, expression, faceAccessory, hat] as IBerryDisplayTupleMap

        if (item) {
          displaytuple.splice(getLabItemTupleIndex(item), 1, item)
        }
        
        return $DisplayBerry(displaytuple, "650px")({})

      }, selectedBerry, selectedItem, selectedBackground)),
      
    ),

    { changeRoute }
  ]
})
