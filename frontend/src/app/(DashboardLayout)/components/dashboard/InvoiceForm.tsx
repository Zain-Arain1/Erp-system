


import React, { useState, useEffect } from 'react';
  // Adjust the import path accordingly

import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
interface Data {
    invoice: number;
    customer: string;
    total: number;
    due: number;
    paidamount: number;
  }
interface InvoiceFormProps {
  onSubmit: (customer: string, total: number, due: number, paid: number) => void;
  onCancel: () => void;
  initialData?: Data | null;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [customer, setCustomer] = useState<string>('');
  const [total, setTotal] = useState<number>(0);
  const [paid, setPaid] = useState<number>(0);
  const [due, setDue] = useState<number>(0);

  useEffect(() => {
    if (initialData) {
      setCustomer(initialData.customer);
      setTotal(initialData.total);
      setPaid(initialData.paidamount);
      setDue(initialData.due);
    }
  }, [initialData]);

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTotal = parseFloat(e.target.value);
    setTotal(newTotal);
    setDue(newTotal - paid);
  };

  const handlePaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPaid = parseFloat(e.target.value);
    setPaid(newPaid);
    setDue(total - newPaid);
  };

  const handleSubmit = () => {
    if (!customer || total <= 0 || paid < 0 || due < 0) {
      alert('Please fill all fields correctly.');
      return;
    }
    onSubmit(customer, total, due, paid);
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h4" align="center">
          {initialData ? 'Edit Invoice' : 'Create New Invoice'}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Customer Name"
                variant="outlined"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Total Amount"
                type="number"
                variant="outlined"
                value={total}
                onChange={handleTotalChange}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Paid Amount"
                type="number"
                variant="outlined"
                value={paid}
                onChange={handlePaidChange}
                required
                inputProps={{ min: 0, max: total }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Due Amount"
                type="number"
                variant="outlined"
                value={due}
                disabled
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceForm;