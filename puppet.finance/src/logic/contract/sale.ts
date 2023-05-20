import { replayLatest } from "@aelea/core"
import { MintRule, abi } from "@gambitdao/gbc-middleware"
import { periodicSample, takeUntilLast } from "@gambitdao/gmx-middleware"
import { skipRepeats } from "@most/core"
import { connectContract, contractReader,  } from "../common"
import { walletConfig } from "../../wallet/walletLink"



export function getMintCount(rule: MintRule, interval = 1500) {
  const holderConnect = connectContract(rule.contractAddress, abi.holder)
  const readTotalMinted = contractReader(walletConfig.publicClient)('totalMinted')

  const count = periodicSample(readTotalMinted, { interval })
  const countUntil = takeUntilLast(c => rule.supply === c, count)

  return skipRepeats(replayLatest(countUntil))
}


