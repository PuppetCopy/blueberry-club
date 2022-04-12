import { ethereum, BigInt } from "@graphprotocol/graph-ts"
import { Transaction } from "../generated/schema"

export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)

export function _createTransaction(event: ethereum.Event, id: string): Transaction {
  const to = event.transaction.to
  const entity = new Transaction(id)

  entity.timestamp = event.block.timestamp.toI32()
  entity.blockNumber = event.block.number.toI32()
  entity.from = event.transaction.from.toHexString()

  if (to !== null) {
    entity.to = to.toHexString()
  }

  return entity
}

export function _createTransactionIfNotExist(event: ethereum.Event): string {
  const id = event.transaction.hash.toHexString()
  let entity = Transaction.load(id)

  if (entity === null) {
    entity = _createTransaction(event, id)
    entity.save()
  }

  return id
}

