/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useMemo, useEffect, useContext, useReducer } from 'react';
import { ethers } from "ethers";
import { tokensList, abis } from '../contracts';
/*interface ProviderInformation {
  provider: ethers.providers.JsonRpcProvider | ethers.providers.Web3Provider | null
  signer: ethers.providers.JsonRpcSigner | null
}*/

export interface ContractInfo {
  name: string;
  cabi: ethers.Contract;
}

export interface ContractList {
  isLoaded: boolean,
  updatedAt: Date,
  MockA: ContractInfo | null,
  MockB: ContractInfo | null,
  Wrapper: ContractInfo | null,
  SupportedToken: ContractInfo[],
}

const initContractList: ContractList = {
  isLoaded: false,
  updatedAt: new Date(),
  MockA: null,
  MockB: null,
  Wrapper: null,
  SupportedToken: [],
};

interface WalletState /*extends ProviderInformation*/ {
  provider: ethers.providers.JsonRpcProvider | ethers.providers.Web3Provider | null
  signer: ethers.providers.JsonRpcSigner | null
  listAccount: string[]
  account: string
  status: 'idle' | 'signOut' | 'signIn'
  contracts: ContractList
  txStatus: string
}
//type WalletAction = { type: 'SIGN_IN'; token: string } | { type: 'SIGN_OUT' }
type WalletAction = 
  { 
    type: 'SIGN_IN',
    provider: ethers.providers.JsonRpcProvider,
    signer: ethers.providers.JsonRpcSigner | null,
    listAccount: string[],
  } |
  { type: 'SIGN_OUT' } |
  { type: 'LOAD_ACCOUNT', contracts: ContractList } |
  { type: 'TRANSACTION_START', txStatus: string } |
  { type: 'TRANSACTION_DONE', txStatus: string };;

interface WalletContextActions {
  signIn: () => void
  signOut: () => void
  checkTx: (transaction: any) => void
}
interface WalletContextType extends WalletState, WalletContextActions {};

const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  account: '',
  listAccount: [],
  contracts: {...initContractList},
  status: 'idle',
  txStatus: '',
  signIn: () => {},
  signOut: () => {},
  checkTx: (transaction: any) => {},
});

/*interface test {
  status: boolean,
  transactionHash: string
  gasUsed: ethers.BigNumber
}

function sleep(ms: number): Promise<test> {
  return new Promise(resolve => setTimeout(resolve, ms, { status: false, transactionHash: 'test', gasUsed: ethers.BigNumber.from(0)}));
}*/

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  let timer: NodeJS.Timeout | null = null;
  const [state, dispatch] = useReducer(WalletReducer, {
    provider: null,
    signer: null,
    listAccount: [],
    contracts: {...initContractList},
    account: '',
    status: 'idle',
    txStatus: '',
  });

  /**provider.on("block", () => { const b = await provider.getBalance(addr); if (b.ne(balance)) { doStuff(); balance = b; } }); */
  useEffect(() => {
    const initContracts = async () => {
      try {
        const contracts: ContractList = {...initContractList};
        contracts.SupportedToken = [];
        if (state.account && state.provider) {
          // maybe make the difference from the start between mock tokens
          const networkTokens = tokensList[state.provider.network.chainId]
          if (networkTokens) {
            for (const token of networkTokens) {
              // Create contract info
              const contract: ContractInfo = {
                name: token.name,
                cabi: new ethers.Contract(token.address, abis[token.abi], state.signer || state.provider),
              }
              if (token.abi === 'ercWrapper') {
                contracts.Wrapper = contract;
              } else {
                if (token.abi === 'mockTokenA') {
                  contracts.MockA = contract;
                } else if (token.abi === 'mockTokenB') {
                  contracts.MockB = contract;
                }
                contracts.SupportedToken.push(contract);
              }
            }
          }
        }
        contracts.isLoaded = true;
        contracts.updatedAt = new Date();
        dispatch({ type: 'LOAD_ACCOUNT', contracts });
      } catch (err) {
        console.log(err);
        // catch error here
        // Maybe sign_out user!
      }
    }
    initContracts()
  }, [state.account]);

  const getNetwork = (newProvider: ethers.providers.JsonRpcProvider) => new Promise((resolve, reject) => {
    const timeOut = setTimeout(reject, 2000, 'request timed out');
    newProvider.on("network", (newNetwork: ethers.providers.Network, oldNetwork: ethers.providers.Network | null ) => {
      if (oldNetwork) {
          window.location.reload();
      }
      clearTimeout(timeOut);
      resolve(newNetwork);
    });
  });

  // Todo catch error and dispatch error on login
  const WalletActions: WalletContextActions = useMemo(
    () => ({
      signIn: async () => {
        const provider = new ethers.providers.Web3Provider((window as any).web3.currentProvider);
        const signer = provider.getSigner();
        await getNetwork(provider);
        const listAccount = await provider.listAccounts();
        dispatch({ type: 'SIGN_IN' , provider, signer, listAccount });
      },
      signOut: async () => {
        dispatch({ type: 'SIGN_OUT' });
      },
      checkTx: async (transaction: any) => {
        try {
          if (transaction.wait) {
            dispatch({ type: 'TRANSACTION_START', txStatus: `transaction ${transaction.hash} with ${
              ethers.utils.formatEther(transaction.gasPrice)
            } ETH and ${
              ethers.utils.formatEther(transaction.gasLimit)
            } ETH limit` });
            const rcpt = await transaction.wait();
            if (timer) {
              clearTimeout(timer);
            }
            const resultString = `${rcpt.transactionHash} with ${ethers.utils.formatEther(rcpt.gasUsed)} ETH used.`;
            timer = setTimeout(function timeout() {
              if (rcpt.status === 1) {
                dispatch({ type: 'TRANSACTION_DONE', txStatus: `success: ${resultString}` });
              } else {
                dispatch({ type: 'TRANSACTION_DONE', txStatus: `error: ${resultString}` });
              }  
            }, 2000)
          }
        } catch (err) {
          dispatch({ type: 'TRANSACTION_DONE', txStatus: `error: transaction failed with a server error.` });
          console.log('inside check transaction from wallet');
          console.log(err);
        }
      },
    }),
    []
  )
  return (
    <WalletContext.Provider value={{ ...state, ...WalletActions }}>
      {children}
    </WalletContext.Provider>
  )
}
const WalletReducer = (prevState: WalletState, action: WalletAction): WalletState => {
  switch (action.type) {
    case 'SIGN_IN':
      return {
        ...prevState,
        status: 'signIn',
        listAccount: action.listAccount,
        account: action.listAccount[0],
        provider: action.provider,
        signer: action.signer,
      }
    case 'SIGN_OUT':
      prevState.provider?.removeAllListeners();
      return {
        ...prevState,
        status: 'signOut',
        listAccount: [],
        contracts: {...initContractList},
        account: '',
        provider: null,
        signer: null,
      }
    case 'LOAD_ACCOUNT':
      return {
        ...prevState,
        contracts: action.contracts,
        txStatus: '',
      }
    case 'TRANSACTION_START':
      console.log('transaction dispatch made');
      return {
        ...prevState,
        txStatus: action.txStatus,
      }
    case 'TRANSACTION_DONE':
      console.log('transaction dispatch made');
      return {
        ...prevState,
        contracts: {
          ...prevState.contracts,
          updatedAt: new Date(),
        },
        txStatus: action.txStatus,
      }
  }
}

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be inside an WalletProvider with a value')
  }
  /*
    you can add more drived state here
    const isLoggedIn  = context.status ==== 'signIn'
    return ({ ...context, isloggedIn})
  */
  return context
}
