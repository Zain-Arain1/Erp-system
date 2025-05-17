/* This TypeScript React code defines a component called `CreateInvoice` that allows users to create a
new invoice. Here is a breakdown of what the code is doing: */
"use client";
import React, { useState, useEffect, useRef } from "react";
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
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemIcon,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import { useRouter } from "next/navigation";
import { useInvoiceContext } from "@/app/(DashboardLayout)/utilities/context/InvoiceContext";
import { useCustomerContext } from "@/app/(DashboardLayout)/utilities/context/CustomerContext";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PersonIcon from "@mui/icons-material/Person";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PaymentIcon from "@mui/icons-material/Payment";
import NotesIcon from "@mui/icons-material/Notes";

interface Product {
  id: string | number;
  name: string;
  quantity: number;
  price: number;
}

interface Customer {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Invoice {
  id: string;
  date: string;
  customer: string;
  customerDetails: Customer | null;
  customerId: string;
  dueDate: string;
  products: Product[];
  subtotal: number;
  total: number;
  paid: number;
  due: number;
  status: "Paid" | "Pending" | "Overdue";
  paymentMethod: "Cash" | "CreditCard" | "BankTransfer";
  notes: string;
}

const CreateInvoice = () => {
  const router = useRouter();
  const theme = useTheme();
  const { addInvoice, refreshInvoices } = useInvoiceContext();
  const { customers } = useCustomerContext();
  const productNameRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { invoices } = useInvoiceContext();

  const generateInvoiceNumber = () => {
    // Get the latest invoice number from the context
    if (invoices.length > 0) {
      // Find the highest invoice number
      const latestInvoice = invoices.reduce((prev, current) => {
        const prevNum = parseInt((prev.invoiceNumber || prev.id).replace('INV-', ''));
        const currentNum = parseInt((current.invoiceNumber || current.id).replace('INV-', ''));
        return prevNum > currentNum ? prev : current;
      });
      
      const latestNumber = parseInt((latestInvoice.invoiceNumber || latestInvoice.id).replace('INV-', ''));
      return `INV-${latestNumber + 1}`;
    }
    // If no invoices exist yet, start with 1000
    return `INV-1000`;
  };

  const [invoice, setInvoice] = useState<Invoice>({
    id: generateInvoiceNumber(),
    date: new Date().toISOString().split('T')[0],
    customer: "",
    customerDetails: null,
    customerId: "",
    dueDate: "",
    products: [],
    subtotal: 0, 
    total: 0,
    paid: 0,
    due: 0,
    status: "Pending",
    paymentMethod: "Cash",
    notes: "",
  });

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [focusedField, setFocusedField] = useState<{
    type: 'price' | 'quantity' | 'paid';
    index?: number;
  } | null>(null);

  const calculateTotals = (products: Product[], paid: number) => {
    const subtotal = parseFloat(products.reduce((sum, p) => sum + (p.quantity * p.price), 0).toFixed(2));
    const due = parseFloat((subtotal - paid).toFixed(2));
    return { subtotal, due, total: subtotal };
  };

  const handleAddProduct = () => {
    setInvoice((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          id: Date.now().toString(),
          name: "",
          quantity: 0,
          price: 0
        }
      ],
    }));

    setTimeout(() => {
      if (productNameRefs.current[invoice.products.length]) {
        productNameRefs.current[invoice.products.length]?.focus();
      }
    }, 0);
  };

  const handleProductChange = (idx: number, key: keyof Product, value: string | number) => {
    const updatedProducts = [...invoice.products];
    
    if (key === 'quantity' || key === 'price') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      updatedProducts[idx][key] = Math.max(key === 'quantity' ? 0 : 0, numValue);
    } else {
      (updatedProducts[idx] as any)[key] = value;
    }
    
    const { subtotal, due } = calculateTotals(updatedProducts, invoice.paid);
    
    setInvoice({ 
      ...invoice, 
      products: updatedProducts, 
      subtotal,
      total: subtotal,
      due,
      status: due <= 0 ? "Paid" : "Pending" as any
    });
  };

  const handleSubmit = async () => {
    if (!invoice.customerDetails) {
      alert("Please select a customer!");
      return;
    }
  
    if (invoice.products.length === 0) {
      alert("Please add at least one product!");
      return;
    }
  
    const invalidProduct = invoice.products.find(p =>
      !p.name.trim() || p.quantity <= 0 || p.price < 0
    );
  
    if (invalidProduct) {
      alert("Please fill all product fields with valid values!");
      return;
    }
  
    try {
      const invoiceData = {
        ...invoice,
        customer: invoice.customerDetails.id,
        customerDetails: {
          _id: invoice.customerDetails.id,
          name: invoice.customerDetails.name,
          email: invoice.customerDetails.email,
          phone: invoice.customerDetails.phone,
          address: invoice.customerDetails.address
        },
        date: invoice.date,
        dueDate: invoice.dueDate || invoice.date,
        products: invoice.products.map(p => ({
          id: p.id.toString(),
          name: p.name.trim(),
          quantity: p.quantity,
          price: parseFloat(p.price.toFixed(2))
        })),
        paymentMethod: invoice.paymentMethod,
        notes: invoice.notes,
        paid: parseFloat(invoice.paid.toFixed(2)),
        tax: 0,
        discount: 0,
        subtotal: invoice.subtotal,
        total: parseFloat(invoice.total.toFixed(2)),
        due: parseFloat(invoice.due.toFixed(2)),
        status: (invoice.due <= 0 ? "Paid" : "Pending") as "Paid" | "Pending" | "Overdue",
        customerId: invoice.customerDetails.id
      };
  
      await addInvoice(invoiceData);
      await refreshInvoices();
      setOpenSnackbar(true);
      setTimeout(() => {
        router.push("/utilities/invoices");
      }, 2000);
  
    } catch (error: unknown) {
      console.error("Error creating invoice:", error);
  
      let errorMessage = "Failed to create invoice";
  
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
  
      alert(errorMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') {
      if (idx === invoice.products.length - 1 &&
        invoice.products[idx].name &&
        invoice.products[idx].quantity &&
        invoice.products[idx].price) {
        handleAddProduct();
      }
    }
  };

  const getDisplayValue = (type: 'price' | 'quantity' | 'paid', value: number, index?: number) => {
    if (focusedField?.type === type && (type !== 'price' || focusedField?.index === index)) {
      return value === 0 ? '' : value.toString();
    }
    return value === 0 ? '0' : value.toString();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ 
        py: 4,
        [theme.breakpoints.down('sm')]: {
          py: 2,
          px: 1
        }
      }}>
        <Paper elevation={3} sx={{
          p: 0,
          borderRadius: 4,
          background: theme.palette.background.paper,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          [theme.breakpoints.down('sm')]: {
            borderRadius: 2
          }
        }}>
          {/* Header Section */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            p: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: theme.palette.primary.contrastText,
            borderRadius: '12px 12px 0 0',
            [theme.breakpoints.down('sm')]: {
              flexDirection: 'column',
              alignItems: 'flex-start',
              p: 2,
              borderRadius: '8px 8px 0 0'
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ReceiptIcon sx={{ 
                fontSize: 40, 
                mr: 2,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                padding: 1
              }} />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  New Invoice
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Create and manage your invoices
                </Typography>
              </Box>
            </Box>
            <Box sx={{ 
              textAlign: 'right',
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '8px 16px',
              borderRadius: 2
            }}>
              <Typography variant="h6" fontWeight="bold">
                {invoice.id}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {new Date(invoice.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Typography>
            </Box>
          </Box>

          {/* Main Content */}
          <Box sx={{ 
            p: 3,
            [theme.breakpoints.down('sm')]: {
              p: 1
            }
          }}>
            {/* Customer and Details Section */}
            <Card sx={{ 
              p: 3, 
              mb: 4, 
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                paddingBottom: 1,
                borderBottom: `1px solid ${theme.palette.divider}`
              }}>
                <PersonIcon color="primary" sx={{ 
                  mr: 1,
                  backgroundColor: `${theme.palette.primary.light}20`,
                  borderRadius: '50%',
                  padding: 1,
                  fontSize: 28
                }} />
                <Typography variant="h6" fontWeight="bold">
                  Customer Information
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={customers}
                    getOptionLabel={(option) => option.name}
                    value={customers.find((c) => c.name === invoice.customer) || null}
                    onChange={(event, newValue) => {
                      if (newValue) {
                        setInvoice({
                          ...invoice,
                          customer: newValue.name,
                          customerDetails: newValue,
                          customerId: newValue.id
                        });
                      } else {
                        setInvoice({
                          ...invoice,
                          customer: "",
                          customerDetails: null,
                          customerId: ""
                        });
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Customer"
                        fullWidth
                        required
                        variant="outlined"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          }
                        }}
                      />
                    )}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Invoice Date"
                    value={new Date(invoice.date)}
                    onChange={(newValue) => {
                      if (newValue) {
                        setInvoice({ 
                          ...invoice, 
                          date: newValue.toISOString().split('T')[0] 
                        });
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: 'outlined',
                        InputProps: {
                          sx: {
                            borderRadius: 2,
                          }
                        }
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Due Date"
                    value={invoice.dueDate ? new Date(invoice.dueDate) : null}
                    onChange={(newValue) => {
                      if (newValue) {
                        setInvoice({ 
                          ...invoice, 
                          dueDate: newValue.toISOString().split('T')[0] 
                        });
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: 'outlined',
                        InputProps: {
                          sx: {
                            borderRadius: 2,
                          }
                        }
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Card>

            {/* Products Section */}
            <Card sx={{ 
              p: 3, 
              mb: 4, 
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                paddingBottom: 1,
                borderBottom: `1px solid ${theme.palette.divider}`
              }}>
                <AttachMoneyIcon color="primary" sx={{ 
                  mr: 1,
                  backgroundColor: `${theme.palette.primary.light}20`,
                  borderRadius: '50%',
                  padding: 1,
                  fontSize: 28
                }} />
                <Typography variant="h6" fontWeight="bold">
                  Products & Services
                </Typography>
              </Box>
              
              <TableContainer>
                <Table sx={{
                  '& .MuiTableCell-root': {
                    padding: '12px 16px',
                  }
                }}>
                  <TableHead>
                    <TableRow sx={{
                      backgroundColor: theme.palette.grey[100],
                    }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '150px' }}>Price</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '150px' }}>Amount</TableCell>
                      <TableCell sx={{ width: '50px' }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoice.products.map((product, idx) => (
                      <TableRow 
                        key={product.id}
                        sx={{
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          }
                        }}
                      >
                        <TableCell>
                          <TextField
                            fullWidth
                            value={product.name}
                            onChange={(e) => handleProductChange(idx, "name", e.target.value)}
                            placeholder="Product or service name"
                            variant="standard"
                            InputProps={{ 
                              disableUnderline: true,
                              sx: {
                                '& input': {
                                  padding: '8px 12px',
                                  borderRadius: 1,
                                  border: `1px solid ${theme.palette.divider}`,
                                  '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                  },
                                  '&:focus': {
                                    borderColor: theme.palette.primary.main,
                                    boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
                                  }
                                }
                              }
                            }}
                            inputRef={(el) => (productNameRefs.current[idx] = el)}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={getDisplayValue('quantity', product.quantity)}
                            onChange={(e) => handleProductChange(idx, "quantity", e.target.value)}
                            variant="standard"
                            InputProps={{ 
                              disableUnderline: true,
                              inputProps: { 
                                min: 1, 
                                step: '1',
                              },
                              sx: {
                                '& input': {
                                  padding: '8px 12px',
                                  borderRadius: 1,
                                  border: `1px solid ${theme.palette.divider}`,
                                  '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                  },
                                  '&:focus': {
                                    borderColor: theme.palette.primary.main,
                                    boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
                                  }
                                }
                              }
                            }}
                            onFocus={() => setFocusedField({ type: 'quantity' })}
                            onBlur={() => setFocusedField(null)}
                            sx={{ width: '100%' }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={getDisplayValue('price', product.price, idx)}
                            onChange={(e) => handleProductChange(idx, "price", e.target.value)}
                            variant="standard"
                            InputProps={{ 
                              disableUnderline: true,
                              inputProps: { 
                                min: 0, 
                                step: 'any',
                              },
                              sx: {
                                '& input': {
                                  padding: '8px 12px',
                                  borderRadius: 1,
                                  border: `1px solid ${theme.palette.divider}`,
                                  '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                  },
                                  '&:focus': {
                                    borderColor: theme.palette.primary.main,
                                    boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
                                  }
                                }
                              }
                            }}
                            onFocus={() => setFocusedField({ type: 'price', index: idx })}
                            onBlur={() => setFocusedField(null)}
                            sx={{ width: '100%' }}
                          />
                        </TableCell>
                        <TableCell>
                          {(product.quantity * product.price).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="error"
                            onClick={() => {
                              const updatedProducts = invoice.products.filter((_, i) => i !== idx);
                              const { subtotal, due } = calculateTotals(updatedProducts, invoice.paid);
                              setInvoice({
                                ...invoice,
                                products: updatedProducts,
                                subtotal,
                                total: subtotal,
                                due
                              });
                            }}
                            sx={{
                              '&:hover': {
                                backgroundColor: theme.palette.error.light,
                                color: theme.palette.error.contrastText,
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Button
                variant="outlined"
                color="primary"
                onClick={handleAddProduct}
                startIcon={<AddIcon />}
                sx={{ 
                  mt: 2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 'bold',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.light,
                    color: theme.palette.primary.contrastText,
                  }
                }}
              >
                Add Item
              </Button>
            </Card>

            {/* Payment and Summary Section */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card sx={{ 
                  p: 3, 
                  borderRadius: 2, 
                  height: '100%',
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 2,
                    paddingBottom: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`
                  }}>
                    <PaymentIcon color="primary" sx={{ 
                      mr: 1,
                      backgroundColor: `${theme.palette.primary.light}20`,
                      borderRadius: '50%',
                      padding: 1,
                      fontSize: 28
                    }} />
                    <Typography variant="h6" fontWeight="bold">
                      Payment Details
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Payment Method"
                        select
                        fullWidth
                        value={invoice.paymentMethod}
                        onChange={(e) => setInvoice({ ...invoice, paymentMethod: e.target.value as "Cash" | "CreditCard" | "BankTransfer" })}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          }
                        }}
                      >
                        <MenuItem value="Cash">Cash</MenuItem>
                        <MenuItem value="CreditCard">Credit Card</MenuItem>
                        <MenuItem value="BankTransfer">Bank Transfer</MenuItem>
                      </TextField>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Amount Paid"
                        type="number"
                        fullWidth
                        value={getDisplayValue('paid', invoice.paid)}
                        onChange={(e) => {
                          const paid = parseFloat(e.target.value) || 0;
                          const { subtotal, due } = calculateTotals(invoice.products, paid);
                          setInvoice({ 
                            ...invoice, 
                            paid, 
                            subtotal,
                            total: subtotal,
                            due,
                            status: due <= 0 ? "Paid" : "Pending" as any 
                          });
                        }}
                        variant="outlined"
                        InputProps={{
                          inputProps: { 
                            min: 0, 
                            step: 'any',
                          },
                        }}
                        onFocus={() => setFocusedField({ type: 'paid' })}
                        onBlur={() => setFocusedField(null)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          }
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mt: 2,
                        paddingBottom: 1,
                        borderBottom: `1px solid ${theme.palette.divider}`
                      }}>
                        <NotesIcon color="primary" sx={{ 
                          mr: 1,
                          backgroundColor: `${theme.palette.primary.light}20`,
                          borderRadius: '50%',
                          padding: 1,
                          fontSize: 28
                        }} />
                        <Typography variant="h6" fontWeight="bold">
                          Notes
                        </Typography>
                      </Box>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={invoice.notes}
                        onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
                        placeholder="Additional notes or terms..."
                        variant="outlined"
                        sx={{ 
                          mt: 1,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card sx={{ 
                  p: 3, 
                  borderRadius: 2, 
                  backgroundColor: theme.palette.grey[50],
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)'
                }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Summary
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      mb: 1,
                      p: 1,
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: 1
                    }}>
                      <Typography variant="body1">Subtotal:</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {invoice.subtotal.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      mb: 1,
                      p: 1,
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: 1
                    }}>
                      <Typography variant="body1">Tax (0%):</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        0.00
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      mb: 1,
                      p: 1,
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: 1
                    }}>
                      <Typography variant="body1">Discount:</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        0.00
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      mb: 1,
                      p: 1,
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: 1
                    }}>
                      <Typography variant="body1" fontWeight="bold">Total:</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {invoice.total.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      mb: 1,
                      p: 1,
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: 1
                    }}>
                      <Typography variant="body1">Amount Paid:</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {invoice.paid.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      p: 1,
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: 1
                    }}>
                      <Typography variant="body1">Balance Due:</Typography>
                      <Typography 
                        variant="body1" 
                        fontWeight="bold"
                        color={invoice.due <= 0 ? 'success.main' : 'error.main'}
                      >
                        {invoice.due.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      mt: 3, 
                      p: 2, 
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: 2,
                      textAlign: 'center',
                      border: `1px solid ${invoice.due <= 0 ? theme.palette.success.light : theme.palette.warning.light}`,
                      boxShadow: `0 0 0 1px ${invoice.due <= 0 ? theme.palette.success.light : theme.palette.warning.light}`
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <Typography 
                        variant="h6" 
                        color={invoice.due <= 0 ? 'success.main' : 'warning.main'}
                        fontWeight="bold"
                      >
                        {invoice.due <= 0 ? "PAID" : "PENDING"}
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              mt: 4,
              gap: 2
            }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => router.push("/utilities/invoices")}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  textTransform: 'none',
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    backgroundColor: theme.palette.grey[100]
                  }
                }}
              >
                Cancel
              </Button>
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                size="large"
                sx={{
                  px: 6,
                  py: 1.5,
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
                  },
                  '&:disabled': {
                    backgroundColor: theme.palette.grey[300],
                    color: theme.palette.grey[500]
                  }
                }}
                disabled={invoice.products.length === 0 || !invoice.customerDetails}
              >
                Create Invoice
              </Button>
            </Box>
          </Box>
        </Paper>

        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={() => setOpenSnackbar(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setOpenSnackbar(false)} 
            severity="success" 
            sx={{ 
              width: '100%',
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            Invoice created successfully!
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
};

export default CreateInvoice;