import { MerkleTree } from "merkletreejs"
import keccak256 from "keccak256"

import { MerkleMintRuleStruct } from "../typechain-types/contracts/lab/sales/extensions/mint/whitelist/Merkle.sol/PrivateMerkle"
import { ethers } from "hardhat"

export class MerkleSale {
  tree: MerkleTree
  leaves: string[]
  rules: MerkleMintRuleStruct[]
  root: string

  constructor(rules: MerkleMintRuleStruct[]) {
    this.rules = rules
    this.leaves = this.rules.map((r) => MerkleSale.hash(r))
    this.tree = new MerkleTree(this.leaves, keccak256)
    this.root = this.tree.getHexRoot()
  }

  proof(index: number) {
    return this.tree.getHexProof(this.leaf(index))
  }

  leaf(index: number) {
    return this.leaves[index]
  }

  rule(index: number) {
    return this.rules[index]
  }

  static hash({
    to,
    cost,
    start,
    transaction,
    amount,
    nonce,
  }: MerkleMintRuleStruct) {
    return ethers.utils.solidityKeccak256(
      ["address", "uint208", "uint64", "uint120", "uint120", "uint96"],
      [to, cost, start, transaction, amount, nonce]
    )
  }
}
