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

interface Data {
  invoice: number;
  customer: string;
  total: number;
  units: string;
  quantity: number;
  purchaseprice: number;
  paymentStatus: "Paid" | "Overdue" | "Pending";
  date: string; // Added date field
  vendor: string; // Added from field
}

interface ProductProps {
  onSubmit: (
    customer: string,
    total: number,
    units: string,
    quantity: number,
    purchaseprice: number,
    paymentStatus: "Paid" | "Overdue" | "Pending",
    date: string, // Added date parameter
    vendor: string // Added from parameter
  ) => void;
  onCancel: () => void;
  initialData?: Data | null; // Make initialData optional
}

const Product: React.FC<ProductProps> = ({ onSubmit, onCancel, initialData }) => {
  const [customer, setCustomer] = useState<string>("");
  const [total, setTotal] = useState<number>(0);
  const [units, setUnits] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(0);
  const [purchaseprice, setpurchaseprice] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<"Paid" | "Overdue" | "Pending">("Paid");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]); // Default to today's date
  const [vendor, setvendor] = useState<string>(""); // Added from state

  useEffect(() => {
    if (initialData) {
      setCustomer(initialData.customer);
      setTotal(initialData.total);
      setUnits(initialData.units);
      setQuantity(initialData.quantity);
      setpurchaseprice(initialData.purchaseprice);
      setPaymentStatus(initialData.paymentStatus);
      setDate(initialData.date);
      setvendor(initialData.vendor); // Initialize from field
    }
  }, [initialData]);

  useEffect(() => {
    // Calculate total whenever quantity or purchaseprice changes
    setTotal(quantity * purchaseprice);
  }, [quantity, purchaseprice]);

  const handleSubmit = () => {
    if (
      !customer ||
      total <= 0 ||
      units === "" ||
      quantity <= 0 ||
      purchaseprice <= 0 ||
      !paymentStatus ||
      !vendor // Ensure from field is filled
    ) {
      alert("Please fill all fields correctly.");
      return;
    }
    onSubmit(customer, total, units, quantity, purchaseprice, paymentStatus, date, vendor);
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
                label="Purchase Price"
                type="number"
                variant="outlined"
                value={purchaseprice}
                onChange={(e) => setpurchaseprice(parseFloat(e.target.value))}
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
                disabled // Disable the total field as it is calculated automatically
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
                label="Vendor"
                variant="outlined"
                value={vendor}
                onChange={(e) => setvendor(e.target.value)}
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