import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Box,
  Grid,
  Chip,
  Divider,
} from '@mui/material';
import { GateEntry, addPayment } from '@/services/gatein';
import { useTheme } from '@mui/material/styles';

// Define types
type PaymentMethod = "Cash" | "Bank Transfer" | "Cheque" | "Other";

interface InvoiceDetailProps {
  open: boolean;
  onClose: () => void;
  entry: GateEntry | null;
  onPaymentAdded: () => void;
}

interface PaymentState {
  amount: number;
  date: string;
  method: PaymentMethod;
  reference: string;
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ open, onClose, entry, onPaymentAdded }) => {
  const theme = useTheme();
  const [payment, setPayment] = useState<PaymentState>({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    method: 'Cash',
    reference: '',
  });

  const handlePaymentSubmit = async () => {
    if (!entry?._id) return;

    try {
      await addPayment(entry._id, payment);
      onPaymentAdded();
      setPayment({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        method: 'Cash',
        reference: '',
      });
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  if (!entry) return null;

  const totalPaid = entry.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = entry.totalAmount - totalPaid;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      aria-labelledby="invoice-dialog-title"
    >
      {/* Dialog Title Section */}
     <DialogTitle id="invoice-dialog-title" sx={{ pt: 3, pb: 2 }}>
  <Box>
    <Typography variant="h5" component="span" sx={{ fontSize: '1.5rem', fontWeight: 600, mb: 1, display: 'block' }}>
      Invoice #{entry.invoiceNumber}
    </Typography>
    <Typography variant="body1" color="text.secondary">
      Vendor: {entry.vendor}
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
      Date: {new Date(entry.date).toLocaleDateString('en-PK')}
    </Typography>
    <Chip
      label={entry.paymentStatus}
      color={
        entry.paymentStatus === 'Paid'
          ? 'success'
          : entry.paymentStatus === 'Partial'
          ? 'warning'
          : 'error'
      }
    />
  </Box>
</DialogTitle>

      <DialogContent dividers>
        {/* Items Section */}
        <Box mb={3}>
          <Typography variant="h6" component="div" gutterBottom>
            Items
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Unit</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entry.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">{item.units}</TableCell>
                    <TableCell align="right">{item.purchasePrice.toFixed(2)}</TableCell>
                    <TableCell align="right">{item.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} align="right">
                    <Typography fontWeight="bold">Grand Total:</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      {entry.totalAmount.toFixed(2)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Payment Summary Section */}
        <Box mb={3}>
          <Typography variant="h6" component="div" gutterBottom>
            Payment Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, backgroundColor: theme.palette.grey[100] }}>
                <Typography variant="subtitle2">Total Amount</Typography>
                <Typography variant="h6">{entry.totalAmount.toFixed(2)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, backgroundColor: theme.palette.grey[100] }}>
                <Typography variant="subtitle2">Total Paid</Typography>
                <Typography variant="h6">{totalPaid.toFixed(2)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{
                p: 2,
                backgroundColor: balance > 0 
                  ? theme.palette.error.light 
                  : theme.palette.success.light
              }}>
                <Typography variant="subtitle2">Balance</Typography>
                <Typography variant="h6">{balance.toFixed(2)}</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Payment History Section */}
        {entry.payments.length > 0 && (
          <Box mb={3}>
            <Typography variant="h6" component="div" gutterBottom>
              Payment History
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Reference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entry.payments.map((payment, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(payment.date).toLocaleDateString('en-PK')}</TableCell>
                      <TableCell>{payment.amount.toFixed(2)}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell>{payment.reference || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Add New Payment Section */}
        <Box>
          <Typography variant="h6" component="div" gutterBottom>
            Add New Payment
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={payment.amount}
                onChange={(e) => setPayment({ ...payment, amount: Number(e.target.value) })}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={payment.date}
                onChange={(e) => setPayment({ ...payment, date: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Method</InputLabel>
                <Select
                  value={payment.method}
                  onChange={(e) => setPayment({ 
                    ...payment, 
                    method: e.target.value as PaymentMethod 
                  })}
                  label="Method"
                >
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                  <MenuItem value="Cheque">Cheque</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Reference"
                value={payment.reference}
                onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          onClick={handlePaymentSubmit}
          variant="contained"
          color="primary"
          disabled={payment.amount <= 0}
        >
          Record Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceDetail;