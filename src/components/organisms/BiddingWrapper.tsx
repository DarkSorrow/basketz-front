/* eslint-disable react-hooks/exhaustive-deps */
/**
 * In order to manage a lot of token we should only load 
 */
import { useEffect, useState, ChangeEvent } from 'react'
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import Tooltip from '@material-ui/core/Tooltip';
import LoadingButton from '@material-ui/lab/LoadingButton';
import Typography from '@material-ui/core/Typography';

import { ethers } from 'ethers';
import { TableSkel } from '../atoms';
import { contractNames } from '../../contracts'
import { useWallet } from '../../providers';

interface UnderlayingToken {
  address: string
  symbol: string
  price: ethers.BigNumber
  amount: ethers.BigNumber
  angle: number
  label: string
}

interface WrapperBid {
  name: string;
  ownerAddress: string;
  tokenID: ethers.BigNumber;
  tokenPrice: ethers.BigNumber;
  premiumPrice: number;
  composition: UnderlayingToken[]
}
interface Column {
  id: 'name' | 'tokenPrice' | 'composition' | 'action';
  label: string;
  minWidth?: number;
  align?: 'right' | 'center';
  format?: (value: number) => string;
}

const columns: Column[] = [
  { id: 'name', label: 'Name', minWidth: 170 },
  {
    id: 'tokenPrice',
    label: 'Price',
    minWidth: 170,
    align: 'center',
  },
  {
    id: 'composition',
    label: 'Composition',
    minWidth: 170,
    align: 'center',
  },
  {
    id: 'action',
    label: '',
    minWidth: 170,
    align: 'center',
  },
];

const useStyles = makeStyles({
  root: {
    width: '100%',
    overflow: 'hidden',
  },
  container: {
    maxHeight: 440,
  },
  customWidth: {
    maxWidth: 500,
  },
});

export default function BiddingWrapper() {
  const classes = useStyles();
  const { provider, account, contracts, checkTx } = useWallet();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [isPending, setIsPending] = useState<boolean>(false);
  // This won't work long run because lower index could be set to sale ;o
  //const [basketzLastIdx, setBsketzLastIdx] = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [basketz, setBasketz] = useState<WrapperBid[]>([]);

  const fillOrder = async (price: ethers.BigNumber, tokenID: ethers.BigNumber, ownerAddress: string) => {
    setIsPending(true);
    try {
      const tx = await contracts.Wrapper?.cabi.fillOrder(ownerAddress, tokenID, { value: price, gasLimit: 600000 });
      checkTx(tx);
    } catch (err) {
      console.log(err);
      setIsPending(false);
    }
  }

  useEffect(() => {
    setIsLoading(true);
    const checkTokens = async () => {
      const ercWrapper = contracts.Wrapper?.cabi;
      if (ercWrapper) {
        const maxToken = await ercWrapper.totalSupply();
        const one = ethers.BigNumber.from(1);
        const myAddress = account.toLowerCase();
        const newBasketz: WrapperBid[] = [];
        for (let i = ethers.BigNumber.from(1); i.lt(maxToken); i = i.add(one)) {
          try {
            const currentIndex = await ercWrapper.tokenByIndex(i);
            const tokenAddress = await ercWrapper.ownerOf(currentIndex);
            if (tokenAddress.toLowerCase() !== myAddress) {
              const { price, onSale } = await ercWrapper.bidding(tokenAddress, currentIndex);
              if (onSale) {
                const { tokens, amounts } = await ercWrapper.wrappedBalance(currentIndex);
                const composition: UnderlayingToken[] = [];
                for (let x = 0; x < tokens.length; x++) {
                  const uSymbol = contractNames[provider?.network.chainId || 0][tokens[x]] || '';
                  composition.push({
                    address: tokens[x],
                    symbol: uSymbol,
                    price: ethers.BigNumber.from(0),
                    amount: amounts[x],
                    angle: parseInt(amounts[x].toString(), 10),
                    label: uSymbol,
                  });
                }
                newBasketz.push({
                  name: `BWRAP (${currentIndex.toString()})`,
                  ownerAddress: tokenAddress,
                  tokenID: currentIndex,
                  tokenPrice: price,
                  premiumPrice: 0,
                  composition: composition,
                })
              }
            }
          } catch (err) {
            console.log(err);
          }
        }
        setBasketz(newBasketz);
      }
      setIsLoading(false);
    }
    checkTokens();
  }, [contracts.updatedAt])

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    isLoading ? <TableSkel /> : 
    <Paper className={classes.root}>
      <TableContainer className={classes.container}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {basketz
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => {
                return (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.name}>
                    <TableCell>
                      {row.name}
                    </TableCell>
                    <TableCell align="center">
                      {ethers.utils.formatEther(row.tokenPrice)}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={'random shit descrbiing comp assets'} classes={{ tooltip: classes.customWidth }}>
                        <Typography variant="body1" gutterBottom>{row.composition.length}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <LoadingButton 
                        variant="contained"
                        color="primary"
                        pending={isPending}
                        onClick={() => fillOrder(row.tokenPrice, row.tokenID, row.ownerAddress)}
                      >
                        Fill Order
                      </LoadingButton>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={basketz.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}