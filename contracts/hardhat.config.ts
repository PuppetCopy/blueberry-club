import { HardhatUserConfig, task } from "hardhat/config"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-waffle"
import "hardhat-gas-reporter"
import "@typechain/hardhat"

import dotenv from "dotenv"
dotenv.config({ path: "../.env" })


const key = process.env.ACCOUNT
const accounts = key ? [key] : []

const config: HardhatUserConfig = {
  networks: {
    arbitrumTestnet: {
      chainId: 421611,
      url: 'https://rinkeby.arbitrum.io/rpc',
      accounts,
    },
    arbitrum: {
      chainId: 42161,
      url: 'https://arb1.arbitrum.io/rpc',
      accounts,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
      {
        version: "0.8.1",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
    ],
  },
  etherscan: {
    apiKey: process.env.ARBISCAN,
  },
  gasReporter: {
    enabled: !!process.env.REPORT_GAS,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP,
    token: "ETH",
    gasPriceApi: "https://api.arbiscan.io/api?module=proxy&action=eth_gasPrice",
  },
}

export default config
