import { fromCallback } from "@aelea/core"
import { BigNumber } from "@ethersproject/bignumber"
import { BaseContract, EventFilter, Event } from "@ethersproject/contracts"

import type { Stream } from '@most/types'


export const listen = <T extends BaseContract>(contract: T, ev: string | EventFilter): Stream<any> => {
  return fromCallback(
    cb => {
      contract.on(ev, cb)
      return () => contract.off(ev, cb)
    },
    (...argsArray) => {
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



