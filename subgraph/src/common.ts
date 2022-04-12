import { Address, ethereum, BigInt } from "@graphprotocol/graph-ts"
import { Owner, Contract, TransferLabItem, LabItem } from "../generated/schema"
import * as lab from "../generated/ERC1155/ERC1155"
import { ONE_BI, ZERO_BI, _createTransactionIfNotExist } from "./helpers"

export function _createNewOwner(address: string): Owner {
  const owner = new Owner(address)
  owner.rewardPaidCumulative = ZERO_BI
  owner.balance = ZERO_BI
  owner.labBalance = ZERO_BI
  owner.stakedTokenList = []

  return owner
}

export function handleLabItemTransfer(from: Address, to: Address, id: BigInt, value: BigInt, event: ethereum.Event): void {
  const transferId = event.transaction.hash
    .toHexString()
    .concat(':'.concat(event.transactionLogIndex.toHexString()))


  let previousOwner = Owner.load(from.toHexString())
  let newOwner = Owner.load(to.toHexString())
  let labItem = LabItem.load(id.toHexString())
  let transfer = TransferLabItem.load(transferId)
  let contract = Contract.load(event.address.toHexString())

  const instance = lab.ERC1155.bind(event.address)

  if (previousOwner == null) {
    previousOwner = _createNewOwner(to.toHex())
  }

  if (newOwner == null) {
    newOwner = _createNewOwner(to.toHexString())
  }
  
  newOwner.labBalance = newOwner.labBalance.plus(ONE_BI)


  if (labItem == null) {
    labItem = new LabItem(id.toHexString())
    labItem.contract = event.address.toHexString()
    labItem.uri = instance.uri(id)
  }

  labItem.owner = to.toHexString()


  if (transfer == null) {
    transfer = new TransferLabItem(transferId)
    transfer.token = id.toHexString()
    transfer.from = from.toHexString()
    transfer.to = to.toHexString()
    transfer.timestamp = event.block.timestamp
    transfer.transaction = _createTransactionIfNotExist(event)
  }

  if (contract == null) {
    contract = new Contract(event.address.toHexString())
    contract.name = instance.name()
    contract.symbol = instance.symbol()
  }

  contract.totalSupply = instance.totalTokens()

  previousOwner.save()
  newOwner.save()
  labItem.save()
  contract.save()
  transfer.save()
}

