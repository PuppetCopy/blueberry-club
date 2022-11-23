import { Behavior, combineArray, O } from "@aelea/core"
import { $element, $text, component, style, stylePseudo } from "@aelea/dom"
import { $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { ContractTransaction } from "@ethersproject/contracts"
import { $alertTooltip, $spinner } from "@gambitdao/ui-components"
import { constant, empty, fromPromise, map, mergeArray, now, recoverWith, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $Button, IButton } from "./$buttonCore"
import { parseError } from "@gambitdao/wallet-link"



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
    buttonPrimaryStyle
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


