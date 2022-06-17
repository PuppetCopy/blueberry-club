import { MintPrivate } from "@gambitdao/gbc-middleware"
import { keccak256, solidityKeccak256 } from "ethers/lib/utils"
import MerkleTree from "merkletreejs"
import fs from 'fs'
import path from "path"


export function getMerkleProofs(addressList: string[], mintRules: MintPrivate) {

  const addressListNormalized = addressList.map(address => address.toLowerCase())
  const leaves = addressListNormalized.map(account => {
    const leaf = solidityKeccak256(
      ['address', 'uint208', 'uint64', 'uint120', 'uint120', 'uint96'],
      [account, mintRules.accountLimit, mintRules.start, mintRules.transaction, mintRules.amount, mintRules.nonce]
    )

    return { account, leaf }
  })

  const tree = new MerkleTree(leaves.map(x => x.leaf), keccak256, { sort: true })
  const merkleRoot = tree.getHexRoot()

  const proofs = leaves.map(({ account, leaf }) => tree.getHexProof(leaf))

  const filePath = 'whitelist.json'
  fs.writeFileSync(filePath, JSON.stringify(proofs))

  return { merkleRoot, proofs }
}

