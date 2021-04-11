import Box from '@material-ui/core/Box';
import Skeleton from '@material-ui/core/Skeleton';

export const TableSkel = () => {
  return (
    <Box sx={{ minWidth: 300 }}>
      <Skeleton />
      <Skeleton animation="wave" />
      <Skeleton animation={false} />
    </Box>
  );
}