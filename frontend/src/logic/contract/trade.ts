import { awaitPromises, map, multicast, now, switchLatest } from "@most/core"
import { AddressZero, ADDRESS_LEVERAGE, ARBITRUM_ADDRESS, AVALANCHE_ADDRESS, CHAIN, getDenominator, switchFailedSources, TradeAddress, USD_PERCISION } from "@gambitdao/gmx-middleware"
import { combineArray, replayLatest } from "@aelea/core"
import { ERC20__factory, FastPriceFeed, FastPriceFeed__factory, PositionRouter__factory, VaultReader__factory, Vault__factory } from "./gmx-contracts"
import { periodicRun } from "@gambitdao/gmx-middleware"
import { CHAIN_NATIVE_TO_ADDRESS, getTokenDescription } from "../../components/trade/utils"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { Stream } from "@most/types"
import { BaseProvider, Provider, Web3Provider } from "@ethersproject/providers"
import { Signer } from "@ethersproject/abstract-signer"
import { contractConnect } from "../common"


export interface KeeperExecutePosition {
  account: string
  path: string[]
  indexToken: string
  amountIn: bigint
  minOut: bigint
  sizeDelta: bigint
  isLong: boolean
  acceptablePrice: bigint
  executionFee: bigint
  blockGap: bigint
  timeGap: bigint
}

export function connectErc20(address: string, provider: Stream<Signer | Provider>) {

  const contract = map(w3p => ERC20__factory.connect(address, w3p), provider)

  // const account = filter((a): a is string => a !== null, wallet.account)

  const balance = awaitPromises(map(async w3p => {

    if (!w3p.address) {
      throw 'no account connected'
    }

    return (await w3p.balanceOf(w3p.address)).toBigInt()
  }, contract))

  return { contract, balance }
}


export function connectTrade(provider: Stream<BaseProvider | null>) {
  const router = contractConnect(PositionRouter__factory, provider, {
    [CHAIN.ARBITRUM]: ARBITRUM_ADDRESS.PositionRouter,
    [CHAIN.AVALANCHE]: AVALANCHE_ADDRESS.PositionRouter
  })


  // const executeIncreasePosition: Stream<KeeperExecutePosition> = map((xx) => {
  //   if (xx) {
  //     const contract = PositionRouter__factory.connect(ARBITRUM_ADDRESS.PositionRouter, web3Provider)

  //     contract.on('ExecuteIncreasePosition', (xx) => {
  //       debugger
  //     })
  //     contract.on('ExecuteDecreasePosition', (xx) => {
  //       debugger
  //     })
  //   }
  //   return xx as any`
  // }, provider)

  const executeIncreasePosition: Stream<KeeperExecutePosition> = router.listen('ExecuteIncreasePosition')
  const cancelIncreasePosition: Stream<KeeperExecutePosition> = router.listen('CancelIncreasePosition')

  const executeDecreasePosition: Stream<KeeperExecutePosition> = router.listen('ExecuteDecreasePosition')
  const cancelDecreasePosition: Stream<KeeperExecutePosition> = router.listen('CancelDecreasePosition')

  const executionFee = router.int(map(c => c.minExecutionFee()))

  const getLatestTradeRequest = (key: string, isIncrease: boolean) => router.run(map(async router => {
    const resp = isIncrease ? await router.increasePositionRequests(key) : await router.decreasePositionRequests(key)

    const account = resp.account
    const indexToken = resp.indexToken

    const acceptablePrice = resp.acceptablePrice.toBigInt()
    const sizeDelta = resp.sizeDelta.toBigInt()

    const blockNumber = resp.blockNumber.toBigInt()
    const blockTime = resp.blockTime.toBigInt()
    const executionFee = resp.executionFee.toBigInt()
    const minOut = resp.minOut.toBigInt()

    // const amountIn = resp.amountIn.toBigInt()
    // const hasCollateralInETH = resp.hasCollateralInETH

    const isLong = resp.isLong

    // amountIn, hasCollateralInETH,
    return { acceptablePrice, sizeDelta, account, indexToken, blockNumber, blockTime, executionFee, minOut, isLong, }
  }))

  return {
    contract: router.contract, executionFee, getLatestTradeRequest,
    executeIncreasePosition,
    cancelIncreasePosition,
    executeDecreasePosition,
    cancelDecreasePosition,
  }
}


async function getGmxIOPriceMap(): Promise<{ [key in ADDRESS_LEVERAGE]: bigint }> {
  const res = await fetch('https://gmx-server-mainnet.uw.r.appspot.com/prices')
  const json = await res.json()

  // @ts-ignore
  return Object.keys(json).reduce((seed, key) => {
    // @ts-ignore
    seed[key.toLowerCase()] = json[key]
    return seed
  }, {})
}

const gmxIOPriceMapSource = replayLatest(multicast(periodicRun({
  interval: 5000,
  actionOp: map(async time => getGmxIOPriceMap())
})))

const gmxIoLatestPrice = (token: ADDRESS_LEVERAGE) => map(pmap => BigInt(pmap[token]), gmxIOPriceMapSource)

const latestVaultPrice = (token: TradeAddress, feed: Stream<FastPriceFeed>) => switchLatest(map(c => {
  return periodicRun({
    recoverError: false,
    actionOp: map(async () => (await c.prices(token)).toBigInt())
  })
}, feed))


export async function getErc20Balance(token: TradeAddress, w3p: Web3Provider | null, account: null | string) {
  if (!w3p || !account) {
    return 0n
  }

  if (token === AddressZero) {
    return (await w3p.getSigner().getBalance()).toBigInt()
  }

  const ercp = ERC20__factory.connect(token, w3p.getSigner())

  return (await ercp.balanceOf(account)).toBigInt()
}


export function connectPricefeed(provider: Stream<BaseProvider | null>) {
  const pricefeed = contractConnect(FastPriceFeed__factory, provider, {
    [CHAIN.ARBITRUM]: ARBITRUM_ADDRESS.FastPriceFeed,
    [CHAIN.AVALANCHE]: AVALANCHE_ADDRESS.FastPriceFeed
  })

  // const contract = map(w3p => FastPriceFeed__factory.connect('0x1a0ad27350cccd6f7f168e052100b4960efdb774', w3p), provider)

  const getLatestPrice = (token: TradeAddress, maximize = false) => {
    const desc = getTokenDescription(USE_CHAIN, token)

    if (desc.isStable) {
      return now(USD_PERCISION)
    }

    const normalizedAddress = token === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : token

    return switchFailedSources([
      gmxIoLatestPrice(normalizedAddress as ADDRESS_LEVERAGE),
      latestVaultPrice(token, pricefeed.contract),
    ])
  }

  return { contract: pricefeed.contract, getLatestPrice }
}





export function connectVault(provider: Stream<BaseProvider | null>) {
  const vault = contractConnect(Vault__factory, provider, {
    [CHAIN.ARBITRUM]: ARBITRUM_ADDRESS.Vault,
    [CHAIN.AVALANCHE]: AVALANCHE_ADDRESS.Vault
  })
  const usdg = contractConnect(ERC20__factory, provider, {
    [CHAIN.ARBITRUM]: ARBITRUM_ADDRESS.USDG,
    [CHAIN.AVALANCHE]: AVALANCHE_ADDRESS.USDG
  })

  // const usdg = map(w3p => ERC20__factory.connect(ARBITRUM_ADDRESS.USDG, w3p), provider)

  const usdgSupply = usdg.int(map(c => c.totalSupply()))

  const totalTokenWeight = vault.int(map(c => c.totalTokenWeights()))
  const getTokenWeight = (token: TradeAddress) => vault.int(map(c => c.tokenWeights(token)))
  const getTokenDebtUsd = (token: TradeAddress) => vault.int(map(c => c.usdgAmounts(token)))
  const getTokenCumulativeFundingRate = (token: TradeAddress) => vault.int(map(c => c.cumulativeFundingRates(token)))
  const getPoolAmount = (token: TradeAddress) => vault.int(map(c => c.poolAmounts(token)))
  const getReservedAmount = (token: TradeAddress) => vault.int(map(c => c.reservedAmounts(token)))
  const getTotalShort = (token: TradeAddress) => vault.int(map(c => c.globalShortSizes(token)))
  const getTotalShortCap = (token: TradeAddress) => vault.run(map(async c => {
    try {
      return (await c.maxGlobalShortSizes(token)).toBigInt()
    } catch (e) {
      return null
    }
  }))



  const getAvailableLiquidityUsd = (chain: CHAIN.ARBITRUM | CHAIN.AVALANCHE, token: TradeAddress, isLong: boolean) => {

    const tokenDesc = getTokenDescription(chain, token)
    const denominator = getDenominator(tokenDesc.decimals)
    const price = getPrice(token, false)
    const poolAmount = getPoolAmount(token)
    const reservedAmount = getReservedAmount(token)

    return combineArray((poolAmount, reservedAmount, maxGlobalShortSize, globalShortSize, price) => {
      const availableAmount = poolAmount - reservedAmount

      if (isLong) {
        return availableAmount * price / denominator
      }

      const maxAvailableShort = globalShortSize ? maxGlobalShortSize - globalShortSize : maxGlobalShortSize

      if (availableAmount > maxAvailableShort) {
        return maxAvailableShort
      }

      return availableAmount * price / denominator
    }, poolAmount, reservedAmount, getTotalShort(token), getTotalShortCap(token), price)
  }

  const getPrice = (token: TradeAddress, maximize: boolean) => switchLatest(map(contract => periodicRun({
    actionOp: map(async () => {

      if (contract === null) {
        throw new Error('no connected account')
      }

      const price = (maximize ? await contract.getMaxPrice(token) : await contract.getMinPrice(token)).toBigInt()
      return price
    })
  }), vault.contract))


  const getPosition = (positionKey: string) => vault.run(map(async c => {
    const position = await c.positions(positionKey)

    if (!position || position.lastIncreasedTime.eq(0)) {
      return null
    }


    const [size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl, lastIncreasedTime] = position
    const lastIncreasedTimeBn = lastIncreasedTime.toBigInt()

    return {
      key: positionKey,
      size: size.toBigInt(),
      collateral: collateral.toBigInt(),
      averagePrice: averagePrice.toBigInt(),
      entryFundingRate: entryFundingRate.toBigInt(),
      reserveAmount: reserveAmount.toBigInt(),
      realisedPnl: realisedPnl.toBigInt(),
      lastIncreasedTime: lastIncreasedTimeBn,
    }
  }))

  return {
    contract: vault.contract, getPrice, getTokenWeight, getTokenDebtUsd, getTokenCumulativeFundingRate, totalTokenWeight, usdgSupply, getPosition, getPoolAmount, getReservedAmount, getAvailableLiquidityUsd
  }
}

