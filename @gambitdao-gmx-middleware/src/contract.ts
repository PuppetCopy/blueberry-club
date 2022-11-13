import { fromCallback } from "@aelea/core"
import { BigNumber } from "@ethersproject/bignumber"
import { BaseContract } from "@ethersproject/contracts"

import type { Stream } from '@most/types'


export const listen = <T extends BaseContract>(contract: T) => (eventName: string): Stream<any> => {
  return fromCallback(
    cb => {
      contract.on(eventName, cb)
      return () => contract.off(eventName, cb)
    },
    (...argsArray) => {
      const arrLength = argsArray.length
      const eventDescriptor = argsArray[arrLength - 1] as any
      const argsObj: any = {}
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



