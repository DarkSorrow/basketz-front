import { useState, useEffect } from 'react';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert, { Color } from '@material-ui/core/Alert';
import { makeStyles, Theme } from '@material-ui/core/styles';
import Slide, { SlideProps } from '@material-ui/core/Slide';
import {  } from '@material-ui/core/colors';
import { useWallet } from '../../providers';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    width: '100%',
    '& > * + *': {
      marginTop: theme.spacing(2),
    },
  },
  alert: {
    width: '100%',
  },
}));
type TransitionProps = Omit<SlideProps, 'direction'>;
function TransitionDown(props: TransitionProps) {
  return <Slide {...props} direction="down" />;
}

export default function TransactionSnackbars() {
  const classes = useStyles();
  const { txStatus } = useWallet();
  const [alertType, setAlertType] = useState<Color>('info');
  const [open, setOpen] = useState(false);
  const [transition, setTransition] = useState<
    React.ComponentType<TransitionProps> | undefined
  >(undefined);
  useEffect(() => {
    if (txStatus === '') {
      setOpen(false);
    } else if (txStatus.startsWith('success')) {
      setTransition(() => TransitionDown);
      setOpen(true);
      setAlertType('success');
    } else if (txStatus.startsWith('error')) {
      setTransition(() => TransitionDown);
      setOpen(true);
      setAlertType('error');
    } else {
      setTransition(() => TransitionDown);
      setOpen(true);
      setAlertType('info');
    }
  }, [txStatus]);

  const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <div className={classes.root}>
      <Snackbar 
        open={open}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        autoHideDuration={60000}
        onClose={handleClose}
        TransitionComponent={transition}
        >
        <MuiAlert elevation={6} variant="filled" onClose={handleClose} severity={alertType} className={classes.alert}>
          {txStatus}
        </MuiAlert>
      </Snackbar>
    </div>
  );
}