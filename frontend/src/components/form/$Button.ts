import { combineArray, O } from "@aelea/core"
import { $element, $text, style, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { ContractTransaction } from "@ethersproject/contracts"
import { $alertIcon, $Tooltip } from "@gambitdao/ui-components"
import { constant, empty, fromPromise, map, mergeArray, now, recoverWith, skipRepeats, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $Button, IButton } from "./$buttonCore"



export const buttonPrimaryStyle = style({
  color: pallete.background, whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px',
  boxShadow: `0px 0px 0px 0 ${pallete.primary} inset`,
  alignSelf: 'flex-end',
  padding: '15px 24px', fontWeight: 'bold', borderWidth: '0px', backgroundColor: pallete.primary,
})

export const secondaryButtonStyle = style({
  color: pallete.message, whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px', borderStyle: 'solid', backgroundColor: pallete.background,
  alignSelf: 'flex-start',
  padding: '15px 24px', fontWeight: 'bold', borderWidth: '1px', borderColor: pallete.message
})


export const $ButtonPrimary = (config: IButton) => {
  return O(
    $Button({
      ...config,
      $container: (config.$container || $element('button'))(
        stylePseudo(':hover', { backgroundColor: pallete.middleground })
      )
    }),
    buttonPrimaryStyle
  )
}

export interface IButtonPrimaryCtx extends IButton {
  ctx: Stream<Promise<ContractTransaction>>
  alert?: Stream<string | null>
}

export const $ButtonPrimaryCtx = (config: IButtonPrimaryCtx) => {


  const ctxPendingDisable = startWith(false, switchLatest(map(ctxQuery => {
    // const ctxQueryWwait = fromPromise(ctxQuery.then(req => req.wait()))
    const ctxQueryStream = fromPromise(ctxQuery)
    return startWith(true, constant(false, recoverWith(() => now(false), ctxQueryStream)))
  }, config.ctx)))

  return O(
    $Button({
      ...config,
      $container: (config.$container || $element('button'))(

        stylePseudo(':hover', { backgroundColor: pallete.middleground })
      ),
      disabled: combineArray((isDisabled, isCtxPending) => isDisabled || isCtxPending, config.disabled || now(false), ctxPendingDisable),
      $content: config.$content
      // $content: $row(style({}))(
      //   config.$content,

      //   $row(style({ width: '0px', height: '0px' }))(
      //     style({ right: '0', top: '-25px' })(
      //       switchLatest(map(ctxQuery => {

      //         const $intermediate = fromPromise(ctxQuery
      //           .then(async (ctx) => {
      //             await ctx.wait()
      //             return $text('ff')
      //           }).catch(err => {
      //             const error = parseError(err)
      //             return $alertTooltip($text(error.message))
      //           })
      //         )

      //         return switchLatest(startWith($spinner, $intermediate))
      //       }, config.ctx))
      //     )
      //   ),
      // )
    }),
    src => {
      return config.alert
        ? mergeArray([
          buttonPrimaryStyle(src),
          switchLatest(map(error => {
            if (error === null) {
              return empty()
            }

            return $row(style({ width: '0px' }))(
              $Tooltip({
                $content: $text(style({ fontSize: '.75em', }))(error),
                $container: $column(style({ zIndex: 5, marginLeft: '6px', backgroundColor: '#000', borderRadius: '50%', })),
                $anchor: $icon({
                  $content: $alertIcon, viewBox: '0 0 24 24', width: '28px',
                  svgOps: style({ fill: pallete.negative, padding: '3px', filter: 'drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 1px)' })
                })
              })({})
            )
          }, skipRepeats(config.alert)))
        ])
        : buttonPrimaryStyle(src)
    }
  )
}


export const $ButtonSecondary = (config: IButton) => {
  return O(
    $Button({
      ...config,
      $container: $element('button')(
        stylePseudo(':hover', { borderColor: pallete.middleground }),
        style({ fontSize: '.85em' })
      )
    }),
    secondaryButtonStyle,
  )
}

export const $buttonAnchor = $element('a')(
  layoutSheet.spacingSmall,
  secondaryButtonStyle,
  stylePseudo(':hover', { color: 'inherit', boxShadow: 'none', borderColor: pallete.primary }),
  style({
    alignItems: 'center',
    textDecoration: 'none',
    // padding: '6px 12px',
    display: 'flex',
    cursor: 'pointer',
    color: pallete.message
  }),
)


