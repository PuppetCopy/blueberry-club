import { MintRuleStruct } from "@gambitdao/gbc-middleware"
import { keccak256, } from "ethers/lib/utils"
import MerkleTree from "merkletreejs"


export function getMerkleProofs(addressList: string[], mintRules: MintRuleStruct) {

  const addressListNormalized = addressList.map(address => address.toLowerCase())

  // 0x733640db409c9ef0553a05c549e6d403588a03bb10a8283dd6e281b0cb18f090
  const leaves = addressListNormalized.map(account => keccak256([account, mintRules.cost, mintRules.start, mintRules.transaction, mintRules.amount].join('')))
  const tree = new MerkleTree(leaves, keccak256, { sort: true })
  const merkleRoot = tree.getHexRoot()

  return { merkleRoot, leaves }
}

