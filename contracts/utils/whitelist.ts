import { keccak256 } from "ethers/lib/utils"
import MerkleTree from "merkletreejs"


export function createWhitelistProofs(addressList: string[]) {

  const addressListNormalized = addressList.map(address => address.toLowerCase())

  const leaves = addressListNormalized.map(account => keccak256(account))
  const tree = new MerkleTree(leaves, keccak256, { sort: true })
  const merkleRoot = tree.getHexRoot()

  const whitelist = addressListNormalized.map(address => tree.getHexProof(keccak256(address))[0])

  return { merkleRoot, whitelist }
}

