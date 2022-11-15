import { awaitPromises, empty, map, multicast, now, switchLatest } from "@most/core"
import { AddressZero, CHAIN, getDenominator, switchFailedSources, AddressIndex, AddressInput, USD_PERCISION } from "@gambitdao/gmx-middleware"
import { combineArray, replayLatest } from "@aelea/core"
import { ERC20__factory, FastPriceFeed__factory, PositionRouter__factory, Router__factory, Vault__factory } from "./gmx-contracts"
import { periodicRun } from "@gambitdao/gmx-middleware"
import { getTokenDescription, resolveAddress } from "../utils"
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
  const router = contractConnect(Router__factory, provider, 'Router')
  const positionRouter = contractConnect(PositionRouter__factory, provider, 'PositionRouter')

  const isEnabled = router.run(map(async c => c.contract.approvedPlugins(await c.signer.getAddress(), c.addressMapping['PositionRouter'])))

  const executeIncreasePosition: Stream<KeeperExecutePosition> = positionRouter.listen('ExecuteIncreasePosition')
  const cancelIncreasePosition: Stream<KeeperExecutePosition> = positionRouter.listen('CancelIncreasePosition')

  const executeDecreasePosition: Stream<KeeperExecutePosition> = positionRouter.listen('ExecuteDecreasePosition')
  const cancelDecreasePosition: Stream<KeeperExecutePosition> = positionRouter.listen('CancelDecreasePosition')

  const executionFee = positionRouter.int(map(c => c.contract.minExecutionFee()))

  const getLatestTradeRequest = (key: string, isIncrease: boolean) => positionRouter.run(map(async c => {
    const resp = isIncrease ? await c.contract.increasePositionRequests(key) : await c.contract.decreasePositionRequests(key)

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
    isEnabled,
    contract: positionRouter.contract, executionFee, getLatestTradeRequest,
    executeIncreasePosition,
    cancelIncreasePosition,
    executeDecreasePosition,
    cancelDecreasePosition,
  }
}


async function getGmxIOPriceMap(chain: CHAIN): Promise<{ [key in AddressIndex]: bigint }> {
  const url = chain === CHAIN.ARBITRUM ? 'https://gmx-server-mainnet.uw.r.appspot.com/prices' : 'https://gmx-avax-server.uc.r.appspot.com/prices'
  const res = await fetch(url)
  const json = await res.json()

  // @ts-ignore
  return Object.keys(json).reduce((seed, key) => {
    // @ts-ignore
    seed[key.toLowerCase()] = json[key]
    return seed
  }, {})
}

const gmxIOPriceMapSource = {
  [CHAIN.ARBITRUM]: replayLatest(multicast(periodicRun({
    interval: 5000,
    actionOp: map(async time => getGmxIOPriceMap(CHAIN.ARBITRUM))
  }))),
  [CHAIN.AVALANCHE]: replayLatest(multicast(periodicRun({
    interval: 5000,
    actionOp: map(async time => getGmxIOPriceMap(CHAIN.AVALANCHE
    ))
  }))),
}

const gmxIoLatestPrice = (chain: CHAIN, token: AddressIndex) => {
  // @ts-ignore
  return map(pmap => BigInt(pmap[token]), gmxIOPriceMapSource[chain])
}




export async function getErc20Balance(token: AddressInput, w3p: Web3Provider | null, account: null | string) {
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
  const pricefeed = contractConnect(FastPriceFeed__factory, provider, 'FastPriceFeed')

  // const contract = map(w3p => FastPriceFeed__factory.connect('0x1a0ad27350cccd6f7f168e052100b4960efdb774', w3p), provider)

  const getLatestPrice = (chain: CHAIN, token: AddressInput, maximize = false) => {
    const desc = getTokenDescription(chain, token)

    if (desc.isStable) {
      return now(USD_PERCISION)
    }

    const normalizedAddress = resolveAddress(chain, token)
        
    const latestValue = switchLatest(map(c => {
      if (c === null) {
        return empty()
      }

      return periodicRun({
        recoverError: false,
        actionOp: map(async () => (await c.contract.prices(token)).toBigInt())
      })
    }, pricefeed.contract))

    return switchFailedSources([
      gmxIoLatestPrice(chain, normalizedAddress as AddressIndex),
      latestValue
    ])
  }

  return { contract: pricefeed.contract, getLatestPrice }
}





export function connectVault(provider: Stream<BaseProvider | null>) {
  const vault = contractConnect(Vault__factory, provider, 'Vault')
  const usdg = contractConnect(ERC20__factory, provider, 'USDG')

  // const usdg = map(w3p => ERC20__factory.connect(ARBITRUM_ADDRESS.USDG, w3p), provider)

  const usdgSupply = usdg.int(map(c => c.contract.totalSupply()))

  const totalTokenWeight = vault.int(map(c => c.contract.totalTokenWeights()))
  const getTokenWeight = (token: AddressInput) => vault.int(map(c => c.contract.tokenWeights(token)))
  const getTokenDebtUsd = (token: AddressInput) => vault.int(map(c => c.contract.usdgAmounts(token)))
  const getTokenCumulativeFundingRate = (token: AddressInput) => vault.int(map(c => c.contract.cumulativeFundingRates(token)))
  const getPoolAmount = (token: AddressInput) => vault.int(map(c => c.contract.poolAmounts(token)))
  const getReservedAmount = (token: AddressInput) => vault.int(map(c => c.contract.reservedAmounts(token)))
  const getTotalShort = (token: AddressInput) => vault.int(map(c => c.contract.globalShortSizes(token)))
  const getTotalShortCap = (token: AddressInput) => vault.run(map(async c => {
    try {
      return (await c.contract.maxGlobalShortSizes(token)).toBigInt()
    } catch (e) {
      return null
    }
  }))



  const getAvailableLiquidityUsd = (chain: CHAIN, token: AddressIndex, isLong: boolean) => {

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

  const getPrice = (token: AddressIndex, maximize: boolean) => switchLatest(map(c => periodicRun({
    actionOp: map(async () => {

      if (c === null) {
        throw new Error('no connected account')
      }

      const price = (maximize ? await c.contract.getMaxPrice(token) : await c.contract.getMinPrice(token)).toBigInt()
      return price
    })
  }), vault.contract))


  const getPosition = (positionKey: string) => vault.run(map(async c => {
    const position = await c.contract.positions(positionKey)

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

