import { fromCallback } from "@aelea/core"
import type { Stream } from '@most/types'


export const listen = <T extends BaseContract, ET>(contract: T, ev: ContractEventName): Stream<ET & { __event: any }> => {
  return fromCallback(
    cb => {
      contract.on(ev, cb)
      return () => contract.off(ev, cb)
    },
    (...argsArray: any[]) => {
      const arrLength = argsArray.length
      const eventDescriptor = argsArray[arrLength - 1] as any
      const argsObj: any = {
        __event: eventDescriptor
      }
      for (const prop in eventDescriptor.args) {
        if (Object.prototype.hasOwnProperty.call(eventDescriptor.args, prop) && !Number.isFinite(Number(prop))) {

          const value = eventDescriptor.args[prop]

          argsObj[prop] = value
        }
      }
      return argsObj
    }
  )
}

