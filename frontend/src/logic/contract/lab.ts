import { combineArray } from "@aelea/core"
import { GBC_ADDRESS } from "@gambitdao/gbc-middleware"
import { GBCLab__factory } from "@gambitdao/gbc-contracts"
import { IWalletLink } from "@gambitdao/wallet-link"
import { filter, awaitPromises, map } from "@most/core"
import { getWalletProvider } from "../common"

export function connectLab(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => GBCLab__factory.connect(GBC_ADDRESS.LAB, w3p.getSigner()), provider)
  const account = filter((a): a is string => a !== null, wallet.account)

  const ownersListBalance = (owners: string[], idList: number[]) => {
    return awaitPromises(map(lab => lab.balanceOfBatch(owners, idList), contract))
  }

  const accountListBalance = (idList: number[]) => {
    return awaitPromises(combineArray(async (address, lab) => {
      const newLocal = [...idList].fill(address as any) as any as string[]
      const amountList = await lab.balanceOfBatch(newLocal, idList)

      return amountList.map((amount, idx) => ({ amount: Number(amount), id: idList[idx] }))
    }, account, contract))
  }

  return { contract, ownersListBalance, accountListBalance }
}
