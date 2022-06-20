import { LabItemSale, MintPrivate } from "@gambitdao/gbc-middleware"
import { keccak256, solidityKeccak256 } from "ethers/lib/utils"
import MerkleTree from "merkletreejs"
import fs from "fs"

export function getMerkleProofs(addressList: string[], sale: LabItemSale, mintRules: MintPrivate) {
  const addressListNormalized = addressList.map((address) =>
    address.toLowerCase()
  )
  const leaves = addressListNormalized.map((account) => {
    const leaf = solidityKeccak256(
      ["address", "uint120", "uint120", "uint208", "uint192", "uint64", "uint64"],
      [
        account,
        mintRules.nonce,
        mintRules.supply,
        mintRules.cost,
        mintRules.accountLimit,
        mintRules.start,
        mintRules.finish,
      ]
    )

    return { account, leaf }
  })

  const tree = new MerkleTree(
    leaves.map((x) => x.leaf),
    keccak256,
    { sort: true }
  )
  const merkleRoot = tree.getHexRoot()

  const proofs = leaves.map(({ account, leaf }) => tree.getHexProof(leaf))

  fs.writeFileSync(`private-${sale.name}.json`, JSON.stringify(proofs))

  return { merkleRoot, proofs }
}
