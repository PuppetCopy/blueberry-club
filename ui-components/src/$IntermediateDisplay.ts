import { Op, replayLatest } from "@aelea/core"
import { $Node, $node, $text, component, style } from "@aelea/dom"
import { $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { ContractReceipt, ContractTransaction } from "@ethersproject/contracts"
import { parseError } from "@gambitdao/wallet-link"
import { chain, constant, empty, fromPromise, map, merge, mergeArray, multicast, now, recoverWith, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { CHAIN } from "../../@gambitdao-gmx-middleware/src"
import { $alert, $alertTooltip, $txHashRef,  } from "./$common"


export const $spinner = $node(style({
  width: '60px',
  height: '30px',
  borderRadius: '50%',
  backgroundImage: 'url(/assets/gbc-loop.gif)',
  backgroundPosition: 'center',
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
  filter: 'drop-shadow(0px 0px 16px black)',
  backgroundColor: 'black',
}))()


export interface IIntermediatPromise<T> {
  query: Stream<Promise<T>>
  clean?: Stream<any>

  $$done: Op<T, $Node>
  $$fail?: Op<Error, $Node>

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
  $$fail = map(res => $alert($text(res.message))),
  $$done,
  clean = empty()
}: IIntermediatPromise<T>) => component(() => {
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
          return $$fail(now(state.error))
        }

        return $$done(now(state.data))
      }, state),
      constant(empty(), clean)
    ])),

    { state }
  ]
})


type IIntermediateTx<T extends ContractTransaction> = {
  $$success?: Op<ContractReceipt, $Node>
  chain: CHAIN
  query: Stream<Promise<T>>
  clean?: Stream<any>
  showTooltip?: boolean
}

export const $IntermediateTx = <T extends ContractTransaction>({
  query,
  chain,
  clean = empty(),
  $$success = constant($text(style({ color: pallete.positive }))('Tx Succeeded')),
  showTooltip = false
}: IIntermediateTx<T>) => {

  const multicastQuery = replayLatest(multicast(query))

  return $IntermediatePromise({
    clean,
    query: map(async x => {
      const n = await x
      return await n.wait()
    }, multicastQuery),
    $$done: map((res: ContractReceipt) => {
      return $row(layoutSheet.spacingSmall, style({ color: pallete.positive }))(
        switchLatest($$success(now(res))),
        $txHashRef(res.transactionHash, chain)
      )
    }),
    $loader: switchLatest(map(c => {

      return $row(layoutSheet.spacingSmall, style({ alignItems: 'center', fontSize: '.75em' }))(
        $spinner,
        $text(startWith('Wallet Request...', map(() => 'Awaiting confirmation...', fromPromise(c)))),
        $node(style({ flex: 1 }))(),
        switchLatest(map(txHash => $txHashRef(txHash.hash, chain), fromPromise(c)))
      )
    }, multicastQuery)),
    $$fail: map(res => {
      const error = parseError(res)

      return showTooltip ? $alertTooltip($text(error.message)) : $alert($text(error.message))
    }),
  })
}

