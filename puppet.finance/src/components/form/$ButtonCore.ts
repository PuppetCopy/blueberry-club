import { constant, empty, filter, map, merge, mergeArray } from "@most/core"
import { Behavior, O } from '@aelea/core'
import { $Node, $element, component, nodeEvent, INode, styleBehavior, IBranch, attrBehavior, NodeComposeFn } from '@aelea/dom'
import { pallete } from '@aelea/ui-components-theme'
import { Control, designSheet } from "@aelea/ui-components"


export const interactionOp = O(
  (src: $Node) => merge(nodeEvent('focus', src), nodeEvent('pointerover', src)),
  constant(true)
)

export const dismissOp = O(
  (src: $Node) => merge(nodeEvent('blur', src), nodeEvent('pointerout', src)),
  filter(x => document.activeElement !== x.target,), // focused elements cannot be dismissed
  constant(false)
)

export interface IButtonCore extends Control {
  $container?: NodeComposeFn<$Node>,
  $content: $Node
}

export const $defaultButtonCore = $element('button')(designSheet.btn)

export const $ButtonCore = ({ $content, $container = $defaultButtonCore, disabled = empty() }: IButtonCore) => component((
  [focusStyle, interactionTether]: Behavior<IBranch, true>,
  [dismissstyle, dismissTether]: Behavior<IBranch, false>,
  [click, clickTether]: Behavior<INode, PointerEvent>
) => {


  const $button = $container(
    clickTether(
      nodeEvent('pointerup')
    ),
    styleBehavior(
      map(isDisabled => isDisabled ? { opacity: .4, pointerEvents: 'none' } : null, disabled)
    ),


    attrBehavior(
      map(d => {
        return { disabled: d ? 'true' : null }
      }, disabled)
    ),

    styleBehavior(
      map(
        active => active ? { borderColor: pallete.primary } : null,
        mergeArray([focusStyle, dismissstyle])
      )
    ),

    interactionTether(interactionOp),
    dismissTether(dismissOp),
  )

  return [
    $button($content),

    {
      click
    }
  ]
})
