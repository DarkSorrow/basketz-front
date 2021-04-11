/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
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
import AdapterDateFns from '@material-ui/lab/AdapterDateFns';
import LocalizationProvider from '@material-ui/lab/LocalizationProvider';
import DateTimePicker from '@material-ui/lab/DateTimePicker';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import FingerprintIcon from '@material-ui/icons/Fingerprint';
import TrackChangesIcon from '@material-ui/icons/TrackChanges';

import { addMinutes, formatDistanceToNow } from 'date-fns'
import { createHash } from '../../utils';

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
  tokenInOrder: boolean,
}

interface IRowProps {
  row: WrapTokens
};

type DialogType = 'close' | 'transfer' | 'createOrder' | 'cancelOrder' | 'createSwap';

interface IDialogsProps {
  dialogType: DialogType
  wrapToken: WrapTokens
  handleDialogClose: () => void
}

interface ITradeProps extends IDialogsProps {
  tokenID: ethers.BigNumber
}
const isNumber = /^[0-9]+(\.)?[0-9]*$/;

const copiedTextLabel: string = '(Copied to clippboard!)';
const DialogCreateSwap = ({ wrapToken, handleDialogClose }: IDialogsProps) => {
  const { contracts, account, checkTx } = useWallet();
  const [activeStep, setActiveStep] = useState(0);
  const [contractSecret, setContractSecret] = useState<string>('');
  const [contractID, setContractID] = useState<string>('');
  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<string|null>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const [lockPeriod, setLockPeriod] = useState<Date | null>(addMinutes(new Date(), 30));
  const [copy, setCopy] = useState<string[]>(['', '']);

  const swapToken = async () => {
    setIsPending(true);
    setError(null);
    try {
      const input = addressRef.current;
      if (input && ethers.utils.isAddress(input.value)) {
        if (input.value.toLowerCase() === account.toLowerCase()) {
          setError('Nice try choose a different address than yours!');  
        } else {
          if (lockPeriod) {
            const hash = createHash();
            await contracts.Wrapper?.cabi.approve(contracts.Wrapper?.cabi.address, wrapToken.tokenID);
            const tx = await contracts.Wrapper?.cabi.newContract(
              input.value,
              hash.hash,
              lockPeriod.getTime(),
              contracts.Wrapper?.cabi.address,
              wrapToken.tokenID, { gasLimit: 600000 });
            setContractSecret(hash.secret);
            console.log('steps to validate the contract');
            console.log(hash.secret);
            const receipt = await tx.wait();
            const details = receipt.events?.filter((x: any) => { return x.event === "HTLCERC721New" });
            const contractId = details[0].args.contractId;
            console.log(contractId);
            setContractID(contractId)
            setActiveStep(1);
          }
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
  const withdrawToken = async () => {
    setIsPending(true);
    setError(null);
    try {
      const tx = await contracts.Wrapper?.cabi.withdraw(contractID, contractSecret, { gasLimit: 600000 });
      checkTx(tx);
      handleDialogClose();
      return ;
    } catch (err) {
      setError('Error trying to proceed with request');
      console.log(err);
    }
    setIsPending(false);
  }
  // Search contract button and maybe allow the secret and hash to be stored with a reversible password password?
  return (activeStep === 0) ? 
    <>
      <DialogTitle id="form-dialog-title">{wrapToken.displayName}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Swap your basketz using a contract. This is done in two step, you will need to stay on the screen or copy your secret and contract ID to finish later.
        </DialogContentText>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
        <div style={{ width: 300 }}>
          <DateTimePicker
            renderInput={(params) => (
              <TextField {...params} margin="normal" variant="standard" helperText={`Lock for ${
                (lockPeriod) ? formatDistanceToNow(lockPeriod) : 'Choose a period'
              }`} fullWidth />
            )}
            label="Locked until"
            value={lockPeriod}
            onChange={(newValue) => {
              setLockPeriod(newValue);
            }}
            minDateTime={new Date()}
          />
        </div>
        </LocalizationProvider>
        <div style={{ width: 300 }}>
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
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose}>Close</Button>
          <LoadingButton variant="contained" color="secondary" pending={isPending} onClick={swapToken}>
          Swap
        </LoadingButton> 
      </DialogActions> 
    </> : 
    <>
      <DialogTitle id="form-dialog-title">{wrapToken.displayName}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Withdraw from the contract. Write down the contractID and secret in order to withdraw from this contract later if needed.
          TODO? Store in localstorage with reversible password?
        </DialogContentText>
        <List component="nav" aria-label="Contract swap">
          <ListItem button onClick={() => {
            setCopy([copiedTextLabel, ''])
            setTimeout(() => setCopy(['', '']), 2000)
            navigator.clipboard.writeText(contractID);
          }}>
            <ListItemText primary={`Contact ID ${copy[0]}`} secondary={contractID} />
          </ListItem>
          <ListItem button onClick={() => {
            setCopy(['', copiedTextLabel])
            setTimeout(() => setCopy(['', '']), 2000)
            navigator.clipboard.writeText(contractSecret);
          }}>
            <ListItemText primary={`Contact Secret ${copy[1]}`} secondary={contractSecret} />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose}>Close</Button>
        <LoadingButton variant="contained" color="secondary" pending={isPending} onClick={withdrawToken}>
          Witdraw
        </LoadingButton> 
      </DialogActions> 
    </>
}


const DialogCancelOrder = ({ wrapToken, handleDialogClose }: IDialogsProps) => {
  const { contracts, checkTx } = useWallet();
  const [isPending, setIsPending] = useState<boolean>(false);
  const cancelOrder = async () => {
    setIsPending(true);
    try {
      const tx = await contracts.Wrapper?.cabi.cancelOrder(wrapToken.tokenID, { gasLimit: 600000 });
      checkTx(tx);
      handleDialogClose();
    } catch (err) {
      console.log(err);
      setIsPending(false);
    }
  }
  return (
    <>
      <DialogTitle id="form-dialog-title">{wrapToken.displayName}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Cancel your order, you will remove your NFT from the order list and be able to transfer or unwrap it again.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose}>Close</Button>
        <LoadingButton variant="contained" color="secondary" pending={isPending} onClick={cancelOrder}>
          Cancel order
        </LoadingButton>
      </DialogActions>
    </>
  )
}

const DialogCreateOrder = ({ wrapToken, handleDialogClose }: IDialogsProps) => {
  const { contracts, checkTx } = useWallet();
  const [isPending, setIsPending] = useState<boolean>(false);
  const [premium, setPremium] = useState<string>('0');
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isNumber.test(event.target.value)) {
      setPremium(event.target.value);
    }
  };
  const createOrder = async () => {
    setIsPending(true);
    try {
      const tx = await contracts.Wrapper?.cabi.createOrder(wrapToken.tokenID, ethers.utils.parseEther(premium), { gasLimit: 600000 });
      checkTx(tx);
      handleDialogClose();
    } catch (err) {
      console.log(err);
      setIsPending(false);
    }
  }
  return (
    <>
      <DialogTitle id="form-dialog-title">{wrapToken.displayName}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Create an order, this will lock your NFT until someone fullfill your order or you cancel it.
        </DialogContentText>
        <TextField
          label="Premium"
          value={premium}
          onChange={handleChange}
          variant="standard"
          helperText="ETH premium on your NFT"
          type="text"
          autoFocus
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose}>Close</Button>
        <LoadingButton variant="contained" color="secondary" pending={isPending} onClick={createOrder}>
          Create order
        </LoadingButton>
      </DialogActions>
    </>
  )
}

const DialogTransfer = ({ wrapToken, handleDialogClose }: IDialogsProps) => {
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
          const tx = await contracts.Wrapper?.cabi.transferFrom(account, input.value, wrapToken.tokenID, { gasLimit: 600000 });
          checkTx(tx);
          handleDialogClose();
          return ;
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
        <Button onClick={handleDialogClose}>Close</Button>
        <LoadingButton variant="contained" color="secondary" pending={isPending} onClick={transferToken}>
          Transfer
        </LoadingButton>
      </DialogActions>
    </>
  )
}

const DialogSelector = (props: IDialogsProps | ITradeProps) => {
  switch (props.dialogType) {
    case 'transfer':
      return <DialogTransfer {...props} />;
    case 'createOrder':
      return <DialogCreateOrder {...props} />;
    case 'cancelOrder':
      return <DialogCancelOrder {...props} />;
    case 'createSwap':
      return <DialogCreateSwap {...props} />;
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
  // change to a function but this recreate function all the time
  const openTransferTo = () => {
    setOpenDialog('transfer');
  };
  const openCreateOrder = () => {
    setOpenDialog('createOrder');
  };
  const openSwapOrder = () => {
    setOpenDialog('createSwap');
  };
  const openCancelOrder = () => {
    setOpenDialog('cancelOrder');
  };
  const handleDialogClose = () => {
    setOpenDialog('close');
  };
  const unwrapToken = async () => {
    setIsPending(true);
    try {
      const tx = await contracts.Wrapper?.cabi.unwrapper(row.tokenID, { gasLimit: 600000 });
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
          {row.tokenInOrder ? 
          <LoadingButton variant="contained" color="inherit" pending={isPending} onClick={openCancelOrder}>
            Cancel Order
          </LoadingButton> : 
          <Grid container direction="row" spacing={2}>
            <Grid item xs={6}>
            <LoadingButton variant="contained" color="primary" pending={isPending} onClick={unwrapToken} fullWidth>
              Unwrap
            </LoadingButton>
            </Grid>
            <Grid item xs={6}>
              <LoadingButton variant="contained" color="primary" pending={isPending} onClick={openTransferTo} fullWidth>
                Transfer
              </LoadingButton>
            </Grid>
            <Grid item xs={6}>
              <LoadingButton variant="contained" color="secondary" pending={isPending} onClick={openCreateOrder} fullWidth>
                Order
              </LoadingButton>
            </Grid>
            <Grid item xs={6}>
              <LoadingButton variant="contained" color="secondary" pending={isPending} onClick={openSwapOrder} fullWidth>
                Swap
              </LoadingButton>
            </Grid>
          </Grid>}
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
            //const basketPrice = await ercWrapper.basketPrice(account, wrapped);
            const { price, onSale } = await ercWrapper.bidding(account, wrapped);
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
              tokenInOrder: onSale,
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