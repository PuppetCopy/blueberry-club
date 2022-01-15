import { replayLatest } from "@aelea/core"
import { awaitPromises, map, multicast, periodic } from "@most/core"
import { queryLatestPrices } from "./query"


export const latestTokenPriceMap = replayLatest(multicast(awaitPromises(map(() => queryLatestPrices(), periodic(5000)))))
