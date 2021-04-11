export interface IChainsNetwork {
  [chainID: number]: string,
}

export const chainsID: IChainsNetwork = {
  0: "Olympic, Ethereum public pre-release PoW testnet",
  1: "Frontier, Homestead, Metropolis, the Ethereum public PoW main network",
  2: "Morden Classic, the public Ethereum Classic PoW testnet, now retired",
  3: "Ropsten, the public proof-of-work Ethereum testnet",
  4: "Rinkeby, the public Geth-only PoA testnet",
  5: "Goerli, the public cross-client PoA testnet",
  42: "Kovan, the public Parity-only PoA testnet",
  56: "Binance, the public Binance mainnet",
  97: "Binance, the public Binance testnet",
  137: "Matic, the public Matic mainnet",
  80001: "Matic, the public Matic testnet",
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
