import { Pool } from '@uniswap/v3-sdk'
import { Token, } from '@uniswap/sdk-core'
import * as uniV3 from './uniV3.abi'
import * as uniV2 from './uniV2.abi'
import { ARBITRUM_ADDRESS } from '../address/arbitrum'
import { CHAIN } from '../constant'
import { getDenominator, parseFixed } from '../utils'
import { JsonRpcProvider } from '@ethersproject/providers'
import { getTokenUsd } from '../gmxUtils'
import { TOKEN_DESCRIPTION_MAP } from '../address/token'
import { AVALANCHE_ADDRESS } from '../address/avalanche'
import { Contract } from '@ethersproject/contracts'
import { Stream } from '@most/types'
import { awaitPromises } from '@most/core'
import { combineArray } from '@aelea/core'


export async function getGmxArbiPrice(provider: JsonRpcProvider, ethPrice: bigint) {
  const poolContract = new Contract(ARBITRUM_ADDRESS.UniswapGmxEthPool, uniV3.default.abi, provider)

  const tokenA = new Token(CHAIN.ARBITRUM, ARBITRUM_ADDRESS.NATIVE_TOKEN, TOKEN_DESCRIPTION_MAP.ETH.decimals)
  const tokenB = new Token(CHAIN.ARBITRUM, ARBITRUM_ADDRESS.GMX, TOKEN_DESCRIPTION_MAP.GMX.decimals)

  const token0 = await poolContract.slot0()

  const pool = new Pool(
    tokenA,
    tokenB,
    10000,
    token0.sqrtPriceX96,
    1,
    token0.tick
  )

  const poolTokenPrice = pool.priceOf(tokenB).toSignificant(6)
  const poolTokenPriceAmount = parseFixed(poolTokenPrice, 18)

  return getTokenUsd(poolTokenPriceAmount, ethPrice, TOKEN_DESCRIPTION_MAP.GMX.decimals)
}

export async function getGmxAvaxPrice(provider: JsonRpcProvider, ethPrice: bigint) {
  const poolContract = new Contract(AVALANCHE_ADDRESS.TraderJoeUniPool, uniV2.default.abi, provider)

  const [_reserve0, _reserve1]: [bigint, bigint] = await poolContract.getReserves().then((([a, b]: any) => [BigInt(a), BigInt(b)]))

  const avaxPerGmx = _reserve0 * getDenominator(TOKEN_DESCRIPTION_MAP.GMX.decimals) / _reserve1
  const priceUsd = getTokenUsd(avaxPerGmx, ethPrice, TOKEN_DESCRIPTION_MAP.AVAX.decimals)

  return priceUsd
}

export function getGmxTokenPrice(provider: Stream<JsonRpcProvider>, nativeTokenPrice: Stream<bigint>) {
  return awaitPromises(combineArray(async (p, nativePrice) => {
    const chain = (await p.getNetwork()).chainId

    return chain === CHAIN.ARBITRUM ? getGmxArbiPrice(p, nativePrice) : getGmxAvaxPrice(p, nativePrice)
  }, provider, nativeTokenPrice))
}

