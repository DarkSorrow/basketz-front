/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import LoadingButton from '@material-ui/lab/LoadingButton';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import Grid from '@material-ui/core/Grid';
import { ethers } from 'ethers';
import { PieChart } from '../molecules';
import { contractNames } from '../../contracts'
import { useWallet } from '../../providers';

const useRowStyles = makeStyles({
  root: {
    '& > *': {
      borderBottom: 'unset',
    },
  },
});

interface UnderlayingToken {
  address: string
  symbol: string
  price: ethers.BigNumber
  amount: ethers.BigNumber
  angle: number
  label: string
}

interface WrapTokens {
  symbol: string,
  tokenID: ethers.BigNumber,
  displayName: string, // symbol (tokenID)
  basketPrice: ethers.BigNumber,
  composition: UnderlayingToken[],
}

interface IProps {
  row: WrapTokens
};

function Row({ row }: IProps) {
  const [open, setOpen] = useState(false);
  const classes = useRowStyles();
  const [isPending, setIsPending] = useState<boolean>(false);
  const { contracts, checkTx } = useWallet();

  const unwrapToken = async () => {
    setIsPending(true);
    try {
      const tx = await contracts.Wrapper?.cabi.unwrapper(row.tokenID, { gasLimit: 6000000 });
      checkTx(tx);
    } catch (err) {
      console.log(err);
    }
    setIsPending(false);
  }

  const transferTo = async () => {
    setIsPending(true);
    try {
      console.log("display transfor to form")
    } catch (err) {
      console.log(err);
    }
    setIsPending(false);
  }
  // useEffect when open is true setTimer will get information about the price from outside feed
  return (
    <>
      <TableRow className={classes.root}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {row.displayName}
        </TableCell>
        <TableCell align="center">{ethers.utils.formatEther(row.basketPrice)}</TableCell>
        <TableCell padding="none">
          <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            <PieChart data={row.composition} />
          </Grid>
        </TableCell>
        <TableCell align="center">
          <Grid container direction="row" justifyContent="space-between" alignItems="center">
            <LoadingButton variant="contained" color="primary" pending={isPending} onClick={unwrapToken}>
              Unwrap
            </LoadingButton>
            <LoadingButton variant="contained" color="secondary" pending={isPending} onClick={transferTo}>
              Transfer
            </LoadingButton>
          </Grid>
        </TableCell>
        <TableCell>

        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Composition
              </Typography>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell>Contract</TableCell>
                    <TableCell align="center">Symbol</TableCell>
                    <TableCell align="center">Amount</TableCell>
                    <TableCell align="center">Price</TableCell>
                    <TableCell align="center">- / + Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.composition.map((uToken) => (
                    <TableRow key={`${uToken.address}-${row.tokenID.toString()}`}>
                      <TableCell component="th" scope="row">
                        {uToken.address}
                      </TableCell>
                      <TableCell align="center">{uToken.symbol}</TableCell>
                      <TableCell align="center">{ethers.utils.formatEther(uToken.amount)}</TableCell>
                      <TableCell align="center">{ethers.utils.formatEther(uToken.price)}</TableCell>
                      <TableCell align="center">
                        N/A
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function WrapperOwnedList() {
  const { provider, account, contracts } = useWallet();
  const [ wrapperOwned, setWrapperOwned ] = useState<WrapTokens[]>([]);

  const listOwnedToken = async () => {
    const ercWrapper = contracts.Wrapper?.cabi;
    const tokensId = new Set<ethers.BigNumber>();
    if (ercWrapper) {
      let tLogs = await ercWrapper.queryFilter(
        ercWrapper.filters.Transfer(account, null),
      );
      tLogs = tLogs.concat(await ercWrapper.queryFilter(
        ercWrapper.filters.Transfer(null, account),
      ));
      const logs = tLogs.sort((a, b) =>
          a.blockNumber - b.blockNumber ||
          a.transactionIndex - b.transactionIndex,
      );
      const checkAccount = account.toLowerCase();
      
      for (const log of logs) {
        if (log.args) {
          const { from, to, tokenId } = log.args;
          if (to.toLowerCase() === checkAccount) {
            tokensId.add(tokenId);
          } else if (from.toLowerCase() === checkAccount) {
            tokensId.delete(tokenId);
          }
        }
      }
    }
    return tokensId;
  }

  useEffect(() => {
    const initTokens = async () => {
      //function wrappedBalance(uint256 _wrapId)
      const tokenOwned: Set<ethers.BigNumber> = await listOwnedToken();
      const symbol = 'BWRAP';
      const wrapTokens: WrapTokens[] = [];
      const ercWrapper = contracts.Wrapper?.cabi;
      if (ercWrapper) {
        for (const wrapped of Array.from(tokenOwned)) {
          try {
            const price = await ercWrapper.basketPrice(account, wrapped);
            const { tokens, amounts } = await ercWrapper.wrappedBalance(wrapped);
            const composition: UnderlayingToken[] = [];
            for (let i = 0; i < tokens.length; i++) {
              const uSymbol = contractNames[provider?.network.chainId || 0][tokens[i]] || '';
              composition.push({
                address: tokens[i],
                symbol: uSymbol,
                price: ethers.BigNumber.from(0),
                amount: amounts[i],
                angle: parseInt(amounts[i].toString(), 10),
                label: uSymbol,
              });
            }
            wrapTokens.push({
              symbol,
              tokenID: wrapped,
              displayName: `${symbol} (${wrapped.toString()})`, // symbol (tokenID)
              basketPrice: price,
              composition: composition,
            });
          } catch (err) {
            console.log('error in asking basket prices');
            console.log(err);
          }
        }
      }
      setWrapperOwned(wrapTokens);
    };
    initTokens();
  }, [contracts.updatedAt]);
  return (
    <TableContainer component={Paper}>
      <Table aria-label="collapsible table">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Token</TableCell>
            <TableCell align="center">Price</TableCell>
            <TableCell align="center">Composition</TableCell>
            <TableCell sx={{width: 250}} />
            <TableCell padding="none" sx={{width: 5}}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {wrapperOwned.map((row) => (
            <Row key={row.displayName} row={row} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}