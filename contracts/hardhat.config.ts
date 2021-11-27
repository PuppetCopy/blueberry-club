
import '@nomiclabs/hardhat-etherscan'
import 'hardhat-contract-sizer'
import '@typechain/hardhat'
import '@nomiclabs/hardhat-waffle'
import { HardhatUserConfig } from "hardhat/config"
import dotenv from "dotenv"
dotenv.config({ path: '../.env' })


const ROPSTEN_RPC_URL = process.env.ROPSTEN_RPC_URL
const ETHERSCAN_APIKEY = process.env.ETHERSCAN_APIKEY

const devkey = process.env.DEV_KEY
const accounts = devkey ? [devkey] : []


// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  networks: {
    arbitrumTestnet: {
      url: 'https://rinkeby.arbitrum.io/rpc',
      // gasPrice: 10000000000,
      // chainId: 421611,
      accounts
    },
    ropsten: {
      url: ROPSTEN_RPC_URL || '',
      accounts
    }
    //   arbitrumTestnet: {
    //     url: ARBITRUM_TESTNET_URL,
    //     gasPrice: 10000000000,
    //     chainId: 421611,
    //     accounts: [ARBITRUM_TESTNET_DEPLOY_KEY]
    //   },
    //   arbitrum: {
    //     url: ARBITRUM_URL,
    //     gasPrice: 30000000000,
    //     chainId: 42161,
    //     accounts: [ARBITRUM_DEPLOY_KEY]
    //   },
    //   polygon: {
    //     url: POLYGON_URL,
    //     gasPrice: 100000000000,
    //     chainId: 137,
    //     accounts: [POLYGON_DEPLOY_KEY]
    //   },
    //   mainnet: {
    //     url: MAINNET_URL,
    //     gasPrice: 50000000000,
    //     accounts: [MAINNET_DEPLOY_KEY]
    //   }
    // },
    // etherscan: {
    //   apiKey: BSCSCAN_API_KEY
  },
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1
      }
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_APIKEY
  }
}

export default config
