import { replayLatest } from "@aelea/core"
import { MintRule, abi } from "@gambitdao/gbc-middleware"
import { periodicSample, takeUntilLast } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { skipRepeats } from "@most/core"
import { connectContract, contractReader,  } from "../common"



export function getMintCount(rule: MintRule, walletLink: IWalletLink, interval = 1500) {
  const holderConnect = connectContract(walletLink.client, rule.contractAddress, abi.holder)
  const readTotalMinted = contractReader(holderConnect)('totalMinted')

  const count = periodicSample(readTotalMinted, { interval })
  const countUntil = takeUntilLast(c => rule.supply === c, count)

  return skipRepeats(replayLatest(countUntil))
}


