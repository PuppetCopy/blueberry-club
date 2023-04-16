import { Behavior, combineObject, O } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, $TextField, layoutSheet } from "@aelea/ui-components"

import { IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { awaitPromises, empty, map, mergeArray, now, switchLatest, zip } from "@most/core"
import { blueberrySubgraph, IAccountStakingStore, LAB_CHAIN, saleDescriptionList } from "@gambitdao/gbc-middleware"
import { $ButtonPrimary, $ButtonSecondary, $defaultButtonSecondary } from "../components/form/$Button"
import { $labItem } from "../logic/common"
import { BrowserStore } from "../logic/store"
import { filterNull, IRequestAccountApi, IRequestAccountTradeListApi, IResponsePageApi, IStake, ITradeOpen, ITradeSettled, readableDate, switchMap, timeSince, unixTimestampNow } from "@gambitdao/gmx-middleware"
import { IProfileActiveTab } from "./$Profile"
import { Stream } from "@most/types"
import { $Link, $anchor, $IntermediateTx, $ButtonToggle, $defaulButtonToggleContainer, $infoTooltipLabel, $IntermediatePromise, $openPositionPnlBreakdown, $PnlValue, $riskLiquidator, $sizeDisplay, $TradePnl } from "@gambitdao/ui-components"
import { $labLogo } from "../common/$icons"
import { pallete } from "@aelea/ui-components-theme"
import { $Popover } from "../components/$Popover"
import { $discoverIdentityDisplay } from "../components/$AccountProfile"
import { connectLab } from "../logic/contract/gbc"
import { $berryTileId, $CardTable } from "../components/$common"
import { fadeIn } from "../transitions/enter"
import { $Index } from "./competition/$Leaderboard"
import * as router from '@aelea/router'
import { connectTradeReader } from "../logic/contract/trade"
import { $responsiveFlex } from "../elements/$common"
import { $defaultBerry } from "../components/$DisplayBerry"
import { CHAIN } from "@gambitdao/const"
import { ContractTransactionResponse } from "ethers"


export interface IAccount {
  walletLink: IWalletLink
  parentRoute: Route
  chainList: CHAIN[]
  accountStakingStore: BrowserStore<"ROOT.v1.treasuryStore", IAccountStakingStore>
  accountTradeList: Stream<Promise<IResponsePageApi<ITradeSettled>>>
  accountOpenTradeList: Stream<Promise<ITradeOpen[]>>
  stake: Stream<IStake[]>
}

export const $ProfileConnected = (config: IAccount) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [changeNetwork, changeNetworkTether]: Behavior<CHAIN, CHAIN>,
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,
  [requestStake, requestStakeTether]: Behavior<IRequestAccountApi, IRequestAccountApi>,
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<number, IRequestAccountTradeListApi>,
  // [requestAccountOpenTradeList, requestAccountOpenTradeListTether]: Behavior<IRequestAccountApi, IRequestAccountApi>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IProfileActiveTab, IProfileActiveTab>,

  [clickSetIdentityPopover, clickSetIdentityPopoverTether]: Behavior<any, any>,
  [setMainBerry, setMainBerryTether]: Behavior<PointerEvent, Promise<ContractTransactionResponse>>,

) => {

  const $title = $text(style({ fontWeight: 'bold', fontSize: '1.55em' }))
  const tradeReader = connectTradeReader(config.walletLink.provider)
  const lab = connectLab(config.walletLink.provider)

  const requestAccountOpenTradeList: Stream<IRequestAccountTradeListApi> = filterNull(map(w3p => {
    if (w3p === null) {
      return null
    }

    return {
      account: w3p.address,
      chain: w3p.chain,
    }
  }, config.walletLink.wallet))

  return [
    $responsiveFlex(
      layoutSheet.spacingBig,
      // style({ maxWidth: '560px', width: '100%', margin: '0 auto', })
    )(
      $column(layoutSheet.spacing, style({ flex: 1 }))(
        switchMap(w3p => {

          if (w3p === null) {
            return empty()
          }

          return $Popover({
            $target: $row(layoutSheet.spacing, style({ flex: 1, alignItems: 'center', placeContent: 'center', zIndex: 1 }))(
              $discoverIdentityDisplay({
                address: w3p.address,
                $container: $defaultBerry(style({ minWidth: '125px' })),
                labelSize: '1.5em'
              }),
              // $column(layoutSheet.spacing)(
              //   $ButtonSecondary({
              //     $container: $defaultMiniButtonSecondary,
              //     $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
              //       $icon({ $content: $labLogo, width: '16px', fill: pallete.middleground, viewBox: '0 0 32 32' }),
              //       $text('ID'),
              //       $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px' }), viewBox: '0 0 32 32' }),
              //     )
              //   })({
              //     click: clickSetIdentityPopoverTether()
              //   })
              // ),

            ),
            $popContent: map(() => {
              const connect = connectLab(config.walletLink.provider)


              return $column(layoutSheet.spacingSmall, style({ width: '300px' }))(
                $text('Changing a profile name instead of displaying the wallet address'),
                $TextField({
                  label: 'Name',
                  // labelStyle: { flex: 1 },
                  value: now('ff'),
                  inputOp: style({ maxWidth: '100px' }),
                  hint: '"@" prefix will be linked to Twitter',
                  validation: map(n => {
                    const val = Number(n)
                    const valid = val >= 0
                    if (!valid) {
                      return 'Invalid Basis point'
                    }

                    if (val > 5) {
                      return 'Slippage should be less than 5%'
                    }

                    return null
                  }),
                })({
                  // change: changeSlippageTether()
                }),

                $ButtonPrimary({
                  $content: $text('Save'),

                })({}),

                // switchLatest(awaitPromises(combineArray(async (contract, berry) => {
                //   const mainId = account ? (await contract.getDataOf(account).catch(() => null))?.tokenId.toNumber() : null
                //   const disabled = now(berry === null || berry?.id === w3p.address)

                //   return $ButtonSecondary({ $content: $text(`Set PFP`), disabled })({
                //     click: setMainBerryTether(map(async () => {
                //       return (await contract.chooseMain(berry!.id))
                //     }))
                //   })
                // }, connect.profile.contract, selectedBerry))),

                $IntermediateTx({
                  chain: LAB_CHAIN,
                  query: setMainBerry
                })({}),
              )
            }, clickSetIdentityPopover)
          })({})

          // return $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
          //   $discoverIdentityDisplay({
          //     address: w3p.address,
          //     avatarSize: 160,
          //     labelSize: '1.5em'
          //   }),
          //   $ButtonSecondary({
          //     $container: $defaultMiniButtonSecondary,
          //     $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
          //       $icon({ $content: $labLogo, width: '16px', fill: pallete.middleground, viewBox: '0 0 32 32' }),
          //       $text('Change'),
          //       // $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px' }), viewBox: '0 0 32 32' }),
          //     )
          //   })({
          //     click: clickSetIdentityPopoverTether()
          //   })
          // )
        }, config.walletLink.wallet),

        $column(layoutSheet.spacing, style({ alignItems: 'center' }))(
          $Link({
            $content: $anchor(
              $ButtonSecondary({
                $container: $defaultButtonSecondary,
                $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
                  $icon({ $content: $labLogo, width: '16px', fill: pallete.middleground, viewBox: '0 0 32 32' }),
                  $text('Wardrobe')
                )
              })({}),
            ),
            url: '/p/wardrobe', route: config.parentRoute
          })({
            click: changeRouteTether()
          })
        ),
      ),

      $node(),

      $column(layoutSheet.spacingBig, style({ flex: 2 }))(
        $ButtonToggle({
          $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
          selected: mergeArray([selectProfileMode, now(location.pathname.split('/').slice(-1)[0] === IProfileActiveTab.BERRIES.toLowerCase() ? IProfileActiveTab.BERRIES : IProfileActiveTab.TRADING)]),
          options: [
            IProfileActiveTab.BERRIES,
            IProfileActiveTab.TRADING,
            // IProfileActiveTab.IDENTITY,
            // IProfileActiveTab.LAB,
          ],
          $$option: map(option => {
            return $text(option)
          })
        })({ select: selectProfileModeTether() }),


        router.match(config.parentRoute.create({ fragment: IProfileActiveTab.BERRIES.toLowerCase() }))(
          fadeIn(

            $responsiveFlex(layoutSheet.spacingBig)(



              $IntermediatePromise({
                query: blueberrySubgraph.owner(combineObject({ id: map(w3p => w3p?.address, config.walletLink.wallet) })),
                $$done: map(owner => {
                  if (owner === null) {
                    return null
                  }


                  const ownedItems = lab.accountListBalance(owner.id, saleDescriptionList.map(x => x.id))

                  return $column(layoutSheet.spacingBig)(

                    $title(`GBC's`),
                    $row(layoutSheet.spacingSmall, style({ flexWrap: 'wrap', placeContent: 'center' }))(...owner.ownedTokens.map(token => {
                      return $berryTileId(token)
                    })),



                    $row(
                      $title('Lab Items'),

                      // switchLatest(map(items => {
                      //   return $Popover({
                      //     $$popContent: map(_ => $TransferItems(items.filter(x => x.amount > 0))({}), clickTransferItems),

                      //   })(
                      //     $ButtonSecondary({ $content: $text('Transfer') })({
                      //       click: clickTransferItemsTether()
                      //     })
                      //   )({})
                      // }, ownedItems))

                    ),


                    switchLatest(map(items => {
                      return $row(layoutSheet.spacingSmall, style({ flexWrap: 'wrap', placeContent: 'center' }))(
                        ...items.filter(item => item.amount > 0).map(item => {
                          return $row(style({ position: 'relative' }))(
                            $text(style({ position: 'absolute', top: '1px', right: '4px', fontSize: '.75em', fontWeight: 'bold', color: pallete.background }))(
                              item.amount + 'x'
                            ),
                            $labItem({ id: item.id })
                          )
                        })
                      )
                    }, ownedItems))

                  )
                })
              })({})

            )

          )
        ),

        router.match(config.parentRoute.create({ fragment: IProfileActiveTab.TRADING.toLowerCase() }))(
          fadeIn(
            $column(layoutSheet.spacingBig, style({ flex: 1 }))(
              $title('Open Positions'),
              $CardTable({
                dataSource: awaitPromises(config.accountOpenTradeList),
                columns: [
                  {
                    $head: $text('Time'),
                    columnOp: O(style({ maxWidth: '60px' })),

                    $$body: map((req) => {
                      const isKeeperReq = 'ctx' in req

                      const timestamp = isKeeperReq ? unixTimestampNow() : req.timestamp

                      return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
                        $text(timeSince(timestamp) + ' ago'),
                        $text(readableDate(timestamp)),
                      )
                    })
                  },
                  {
                    $head: $text('Entry'),
                    columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
                    $$body: map((pos) => {
                      return $Index(pos)
                    })
                  },
                  {
                    $head: $column(style({ textAlign: 'right' }))(
                      $text(style({ fontSize: '.75em' }))('Collateral'),
                      $text('Size'),
                    ),
                    columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
                    $$body: map(pos => {
                      const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))

                      return $riskLiquidator(pos, positionMarkPrice)
                    })
                  },
                  {
                    $head: $text('PnL'),
                    columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
                    $$body: map((pos) => {
                      const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
                      const cumulativeFee = tradeReader.getTokenCumulativeFunding(now(pos.collateralToken))

                      return $infoTooltipLabel(
                        $openPositionPnlBreakdown(pos, cumulativeFee, positionMarkPrice),
                        $TradePnl(pos, cumulativeFee, positionMarkPrice)
                      )
                    })
                  },
                ],
              })({}),

              $title('Settled Positions'),
              $CardTable({
                dataSource: awaitPromises(config.accountTradeList),
                columns: [
                  {
                    $head: $text('Time'),
                    columnOp: O(style({ maxWidth: '60px' })),

                    $$body: map((req) => {
                      const isKeeperReq = 'ctx' in req

                      const timestamp = isKeeperReq ? unixTimestampNow() : req.settledTimestamp

                      return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
                        $text(timeSince(timestamp) + ' ago'),
                        $text(readableDate(timestamp)),
                      )
                    })
                  },
                  {
                    $head: $text('Entry'),
                    columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
                    $$body: map((pos) => {
                      return $Index(pos)
                    })
                  },
                  {
                    $head: $column(style({ textAlign: 'right' }))(
                      $text(style({ fontSize: '.75em' }))('Collateral'),
                      $text('Size'),
                    ),
                    columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
                    $$body: map(pos => {
                      return $sizeDisplay(pos)
                    })
                  },
                  {
                    $head: $text('PnL'),
                    columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
                    $$body: map((pos) => {
                      return $PnlValue(pos.realisedPnl - pos.fee)
                    })
                  },
                ],
              })({
                scrollIndex: requestAccountTradeListTether(
                  zip((w3p, pageIndex) => {
                    if (w3p === null) {
                      return null
                    }

                    return {
                      account: w3p.address,
                      chain: w3p.chain,
                      offset: pageIndex * 20,
                      pageSize: 20,
                    }
                  }, config.walletLink.wallet),
                  filterNull
                )
              }),
            ),
          )
        ),
      )



      // router.match(config.parentRoute.create({ fragment: IProfileActiveTab.LAB.toLowerCase() }))(
      //   fadeIn(
      //     $Wardrobe({
      //       chainList: [CHAIN.ARBITRUM],
      //       walletLink: config.walletLink,
      //       parentRoute: config.parentRoute
      //     })({
      //       changeRoute: changeRouteTether(),
      //       changeNetwork: changeNetworkTether(),
      //       walletChange: walletChangeTether(),
      //     })
      //   )
      // ),








      // $responsiveFlex(
      //   $row(style({ flex: 1 }))(
      //     $StakingGraph({
      //       sourceList: config.stake,
      //       stakingInfo: multicast(arbitrumContract),
      //       walletLink: config.walletLink,
      //       // priceFeedHistoryMap: pricefeedQuery,
      //       // graphInterval: intervalTimeMap.HR4,
      //     })({}),
      //   ),
      // ),

      // $IntermediatePromise({
      //   query: blueberrySubgraph.owner(now({ id: config.account })),
      //   $$done: map(owner => {
      //     if (owner == null) {
      //       return $alert($text(style({ alignSelf: 'center' }))(`Connected account does not own any GBC's`))
      //     }

      //     return $row(layoutSheet.spacingSmall, style({ flexWrap: 'wrap' }))(...owner.ownedTokens.map(token => {
      //       return $berryTileId(token, 85)
      //     }))
      //   }),
      // })({}),

    ),

    {
      changeRoute: mergeArray([
        changeRoute,
        map(mode => {
          const pathName = `/p/wallet/` + mode.toLowerCase()
          if (location.pathname !== pathName) {
            history.pushState(null, '', pathName)
          }

          return pathName
        }, selectProfileMode)
      ]),
      changeNetwork, walletChange, requestStake, requestAccountTradeList, requestAccountOpenTradeList
    }
  ]
})



export const $TransferItems = (items: { id: number, amount: number }[]) => component((
  [selection, selectionTether]: Behavior<any, any>
) => {

  return [
    $column(
      $row(...items.map(item => {

        return $row(
          $labItem({ id: item.id })
        )
      })),

      // $DropMultiSelect({
      //   value: now([]),
      //   $chip: $defaultChip(style({ padding: 0, overflow: 'hidden' })),
      //   $$chip: map(item => {

      //     return $row(style({ alignItems: 'center', gap: '8px', color: pallete.message }))(
      //       style({ borderRadius: '50%' }, $labItem(item.id, 50)),
      //       $text(String(item.id)),
      //     )
      //   }),
      //   selectDrop: {
      //     $container: $defaultSelectContainer(style({ padding: '10px', flexWrap: 'wrap', width: '100%', maxHeight: '400px', overflow: 'auto', flexDirection: 'row' })),
      //     $$option: map((item) => {

      //       return style({ cursor: 'pointer' }, $labItem(item.id, 50))
      //     }),
      //     list: items
      //   }
      // })({
      //   selection: selectionTether()
      // }),

      $ButtonPrimary({
        $content: $text('Send')
      })({})
    )


  ]
})
