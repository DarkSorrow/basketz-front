/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
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
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';

import { ethers } from 'ethers';
import { TableSkel } from '../atoms';
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

interface IRowProps {
  row: WrapTokens
};

type DialogType = 'close' | 'transfer';

interface IDialogsProps {
  dialogType: DialogType
  wrapToken: WrapTokens
  handleDialogClose: () => void
}

interface ITransferProps extends IDialogsProps {
  test?: string
}

interface ITradeProps extends IDialogsProps {
  tokenID: ethers.BigNumber
}

const DialogTransfer = ({ wrapToken, handleDialogClose }: ITransferProps) => {
  const { contracts, account, checkTx } = useWallet();
  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<string|null>(null);
  const addressRef = useRef<HTMLInputElement>(null)
  const transferToken = async () => {
    setIsPending(true);
    setError(null);
    try {
      const input = addressRef.current;
      if (input && ethers.utils.isAddress(input.value)) {
        if (input.value.toLowerCase() === account.toLowerCase()) {
          setError('Nice try choose a different address than yours!');  
        } else {
          const tx = await contracts.Wrapper?.cabi.transferFrom(account, input.value, wrapToken.tokenID, { gasLimit: 6000000 });
          checkTx(tx);
          handleDialogClose();
        }
      } else {
        setError('Address format is incorrect');
      }
    } catch (err) {
      setError('Error trying to proceed with request');
      console.log(err);
    }
    setIsPending(false);
  }
  return (
    <>
      <DialogTitle id="form-dialog-title">{wrapToken.displayName}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Transfer the ownership of the token to another address.
        </DialogContentText>
        <TextField
          error={error !== null}
          helperText={error}
          autoFocus
          inputRef={addressRef}
          margin="dense"
          id="transfer-address"
          label="Transfer to"
          type="text"
          fullWidth
          variant="standard"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose}>Cancel</Button>
        <LoadingButton variant="contained" color="secondary" pending={isPending} onClick={transferToken}>
          Transfer
        </LoadingButton>
      </DialogActions>
    </>
  )
}

const DialogSelector = (props: ITransferProps | ITradeProps) => {
  switch (props.dialogType) {
    case 'transfer':
      return <DialogTransfer {...props} />;
    default:
      return null
  }
}

function Row({ row }: IRowProps) {
  const [open, setOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState<DialogType>('close');
  const classes = useRowStyles();
  const [isPending, setIsPending] = useState<boolean>(false);
  const { contracts, checkTx } = useWallet();
  const openTransferTo = () => {
    setOpenDialog('transfer');
  };
  const handleDialogClose = () => {
    setOpenDialog('close');
  };
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
            <LoadingButton variant="contained" color="secondary" pending={isPending} onClick={openTransferTo}>
              Transfer
            </LoadingButton>
          </Grid>
        </TableCell>
        <TableCell>
          <Dialog open={openDialog !== 'close'} onClose={handleDialogClose} aria-labelledby="form-dialog-title">
            <DialogSelector dialogType={openDialog} wrapToken={row} handleDialogClose={handleDialogClose} />
          </Dialog>
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

interface AssetsOwned {
  wrap: WrapTokens[];
  isLoading: boolean;
}

export default function WrapperOwnedList() {
  const { provider, account, contracts } = useWallet();
  const [ assets, setAssets ] = useState<AssetsOwned>({
    wrap: [],
    isLoading: true,
  });

  const listOwnedToken = async () => {
    const ercWrapper = contracts.Wrapper?.cabi;
    const tokensId = new Set<string>();
    if (ercWrapper) {
      const fromLogs = await ercWrapper.queryFilter(
        ercWrapper.filters.Transfer(account, null),
      );
      const sentLogs = await ercWrapper.queryFilter(
        ercWrapper.filters.Transfer(null, account),
      );
      const logs = fromLogs.concat(sentLogs).sort((a, b) =>
          a.blockNumber - b.blockNumber ||
          a.transactionIndex - b.transactionIndex,
      );
      const checkAccount = account.toLowerCase();
      for (let i = 0; i < logs.length; i++) {
        if (logs[i] && logs[i].args) {
          // const { from, to, tokenId } = logs[i].args;
          if (logs[i].args?.to.toLowerCase() === checkAccount) {
            tokensId.add(logs[i].args?.tokenId.toString());
          } else if (logs[i].args?.from.toLowerCase() === checkAccount) {
            tokensId.delete(logs[i].args?.tokenId.toString());
          }
        }
      }
    }
    return tokensId;
  }

  useEffect(() => {
    setAssets({
      wrap: [],
      isLoading: true,
    });
    const initTokens = async () => {
      const tokenOwned: Set<string> = await listOwnedToken();
      const symbol = 'BWRAP';
      const wrapTokens: WrapTokens[] = [];
      const ercWrapper = contracts.Wrapper?.cabi;
      if (ercWrapper) {
        for (const tokenSID of Array.from(tokenOwned)) {
          const wrapped = ethers.BigNumber.from(tokenSID)
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
      setAssets({
        wrap: wrapTokens,
        isLoading: false,
      });
    };
    initTokens();
    return () => {
      console.log(assets);
    }
  }, [contracts.updatedAt]);

  if (assets.isLoading === true) {
    return <TableSkel />;
  }
  return (
    assets.isLoading ? 
    <TableSkel /> : 
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
          {assets.wrap.map((row) => (
            <Row key={row.displayName} row={row} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}