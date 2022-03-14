
import '@nomiclabs/hardhat-etherscan'
import 'hardhat-contract-sizer'
import '@typechain/hardhat'
import '@nomiclabs/hardhat-waffle'
import { HardhatUserConfig } from "hardhat/config"
import dotenv from "dotenv"
dotenv.config({ path: '../.env' })

const key = process.env.ACCOUNT
const accounts = key ? [key] : []

const config: HardhatUserConfig = {
  networks: {
    arbitrumTestnet: {
      url: 'https://rinkeby.arbitrum.io/rpc',
      accounts
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts
    },
  },
  solidity: {
    version: "0.8.1",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  etherscan: {
    apiKey: process.env.ARBISCAN
  }
}

export default config
