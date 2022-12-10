import { Pool } from '@uniswap/v3-sdk'

import { ethers } from 'ethers'
import { Token, } from '@uniswap/sdk-core'
import * as abi from './uniV3.abi'
import { ARBITRUM_ADDRESS } from '../address/arbitrum'
import { CHAIN } from '../constant'
import { parseFixed } from '../utils'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Interface } from '@ethersproject/abi'

// default uses “http://localhost:8545”
// can also input your own connection with "https://mainnet.infura.io/v3/<YOUR-ENDPOINT-HERE>" as an input

// pool address for DAI/USDC 0.05%
const poolAddress = '0x6c6bc977e13df9b0de53b251522280bb72383700'




export async function readUniV3(provider: JsonRpcProvider) {
  const poolContract = new ethers.Contract(poolAddress, new Interface(abi as any), provider)

  const slot = await poolContract.slot0()

  const PoolState = {
    liquidity: await poolContract.liquidity(),
    sqrtPriceX96: slot[0],
    tick: slot[1],
    observationIndex: slot[2],
    observationCardinality: slot[3],
    observationCardinalityNext: slot[4],
    feeProtocol: slot[5],
    unlocked: slot[6],
  }

  const immutables = {
    factory: await poolContract.factory(),
    token0: await poolContract.token0(),
    token1: await poolContract.token1(),
    fee: await poolContract.fee(),
    tickSpacing: await poolContract.tickSpacing(),
    maxLiquidityPerTick: await poolContract.maxLiquidityPerTick(),
  }

  const tokenA = new Token(CHAIN.ARBITRUM, ARBITRUM_ADDRESS.NATIVE_TOKEN, 18)
  const tokenB = new Token(CHAIN.ARBITRUM, ARBITRUM_ADDRESS.GMX, 18)

  const pool = new Pool(
    tokenA,
    tokenB,
    10000,
    PoolState.sqrtPriceX96.toString(),
    PoolState.liquidity.toString(),
    PoolState.tick
  )

  const poolTokenPrice = pool.priceOf(tokenB).toSignificant(6)
  const poolTokenPriceAmount = parseFixed(poolTokenPrice, 18)


  return {
    pool,
    poolTokenPrice,
    poolTokenPriceAmount
  }
  // return getTokenUsd(poolTokenPriceAmount, ethPrice)
}
