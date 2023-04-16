import { Behavior, combineArray, O } from "@aelea/core"
import { $element, $text, component, style, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { $alertIcon, $Tooltip } from "@gambitdao/ui-components"
import { constant, fromPromise, map, never, now, recoverWith, skipRepeats, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $ButtonCore, $defaultButtonCore, IButtonCore } from "./$ButtonCore"
import { ContractTransaction, ContractTransactionResponse } from "ethers"



export const $defaultButtonPrimary = $defaultButtonCore(
  style({
    color: pallete.background, whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px',
    boxShadow: `0px 0px 0px 0 ${pallete.primary} inset`,
    alignSelf: 'flex-end',
    padding: '15px 24px', fontWeight: 'bold', borderWidth: '0px', backgroundColor: pallete.primary,
  }),
  stylePseudo(':hover', { backgroundColor: pallete.middleground })
)

const secondaryButtonStyle = style({
  color: pallete.message, whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px', borderStyle: 'solid', backgroundColor: pallete.background,
  alignSelf: 'flex-start',
  padding: '15px 24px', fontWeight: 'bold', borderWidth: '1px', borderColor: pallete.message
})


export const $defaultButtonSecondary = $defaultButtonCore(
  secondaryButtonStyle,
  stylePseudo(':hover', { borderColor: pallete.middleground }),
  style({ fontSize: '.85em' })
)

export const $defaultMiniButtonSecondary = $defaultButtonSecondary(
  style({ alignSelf: 'center', padding: '6px 10px', fontSize: '.75em' })
)


export const $buttonAnchor = $element('a')(
  layoutSheet.spacingSmall,
  secondaryButtonStyle,
  stylePseudo(':hover', { color: 'inherit', boxShadow: 'none', borderColor: pallete.primary }),
  style({
    userSelect: 'none',
    alignItems: 'center',
    textDecoration: 'none',
    // padding: '6px 12px',
    display: 'flex',
    cursor: 'pointer',
    color: pallete.message
  }),
)


export const $ButtonPrimary = (config: IButtonCore) => {
  return $ButtonCore({
    $container: $defaultButtonPrimary,
    ...config
  })
}

export const $ButtonSecondary = (config: IButtonCore) => {
  return $ButtonCore({
    $container: $defaultButtonSecondary,
    ...config,
  })
}


export interface IButtonPrimaryCtx extends IButtonCore {
  ctx: Stream<Promise<ContractTransactionResponse>>
  alert?: Stream<string | null>
}

export const $ButtonPrimaryCtx = (config: IButtonPrimaryCtx) => component((
  [click, clickTether]: Behavior<PointerEvent, PointerEvent>
) => {

  const ctxPendingDisable = startWith(false, switchLatest(map(ctxQuery => {
    // const ctxQueryWwait = fromPromise(ctxQuery.then(req => req.wait()))
    const ctxQueryStream = fromPromise(ctxQuery)
    return startWith(true, constant(false, recoverWith(() => now(false), ctxQueryStream)))
  }, config.ctx)))

  const newLocal: Stream<string | null> = config.alert || never()

  return [
    $row(style({ alignItems: 'center' }))(
      $ButtonCore({
        $container: $defaultButtonPrimary(
          style({ alignItems: 'center' }),
          stylePseudo(':hover', { backgroundColor: pallete.middleground })
        ),
        disabled: combineArray((isDisabled, isCtxPending) => {
          return isDisabled || isCtxPending
        }, config.disabled || now(false), ctxPendingDisable),
        ...config,
      })({
        click: clickTether()
      }),

      switchLatest(map(error => {
        if (error === null) {
          return never()
        }

        return $row(style({ width: '0px' }))(
          $Tooltip({
            $content: $text(style({ fontSize: '.75em', }))(error),
            $container: $column(style({ zIndex: 5, marginLeft: '-15px', position: 'relative', backgroundColor: '#000', borderRadius: '50%', })),
            $anchor: $icon({
              $content: $alertIcon, viewBox: '0 0 24 24', width: '28px',
              svgOps: style({ fill: pallete.negative, padding: '3px', filter: 'drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 1px)' })
            })
          })({})
        )
      }, skipRepeats(newLocal))),
    ),
    

    {
      click
    }
  ]
})
