import { Address, ethereum, BigInt } from "@graphprotocol/graph-ts"
import { Owner, TransferSingle, LabItem, LabItemOwnership } from "../generated/schema"
import * as lab from "../generated/ERC1155/ERC1155"
import { AddressZero, ZERO_BI, _createTransactionIfNotExist } from "./helpers"

export function _createNewOwner(address: string, defaultToken: string | null): Owner {
  const owner = new Owner(address)
  owner.rewardClaimedCumulative = ZERO_BI
  owner.balance = ZERO_BI
  owner.profile = defaultToken

  return owner
}

export function handleLabItemTransfer(fromAddress: Address, toAddress: Address, id: BigInt, amount: BigInt, event: ethereum.Event): void {
  const transferId = event.transaction.hash.toHex() + ':' + event.transactionLogIndex.toHex()
  const tokenId = id.toHex()
  const from = fromAddress.toHex()
  const to = toAddress.toHex()
  const newLabItemOwnerId = tokenId + ':' + to
  const previousLabItemOwnerId = tokenId + ':' + from

  let previousOwner = Owner.load(from)
  let newOwner = Owner.load(to)
  let labItem = LabItem.load(tokenId)
  let transfer = TransferSingle.load(transferId)
  let newLabItemOwner = LabItemOwnership.load(newLabItemOwnerId)
  let previousLabItemOwner = LabItemOwnership.load(previousLabItemOwnerId)

  const instance = lab.ERC1155.bind(event.address)

  if (previousOwner == null) {
    previousOwner = _createNewOwner(from, null)
  }

  if (newOwner == null) {
    newOwner = _createNewOwner(to, null)
  }

  if (labItem == null) {
    labItem = new LabItem(tokenId)
    labItem.uri = instance.uri(id)
    labItem.operator = event.address.toHex()
  }


  if (previousLabItemOwner === null) {
    previousLabItemOwner = new LabItemOwnership(previousLabItemOwnerId)
    previousLabItemOwner.owner = from
    previousLabItemOwner.item = labItem.id
    previousLabItemOwner.balance = ZERO_BI
  }

  previousLabItemOwner.balance = previousLabItemOwner.balance.minus(amount)

  if (newLabItemOwner === null) {
    newLabItemOwner = new LabItemOwnership(newLabItemOwnerId)
    newLabItemOwner.owner = to
    newLabItemOwner.item = labItem.id
    newLabItemOwner.balance = ZERO_BI
  }

  newLabItemOwner.balance = newLabItemOwner.balance.plus(amount)


  if (from === AddressZero) {
    labItem.supply = labItem.supply.plus(amount)
  }


  if (transfer == null) {
    transfer = new TransferSingle(transferId)
    transfer.id = tokenId
    transfer.from = from
    transfer.to = to
    transfer.operator = event.address.toHex()
    transfer.timestamp = event.block.timestamp
    transfer.transaction = _createTransactionIfNotExist(event)

    transfer.save()
  }

  previousOwner.save()
  newOwner.save()
  labItem.save()
  previousLabItemOwner.save()
  newLabItemOwner.save()
}

