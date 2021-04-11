export interface IChainsNetwork {
  [chainID: number]: string,
}

export const chainsID: IChainsNetwork = {
  0: "Error not supported",
  1: "Ethereum Mainnet",
  2: "Morden Classic",
  3: "Ropsten",
  4: "Rinkeby",
  5: "Goerli",
  42: "Kovan",
  56: "Binance Mainnet",
  97: "Binance Testnet",
  137: "Matic Mainnet",
  80001: "Matic Testnet",
};

interface ExplorerName {
  explorer: (transaction: string) => string;
}

interface ExplorerNames {
  [chainID: number]: ExplorerName;
}

export const networkInfo: ExplorerNames = {
  1: {//Rinkeby
    explorer: (transcation: string) => `https://etherscan.io/tx/`,
  },
  4: {//Rinkeby
    explorer: (transcation: string) => `https://rinkeby.etherscan.io/tx/`,
  },
  42: {//Kovan
    explorer: (transcation: string) => `https://kovan.etherscan.io/tx/`,
  },
  56: {//Binance
    explorer: (transcation: string) => `https://bscscan.com/tx/`,
  },
  97: {//Binance testnet
    explorer: (transcation: string) => `https://testnet.bscscan.com/tx`,
  },
  137: {//Matic
    explorer: (transcation: string) => `https://explorer-mainnet.maticvigil.com/tx/`,
  },
  80001: {//Matic test
    explorer: (transcation: string) => `https://mumbai-explorer.matic.today/tx/`,
  },
}
