import { $node, component, style } from "@aelea/dom"
import { constant, fromPromise, map, merge, multicast, now, recoverWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"


const styleEl = document.createElement('style')

const spinnerId = (Math.random() + 1).toString(36).substring(7)

const keyFrames = `
@keyframes ${spinnerId} {
  0% { transform:rotate(0deg);}
  100% {transform:rotate(360deg)}   
}
`
styleEl.innerHTML = keyFrames.replace(/A_DYNAMIC_VALUE/g, "180deg")
document.getElementsByTagName('head')[0].appendChild(styleEl)

export const $spinner = $node(style({
  width: '55px',
  height: '55px',
  borderRadius: '50%',
  border: '4px #fff dashed',
  boxShadow: 'inset 0px 0px 0px 3px #fff',
  backgroundColor: 'transparent',
  animation: `${spinnerId} 5s linear infinite`,
}))()


interface ISpinner {
  query: Stream<Promise<any>>
}

enum DISPLAY {
  NONE,
  LOADING,
  ERROR,
}

export const $IntermediateDisplay = (config: ISpinner) => component(() => {

  const state = multicast(switchLatest(map(query => {
    const settled = constant(DISPLAY.NONE, fromPromise(query))
    const settledMaybeError = recoverWith(() => now(DISPLAY.ERROR), settled)

    return merge(settledMaybeError, now(DISPLAY.LOADING))
  }, config.query)))

  return [
    $spinner,

    { state }
  ]
})
