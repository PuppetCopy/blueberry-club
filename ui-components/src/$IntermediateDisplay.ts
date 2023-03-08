import { Op, replayLatest } from "@aelea/core"
import { $Node, $node, $text, component, style } from "@aelea/dom"
import { $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { ContractReceipt, ContractTransaction } from "@ethersproject/contracts"
import { CHAIN } from "@gambitdao/const"
import { parseError } from "@gambitdao/wallet-link"
import { constant, empty, fromPromise, map, merge, mergeArray, multicast, now, recoverWith, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $alert, $alertTooltip, $txHashRef, } from "./$common"



export const $spinner = $node(style({
  minWidth: '60px',
  maxWidth: '60px',
  width: '60xp',
  height: '45px',
  maxHeight: '45px',
  borderRadius: '14px',
  backgroundImage: 'url(/assets/gbc-loop.gif)',
  backgroundPosition: 'center',
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
  margin: 'auto',
  placeSelf: 'center',
  alignSelf: 'center',
  backgroundColor: 'black',
}))()


export interface IIntermediatPromise<T> {
  query: Stream<Promise<T>>
  clean?: Stream<any>

  $$done: Op<T, $Node>
  $$fail?: Op<Error, $Node>

  $loader?: $Node
}

export enum IIntermediateStatus {
  LOADING,
  DONE,
  ERROR,
}

export interface IIntermediateState<T> {
  status: IIntermediateStatus.DONE | IIntermediateStatus.LOADING | IIntermediateStatus.ERROR
  data: T
}


export const $IntermediatePromise = <T>({
  $loader = $spinner,
  query,
  $$fail = map(res => style({ placeSelf: 'center', margin: 'auto' })($alert($text(res.message)))),
  $$done,
  clean = empty()
}: IIntermediatPromise<T>) => component(() => {
  const state: Stream<IIntermediateState<T | $Node | Error>> = multicast(switchLatest(map(prom => {
    const doneData: Stream<IIntermediateState<T>> = map(data => ({ status: IIntermediateStatus.DONE, data }), fromPromise(prom))
    const loading: Stream<IIntermediateState<$Node>> = now({ status: IIntermediateStatus.LOADING, data: $loader })
    const settledOrError = recoverWith(error => now({ status: IIntermediateStatus.ERROR, data: error } as IIntermediateState<Error>), doneData)

    return merge(settledOrError, loading)
  }, query)))

  return [
    switchLatest(mergeArray([
      switchLatest(map(state => {

        if (state.status === IIntermediateStatus.LOADING) {
          return now($loader)
        }

        if (state.status === IIntermediateStatus.ERROR) {
          return $$fail(now(state.data))
        }

        return $$done(now(state.data))
      }, state)),
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

