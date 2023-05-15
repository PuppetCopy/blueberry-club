


export enum CHAIN {
  ETH = 1,
  ETH_ROPSTEN = 3,
  ETH_KOVAN = 42,
  ETH_RINKBY = 4,
  ETH_GOERLI = 5,

  BSC = 56,
  BSC_TESTNET = 97,

  ARBITRUM = 42161,
  ARBITRUM_RINKBY = 421611,
  AVALANCHE = 43114
}



export const EXPLORER_URL = {
  [CHAIN.ETH]: "https://etherscan.io/",
  [CHAIN.ETH_KOVAN]: "https://kovan.etherscan.io/",
  [CHAIN.ETH_ROPSTEN]: "https://ropsten.etherscan.io/",
  [CHAIN.ETH_RINKBY]: "https://rinkeby.etherscan.io/",
  [CHAIN.ETH_GOERLI]: "https://goerli.etherscan.io/",

  [CHAIN.BSC]: "https://bscscan.com/",
  [CHAIN.BSC_TESTNET]: "https://testnet.bscscan.com/",

  [CHAIN.ARBITRUM]: "https://arbiscan.io/",
  [CHAIN.ARBITRUM_RINKBY]: "https://testnet.arbiscan.io/",
  [CHAIN.AVALANCHE]: "https://snowtrace.io/",
}



export interface AddEthereumChainParameter {
  chainId: string; // A 0x-prefixed hexadecimal string
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string; // 2-6 characters long
    decimals: 18;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[]; // Currently ignored.
}


export const NETWORK_METADATA: { [k: string]: AddEthereumChainParameter } = {

  [CHAIN.ETH]: {
    chainName: 'Ethereum',
    chainId: '0x' + CHAIN.ETH.toString(16),
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: [EXPLORER_URL[CHAIN.ETH]],
    rpcUrls: ["https://api.infura.io/v1/jsonrpc/mainnet"],
  },
  [CHAIN.ETH_ROPSTEN]: {
    chainName: 'Ropsten Testnet',
    chainId: '0x' + CHAIN.ETH_ROPSTEN.toString(16),
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: [EXPLORER_URL[CHAIN.ETH_ROPSTEN]],
    rpcUrls: ["https://eth-ropsten.alchemyapi.io/v2/lQJmbKMHodW3eT3FdEQdkzk5S6gQ5-Lh"],
  },

  [CHAIN.BSC]: {
    chainId: '0x' + CHAIN.BSC.toString(16),
    chainName: 'BNB Chain',
    nativeCurrency: {
      name: 'BNB Coin',
      symbol: 'BNB',
      decimals: 18
    },
    rpcUrls: ["https://bsc-dataseed.binance.org", "https://bsc-dataseed1.defibit.io", "https://bsc-dataseed1.ninicoin.io", "https://bsc-dataseed2.defibit.io", "https://bsc-dataseed3.defibit.io", "https://bsc-dataseed4.defibit.io", "https://bsc-dataseed2.ninicoin.io", "https://bsc-dataseed3.ninicoin.io", "https://bsc-dataseed4.ninicoin.io", "https://bsc-dataseed1.binance.org", "https://bsc-dataseed2.binance.org", "https://bsc-dataseed3.binance.org", "https://bsc-dataseed4.binance.org"],
    blockExplorerUrls: ['https://bscscan.com'],
  },
  [CHAIN.BSC_TESTNET]: {
    chainId: '0x' + CHAIN.BSC_TESTNET.toString(16),
    chainName: 'BSC Testnet',
    nativeCurrency: {
      name: 'BNB Coin',
      symbol: 'BNB',
      decimals: 18
    },
    rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
    blockExplorerUrls: ["https://testnet.bscscan.com/"],
  },
  [CHAIN.ARBITRUM_RINKBY]: {
    chainId: '0x' + CHAIN.ARBITRUM_RINKBY.toString(16),
    chainName: "Arbitrum Testnet",
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ["https://rinkeby.arbitrum.io/rpc"],
    blockExplorerUrls: [EXPLORER_URL[CHAIN.ARBITRUM_RINKBY]],
  },
  [CHAIN.ARBITRUM]: {
    chainName: 'Arbitrum',
    chainId: '0x' + CHAIN.ARBITRUM.toString(16),
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: [EXPLORER_URL[CHAIN.ARBITRUM]],
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
  },
  [CHAIN.AVALANCHE]: {
    chainId: '0x' + CHAIN.AVALANCHE.toString(16),
    chainName: 'Avalanche',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18
    },
    rpcUrls: [
      "https://api.avax.network/ext/bc/C/rpc"
    ],
    blockExplorerUrls: [EXPLORER_URL[CHAIN.AVALANCHE]],
  },
}

