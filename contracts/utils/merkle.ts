import { MerkleTree } from "merkletreejs"
import keccak256 from "keccak256"

import { ethers } from "hardhat"
import { MerkleRuleStruct } from "../typechain-types/contracts/lab/sales/merkle/Sale.sol/MerkleSale"
import { BigNumber, BigNumberish } from "ethers"

type MerkleSaleDefault = {
  to: string
  amount?: BigNumberish
  cost?: BigNumberish
}

export class MerkleSale {
  tree: MerkleTree
  leaves: string[]
  rules: MerkleRuleStruct[]
  root: string

  constructor(whitelist: MerkleSaleDefault[]) {
    this.rules = whitelist.map((d) => {
      return {
        to: d.to,
        amount: d.amount || 1,
        cost: d.cost != undefined ? BigNumber.from(d.cost).add(1) : 0,
      }
    })
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

  verify(index: number) {
    return this.tree.verify(this.proof(index), this.leaf(index), this.root)
  }

  static hash(rule: MerkleRuleStruct) {
    return ethers.utils.solidityKeccak256(
      ["address", "uint128", "uint128"],
      [rule.to, rule.amount, rule.cost]
    )
  }
}
