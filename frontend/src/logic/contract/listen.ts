import { fromCallback } from "@aelea/core"
import { BigNumber } from "@ethersproject/bignumber"
import { BaseContract, Event } from "@ethersproject/contracts"
import { empty, map, switchLatest } from "@most/core"
import type { Stream } from '@most/types'
import { TypedEventFilter } from "../gmx-contracts/common"



export type ConvertTypeToBigInt<T> = {
  [P in keyof T]: T[P] extends BigNumber ? bigint : T[P]
}
export type GetEventFilterType<T extends BaseContract, Name extends keyof T['filters']> = ConvertTypeToBigInt<ReturnType<T['filters'][Name]> extends TypedEventFilter<any, infer C> ? C : never>


export const listen = <T extends BaseContract, Name extends keyof T['filters'], ET extends GetEventFilterType<T, Name>>(contract: T, ev: Name extends string ? Name : never | TypedEventFilter<any, any>): Stream<ET & { __event: Event }> => {
  return fromCallback(
    cb => {
      contract.on(ev, cb)
      return () => contract.off(ev, cb)
    },
    (...argsArray: any[]) => {
      const arrLength = argsArray.length
      const eventDescriptor = argsArray[arrLength - 1] as Event
      const argsObj: any = {
        __event: eventDescriptor
      }
      for (const prop in eventDescriptor.args) {
        if (Object.prototype.hasOwnProperty.call(eventDescriptor.args, prop) && !Number.isFinite(Number(prop))) {

          const value = eventDescriptor.args[prop]

          if (BigNumber.isBigNumber(value)) {
            argsObj[prop] = value.toBigInt()
          } else {
            argsObj[prop] = value
          }

        }
      }
      return argsObj
    }
  )
}

// export const listen = <T extends BaseContract, Name extends keyof T['filters'], ET extends GetEventFilterType<T, Name>>(provider: Stream<T>, filter: Name extends string ? Name : never): Stream<ET & { __event: Event }> => switchLatest(
//   map(provider => {
//     if (provider === null) {
//       return empty()
//     }

//     return listenFn(provider, filter)
//   }, provider)
// )


