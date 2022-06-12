import { MerkleTree } from "merkletreejs"
import keccak256 from "keccak256"

import { ethers } from "hardhat"

export class MerkleSale {
  tree: MerkleTree
  leaves: string[]
  whitelist: string[]
  root: string

  constructor(whitelist: string[]) {
    this.whitelist = whitelist
    this.leaves = this.whitelist.map((r) => MerkleSale.hash(r))
    this.tree = new MerkleTree(this.leaves, keccak256)
    this.root = this.tree.getHexRoot()
  }

  proof(index: number) {
    return this.tree.getHexProof(this.leaf(index))
  }

  leaf(index: number) {
    return this.leaves[index]
  }

  account(index: number) {
    return this.whitelist[index]
  }

  static hash(account: string) {
    return ethers.utils.solidityKeccak256(["address"], [account])
  }
}
