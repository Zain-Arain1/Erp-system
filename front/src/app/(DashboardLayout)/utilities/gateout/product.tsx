/* The above code is a TypeScript React component that represents a form for creating or editing
product entries. It includes input fields for various product details such as item name, units,
quantity, sale price, total amount, date, customer, and payment status. The component uses
Material-UI components for styling and layout. */
import React, { useState, useEffect } from "react";
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
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import { GateOutEntry } from "@/services/gateoutservices";

interface ProductProps {
  onSubmit: (
    customer: string,
    total: number,
    units: string,
    quantity: number,
    saleprice: number,
    paymentStatus: "Paid" | "Overdue" | "Pending",
    date: string,
    from: string
  ) => void;
  onCancel: () => void;
  initialData?: GateOutEntry | null;
}

const Product: React.FC<ProductProps> = ({ onSubmit, onCancel, initialData }) => {
  const [customer, setCustomer] = useState<string>("");
  const [total, setTotal] = useState<number>(0);
  const [units, setUnits] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(0);
  const [saleprice, setSaleprice] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<"Paid" | "Overdue" | "Pending">("Paid");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [from, setFrom] = useState<string>("");

  useEffect(() => {
    if (initialData) {
      setCustomer(initialData.customer);
      setTotal(initialData.total);
      setUnits(initialData.units);
      setQuantity(initialData.quantity);
      setSaleprice(initialData.saleprice);
      setPaymentStatus(initialData.paymentStatus);
      setDate(initialData.date);
      setFrom(initialData.from);
    }
  }, [initialData]);

  useEffect(() => {
    setTotal(quantity * saleprice);
  }, [quantity, saleprice]);

  const handleSubmit = () => {
    if (
      !customer ||
      total <= 0 ||
      units === "" ||
      quantity <= 0 ||
      saleprice <= 0 ||
      !paymentStatus ||
      !from
    ) {
      alert("Please fill all fields correctly.");
      return;
    }
    onSubmit(customer, total, units, quantity, saleprice, paymentStatus, date, from);
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h4" align="center">
          {initialData ? "Edit Product" : "Create New Product"}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Item"
                variant="outlined"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Units"
                variant="outlined"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                variant="outlined"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value))}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sale Price"
                type="number"
                variant="outlined"
                value={saleprice}
                onChange={(e) => setSaleprice(parseFloat(e.target.value))}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Total Amount"
                type="number"
                variant="outlined"
                value={total}
                disabled
                required
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                variant="outlined"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Customer"
                variant="outlined"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={paymentStatus}
                  onChange={(e) =>
                    setPaymentStatus(e.target.value as "Paid" | "Overdue" | "Pending")
                  }
                  label="Payment Status"
                  required
                >
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Overdue">Overdue</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                </Select>
              </FormControl>
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

export default Product;