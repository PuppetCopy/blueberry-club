import { Op } from "@aelea/core"
import { $Node, $node, $text, component, style } from "@aelea/dom"
import { TransactionResponse } from "@ethersproject/providers"
import { parseError } from "@gambitdao/wallet-link"
import { chain, constant, empty, fromPromise, map, merge, mergeArray, multicast, now, recoverWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $alert } from "../elements/$common"


const styleEl = document.createElement('style')

const spinnerId = (Math.random() + 1).toString(36).substring(7)

const keyFrames = `
@keyframes id${spinnerId} {
  0% { transform:rotate(0deg);}
  100% {transform:rotate(360deg)}   
}
`
styleEl.innerHTML = keyFrames.replace(/A_DYNAMIC_VALUE/g, "180deg")
document.getElementsByTagName('head')[0].appendChild(styleEl)

export const $spinner = $node(style({
  width: '45px',
  height: '45px',
  borderRadius: '50%',
  border: '4px #fff dashed',
  boxShadow: 'inset 0px 0px 0px 3px #fff',
  backgroundColor: 'transparent',
  animation: `id${spinnerId} 5s linear infinite`,
}))()


interface ISpinner<T> {
  query: Stream<Promise<T>>
  clean?: Stream<any>

  $done: Op<T, $Node>
  $fail?: Op<Error, $Node>

  $loader?: $Node
}

enum STATUS {
  LOADING,
  DONE,
  ERROR,
}

interface IIntermediateState<T> {
  status: STATUS.DONE
  data: T
}
interface IIntermediateLoading {
  status: STATUS.LOADING
  $loader: $Node
}
interface IIntermediateError {
  status: STATUS.ERROR
  error: Error
}

export const $IntermediatePromise = <T>({
  $loader = $spinner,
  query,
  $fail = map(res => $alert($text(res.message))),
  $done,
  clean = empty()
}: ISpinner<T>) => component(() => {
  const state: Stream<IIntermediateState<T> | IIntermediateLoading | IIntermediateError> = multicast(switchLatest(map(prom => {
    const doneData: Stream<IIntermediateState<T>> = map(data => ({ status: STATUS.DONE, data }), fromPromise(prom))
    const loading: Stream<IIntermediateLoading> = now({ status: STATUS.LOADING, $loader })
    const settledOrError = recoverWith(error => now({ status: STATUS.ERROR, error } as IIntermediateError), doneData)

    return merge(settledOrError, loading)
  }, query)))

  return [
    switchLatest(mergeArray([
      chain(state => {

        if (state.status === STATUS.LOADING) {
          return now($loader)
        }

        if (state.status === STATUS.ERROR) {
          return $fail(now(state.error))
        }

        return $done(now(state.data))
      }, state),
      constant(empty(), clean)
    ])),

    { state }
  ]
})


export const $IntermediateTx = <T>({ $done, query, clean, $loader }: ISpinner<T>) => $IntermediatePromise({
  query, clean, $done, $loader,
  $fail: map(res => {
    const error = parseError(res)

    return $alert($text(error.message))
  }),
})