import { MintRuleStruct } from "@gambitdao/gbc-middleware"
import { keccak256, solidityKeccak256 } from "ethers/lib/utils"
import MerkleTree from "merkletreejs"


export function getMerkleProofs(addressList: string[], mintRules: MintRuleStruct) {

  const addressListNormalized = addressList.map(address => address.toLowerCase())
  const leaves = addressListNormalized.map(account => solidityKeccak256(
    ['address', 'uint96', 'uint208', 'uint64', 'uint120', 'uint120'],
    [account, mintRules.cost, mintRules.start, mintRules.transaction, mintRules.amount, 0]
  ))

  const tree = new MerkleTree(leaves, keccak256, { sort: true })
  const merkleRoot = tree.getHexRoot()

  return { merkleRoot, leaves }
}

