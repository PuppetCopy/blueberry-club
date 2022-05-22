import * as generated from '../generated/ERC721/ERC721'
import * as lab from "../generated/ERC1155/ERC1155"
import * as manager from "../generated/Closet/Closet"
import * as profile from "../generated/Profile/Profile"
import { Owner, Transfer, Token } from "../generated/schema"
import { handleLabItemTransfer, _createNewOwner } from "./common"
import { ONE_BI, ZERO_BI, _createTransactionIfNotExist } from './helpers'


export function handleTransferSingle(event: lab.TransferSingle): void {
  const params = event.params

  handleLabItemTransfer(params.from, params.to, params.id, params.amount, event)
}

export function handleTransferBatch(event: lab.TransferBatch): void {
  const params = event.params

  for (let index = 0; index < params.ids.length; index++) {
    const id = params.ids[index]
    const amount = params.amounts[index]
    handleLabItemTransfer(params.from, params.to, amount, id, event)
  }
}


// export function handleSetItems(event: manager.Set): void {
//   const params = event.params
//   const token = Token.load(params.tokenId.toHex())

//   if (token) {
//     token.background = params.background
//     token.custom = params.custom
//     token.special = params.special

//     token.save()
//   }
// }



export function handleSetMain(event: profile.SetMain): void {
  const params = event.params
  const assigner = params.assigner.toHex()
  const tokenId = params.tokenId.toHex()
  const owner = Owner.load(assigner)
  

  if (owner) {
    owner.main = tokenId
    owner.save()
  }
}

export function handleSetUsername(event: profile.SetUsername): void {
  const params = event.params
  const assigner = params.assigner.toHex()
  const owner = Owner.load(assigner)
  
  if (owner) {
    owner.displayName = params.username
    owner.save()
  }
}


export function handleERC721Transfer(event: generated.Transfer): void {
  const tokenId = event.params.tokenId.toHexString()
  const from = event.params.from.toHexString()
  const to = event.params.to.toHexString()
  
  let previousOwner = Owner.load(from)
  let owner = Owner.load(to)
  let token = Token.load(tokenId)
  const transferId = event.transaction.hash
    .toHexString()
    .concat(':'.concat(event.transactionLogIndex.toHexString()))
  let transfer = Transfer.load(transferId)

  const instance = generated.ERC721.bind(event.address)

  if (previousOwner == null) {
    previousOwner = _createNewOwner(from)
  } else {
    const prevBalance = previousOwner.balance
    if (prevBalance !== null && prevBalance > ZERO_BI) {
      previousOwner.balance = prevBalance.minus(ONE_BI)
    }
  }

  if (owner == null) {
    owner = _createNewOwner(to)
  }

  owner.balance = owner.balance.plus(ONE_BI)

  if (token == null) {
    token = new Token(tokenId)
    token.operator = event.address.toHexString()
    token.background = ZERO_BI
    token.custom = ZERO_BI
    token.special = ZERO_BI

    const uri = instance.try_tokenURI(event.params.tokenId)
    if (!uri.reverted) {
      token.uri = uri.value
    }
  }

  token.owner = to

  if (transfer == null) {
    transfer = new Transfer(transferId)
    transfer.token = tokenId
    transfer.from = from
    transfer.to = to
    transfer.timestamp = event.block.timestamp
    transfer.transaction = _createTransactionIfNotExist(event)
  }


  previousOwner.save()
  owner.save()
  token.save()
  transfer.save()
}