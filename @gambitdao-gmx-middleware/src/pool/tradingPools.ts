
import { Contract, JsonRpcProvider, Provider } from "ethers"
import * as uniV2 from './uniV2.abi.js'
import { getDenominator } from '../utils.js'
import { getTokenUsd } from '../gmxUtils.js'
import { TOKEN_DESCRIPTION_MAP } from '../address/token.js'
import { AVALANCHE_ADDRESS } from '../address/avalanche.js'
import { Stream } from '@most/types'
import { awaitPromises } from '@most/core'
import { combineArray } from '@aelea/core'
import { CHAIN } from '@gambitdao/const'


export async function getGmxArbiPrice(provider: Provider, ethPrice: bigint) {
  return 0n
  // const poolContract = new Contract(ARBITRUM_ADDRESS.UniswapGmxEthPool, uniV3.default.abi, provider)

  // const tokenA = new Token(CHAIN.ARBITRUM, ARBITRUM_ADDRESS.NATIVE_TOKEN, TOKEN_DESCRIPTION_MAP.ETH.decimals)
  // const tokenB = new Token(CHAIN.ARBITRUM, ARBITRUM_ADDRESS.GMX, TOKEN_DESCRIPTION_MAP.GMX.decimals)

  // const token0 = await poolContract.slot0()

  // const pool = new Pool(
  //   tokenA,
  //   tokenB,
  //   10000,
  //   token0.sqrtPriceX96,
  //   1,
  //   token0.tick
  // )

  // const poolTokenPrice = pool.priceOf(tokenB).toSignificant(6)
  // const poolTokenPriceAmount = parseFixed(poolTokenPrice, 18)

  // return getTokenUsd(poolTokenPriceAmount, ethPrice, TOKEN_DESCRIPTION_MAP.GMX.decimals)
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
    const chain = Number((await p.getNetwork()).chainId)

    return chain === CHAIN.ARBITRUM ? getGmxArbiPrice(p, nativePrice) : getGmxAvaxPrice(p, nativePrice)
  }, provider, nativeTokenPrice))
}

