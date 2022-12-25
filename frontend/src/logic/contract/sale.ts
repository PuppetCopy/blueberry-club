import { replayLatest } from "@aelea/core"
import { Mintable__factory } from "@gambitdao/gbc-contracts"
import { MintRule } from "@gambitdao/gbc-middleware"
import { filterNull, periodicRun } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { combine, map, multicast, skipRepeats } from "@most/core"
import { takeUntilLast } from "../common"



export function getMintCount(rule: MintRule, walletLink: IWalletLink, updateInterval = 1500) {
  const contract = map(p => Mintable__factory.connect(rule.contractAddress, p), filterNull(walletLink.provider))
  
  const count = periodicRun({
    interval: updateInterval,
    actionOp: combine(async (c) => (await c.totalMinted()).toNumber(), contract),
  })
  const countUntil = takeUntilLast(c => rule.supply === c, count)

  return skipRepeats(replayLatest(multicast(countUntil)))
}


