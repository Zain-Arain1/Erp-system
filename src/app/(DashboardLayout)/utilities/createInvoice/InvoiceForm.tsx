"use client";
import React, { useState, useEffect } from "react";
import {
  Container,
  TextField,
  Autocomplete,
  Button,
  Typography,
  Grid,
  Card,
  IconButton,
  Box,
  Divider,
  Paper,
  Snackbar,
  Alert,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter } from "next/navigation";
import { useInvoiceContext } from "@/app/(DashboardLayout)/utilities/context/InvoiceContext";
import { customers } from "@/app/(DashboardLayout)/utilities/customer/customers"; // Import customer data

interface Product {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface Invoice {
  id: string;
  date: string;
  customer: string;
  dueDate: string;
  products: Product[];
  total: number;
  paid: number;
  due: number;
  status: "Paid" | "Pending" | "Overdue"; // New field for invoice status
  paymentMethod: "Cash" | "Credit Card" | "Bank Transfer"; // New field for payment method
  notes: string; // New field for notes
}

const CreateInvoice = () => {
  const router = useRouter();
  const { addInvoice } = useInvoiceContext();

  const [invoice, setInvoice] = useState<Invoice>({
    id: `INV-${Date.now()}`,
    date: "",
    customer: "",
    dueDate: "",
    products: [],
    total: 0,
    paid: 0,
    due: 0,
    status: "Pending", // Default status
    paymentMethod: "Cash", // Default payment method
    notes: "", // Default notes
  });

  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    setInvoice((prev) => ({ ...prev, id: `INV-${Date.now()}` }));
  }, []);

  const calculateTotals = (products: Product[], paid: number) => {
    const total = products.reduce((sum, p) => sum + p.quantity * p.price, 0);
    const due = total - paid;
    return { total, due };
  };

  const handleAddProduct = () => {
    setInvoice((prev) => ({
      ...prev,
      products: [...prev.products, { id: Date.now(), name: "", quantity: 1, price: 0 }],
    }));
  };

  const handleProductChange = (idx: number, key: keyof Product, value: string | number) => {
    const updatedProducts = [...invoice.products];
    (updatedProducts[idx] as any)[key] = value;
    const { total, due } = calculateTotals(updatedProducts, invoice.paid);
    setInvoice({ ...invoice, products: updatedProducts, total, due });
  };

  const handleSubmit = () => {
    if (!invoice.customer || invoice.products.length === 0 || !invoice.date) {
      alert("Please fill all required fields!");
      return;
    }

    // Prepare the invoice object to be added
    const newInvoice: Invoice = {
      ...invoice,
      status: invoice.due === 0 ? "Paid" : invoice.due > 0 ? "Pending" : "Overdue", // Explicitly typed
    };
    console.log("New Invoice Being Added:", newInvoice); // Debugging: Log the new invoice

    addInvoice(newInvoice); // Add the new invoice to the context
    setOpenSnackbar(true); // Show success message

    setTimeout(() => {
      router.push("/utilities/invoices"); // Redirect to invoices page
    }, 2000);
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, mt: 3, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Create Invoice
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={6}>
            <TextField label="Invoice ID" value={invoice.id} disabled fullWidth />
          </Grid>
          <Grid item xs={6}>
            <TextField
              type="date"
              label="Invoice Date"
              value={invoice.date}
              onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <Autocomplete
              options={customers}
              getOptionLabel={(option) => option.name}
              value={customers.find((c) => c.name === invoice.customer) || null}
              onChange={(event, newValue) => {
                setInvoice({ ...invoice, customer: newValue ? newValue.name : "" });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Customer" fullWidth required />
              )}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              type="date"
              label="Due Date"
              value={invoice.dueDate}
              onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Paid Amount"
              type="number"
              value={invoice.paid}
              onChange={(e) => {
                const paid = parseFloat(e.target.value) || 0; // Ensure valid number
                const { total, due } = calculateTotals(invoice.products, paid);
                setInvoice({ ...invoice, paid, total, due });
              }}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Payment Method"
              select
              value={invoice.paymentMethod}
              onChange={(e) => setInvoice({ ...invoice, paymentMethod: e.target.value as "Cash" | "Credit Card" | "Bank Transfer" })}
              fullWidth
            >
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Credit Card">Credit Card</MenuItem>
              <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Notes"
              value={invoice.notes}
              onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="center" mt={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddProduct}
            startIcon={<AddIcon />}
          >
            Add Product
          </Button>
        </Box>
        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" fontWeight="bold" display="flex" justifyContent="center">
          Products
        </Typography>
        {invoice.products.map((product, idx) => (
          <Card key={product.id} sx={{ my: 2, p: 2, borderRadius: 2, boxShadow: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={4}>
                <TextField
                  label="Product Name"
                  value={product.name}
                  onChange={(e) => handleProductChange(idx, "name", e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  label="Qty"
                  type="number"
                  value={product.quantity}
                  onChange={(e) => handleProductChange(idx, "quantity", parseInt(e.target.value) || 0)} // Ensure valid number
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  label="Price"
                  type="number"
                  value={product.price}
                  onChange={(e) => handleProductChange(idx, "price", parseFloat(e.target.value) || 0)} // Ensure valid number
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <IconButton
                  color="error"
                  onClick={() => {
                    setInvoice({
                      ...invoice,
                      products: invoice.products.filter((_, i) => i !== idx),
                    });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          </Card>
        ))}

        <Divider sx={{ my: 3 }} />

        {/* Invoice Summary */}
        <Card sx={{ p: 4, mt: 3, boxShadow: 4, borderRadius: 3, bgcolor: "#f4f6f8" }}>
          <Typography variant="h4" fontWeight="bold" textAlign="center" color="primary" gutterBottom>
            Invoice Summary
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography fontWeight="bold">Total:</Typography>
            <Typography fontWeight="bold" color="primary">${invoice.total.toFixed(2)}</Typography>
          </Box>

          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography fontWeight="bold">Due:</Typography>
            <Typography fontWeight="bold" color="secondary">${invoice.due.toFixed(2)}</Typography>
          </Box>
        </Card>

        <Box display="flex" justifyContent="center" mt={4}>
          <Button variant="contained" color="success" onClick={handleSubmit} size="large">
            Submit Invoice
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateInvoice;