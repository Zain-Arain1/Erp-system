"use client";
import React, { useState, useEffect } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Chip,
  Menu,
  MenuItem,
  useMediaQuery,
  IconButton,
  Skeleton,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  TablePagination,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  InputLabel,
  FormControl,
  Divider,
  Grid,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getGateEntries,
  createGateEntry,
  updateGateEntry,
  deleteGateEntry,
  addPayment,
  GateEntry,
  Payment,
  Item
} from '@/services/gatein';
import { useVendorContext } from "@/app/(DashboardLayout)/utilities/context/vendorContext";

interface Column {
  id: "invoiceNumber" | "vendor" | "totalAmount" | "paymentStatus" | "date" | "action";
  label: string;
  minWidth?: number;
  align?: "right" | "left" | "center";
  format?: (value: number) => string;
}

const columns: Column[] = [
  { id: "invoiceNumber", label: "Invoice #", minWidth: 100, align: "left" },
  { id: "vendor", label: "Vendor", minWidth: 150, align: "left" },
  {
    id: "totalAmount",
    label: "Total Amount",
    minWidth: 120,
    align: "right",
    format: (value: number) => (value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 }),
  },
  { id: "paymentStatus", label: "Status", minWidth: 100, align: "center" },
  { id: "date", label: "Date", minWidth: 120, align: "left" },
  { id: "action", label: "Actions", minWidth: 100, align: "center" },
];

const GateInPage = () => {
  const [rows, setRows] = useState<GateEntry[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<GateEntry | null>(null);
  const [editRow, setEditRow] = useState<GateEntry | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<GateEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });
  const [newPayment, setNewPayment] = useState<Payment>({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    method: "Cash",
    reference: ""
  });

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { vendors } = useVendorContext();

  // Helper function to get vendor name
  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.name : vendorId;
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const data = await getGateEntries();
      const validatedData = data.map(entry => ({
        ...entry,
        totalAmount: entry.totalAmount || 0,
        items: entry.items || [],
        payments: entry.payments || []
      }));
      setRows(validatedData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setSnackbar({
        open: true,
        message: "Failed to load data",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleFormSubmit = async (
    items: Item[],
    vendorId: string,
    paymentStatus: "Paid" | "Partial" | "Pending"
  ) => {
    // ===== VALIDATION SECTION =====
    const validationErrors: string[] = [];

    // Vendor validation
    if (!vendorId) {
      validationErrors.push("• Please select a vendor");
    }

    // Items validation
    items.forEach((item, index) => {
      if (!item.name.trim()) {
        validationErrors.push(`• Item ${index + 1}: Name is required`);
      }
      if (!item.units.trim()) {
        validationErrors.push(`• Item ${index + 1}: Unit of measurement is required`);
      }
      if (item.quantity <= 0 || isNaN(item.quantity)) {
        validationErrors.push(`• Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (item.purchasePrice <= 0 || isNaN(item.purchasePrice)) {
        validationErrors.push(`• Item ${index + 1}: Price must be greater than 0`);
      }
      if (isNaN(item.total) || item.total < 0) {
        validationErrors.push(`• Item ${index + 1}: Invalid total amount`);
      }
    });

    if (validationErrors.length > 0) {
      setSnackbar({
        open: true,
        message: `Please fix the following errors:\n${validationErrors.join('\n')}`,
        severity: "error",

      });
      return;
    }
    // ===== END VALIDATION =====

    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) {
      setSnackbar({
        open: true,
        message: "Selected vendor not found. Please refresh the vendor list.",
        severity: "error",
      });
      return;
    }

    // Ensure all numeric fields are properly formatted
    const validatedItems = items.map(item => ({
      ...item,
      quantity: Number(item.quantity),
      purchasePrice: Number(item.purchasePrice),
      total: Number(item.total.toFixed(2)) // Ensure 2 decimal places
    }));

    const totalAmount = validatedItems.reduce((sum, item) => sum + item.total, 0);

    try {
      const entryData = {
        items: validatedItems,
        vendor: vendor.name,
        vendorId: vendor.id,
        paymentStatus,
        totalAmount,
        date: new Date().toISOString(),
        payments: [],
        invoiceNumber: 0 // Will be generated by backend
      };

      if (editRow && editRow._id) {
        const updatedEntry = await updateGateEntry(editRow._id, entryData);
        setRows(rows.map(row => row._id === editRow._id ? updatedEntry : row));
        setSnackbar({
          open: true,
          message: `Invoice #${updatedEntry.invoiceNumber} updated successfully!`,
          severity: "success",
        });
      } else {
        const newEntry = await createGateEntry(entryData);
        setRows([newEntry, ...rows]);
        setSnackbar({
          open: true,
          message: `New invoice #${newEntry.invoiceNumber} created successfully!`,
          severity: "success",
        });
      }

      setShowForm(false);
      setEditRow(null);
    } catch (error) {
      console.error("Error saving invoice:", error);
      setSnackbar({
        open: true,
        message: error instanceof Error
          ? `Save failed: ${error.message}`
          : "Failed to save invoice due to an unknown error",
        severity: "error",
      });
    }
  };
  const handleFormCancel = () => {
    setShowForm(false);
    setEditRow(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, row: GateEntry) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleEdit = () => {
    if (selectedRow) {
      setEditRow(selectedRow);
      setShowForm(true);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedRow && selectedRow._id) {
      try {
        await deleteGateEntry(selectedRow._id);
        setRows(rows.filter(row => row._id !== selectedRow._id));
        setSnackbar({
          open: true,
          message: "Entry deleted successfully!",
          severity: "success",
        });
      } catch (error) {
        console.error("Error deleting data:", error);
        setSnackbar({
          open: true,
          message: "Failed to delete data",
          severity: "error",
        });
      }
    }
    handleMenuClose();
  };

  const handleViewDetail = (entry: GateEntry) => {
    setSelectedEntry(entry);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedEntry(null);
    setNewPayment({
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      method: "Cash",
      reference: ""
    });
  };

  const handlePaymentSubmit = async () => {
    if (!selectedEntry?._id || newPayment.amount <= 0) return;

    try {
      await addPayment(selectedEntry._id, {
        ...newPayment,
        amount: Number(newPayment.amount)
      });
      await fetchData();
      setSnackbar({
        open: true,
        message: "Payment recorded successfully!",
        severity: "success",
      });
      handleCloseDetail();
    } catch (error) {
      console.error("Error adding payment:", error);
      setSnackbar({
        open: true,
        message: "Failed to record payment",
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Format date to Pakistan time
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Loading skeleton for table rows
  const renderLoadingRows = () => {
    return Array.from({ length: rowsPerPage }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        {columns.map((column) => (
          <TableCell key={`skeleton-${column.id}-${index}`}>
            <Skeleton variant="text" width={column.minWidth ? column.minWidth * 0.7 : 100} />
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  return (
    <Box sx={{
      p: isSmallScreen ? 1 : 3,
      backgroundColor: theme.palette.background.default,
      minHeight: '100vh',
    }}>
      {/* Loading overlay */}
      {isLoading && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: theme.zIndex.modal,
        }}>
          <Stack direction="column" alignItems="center" spacing={2}>
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" color="textSecondary">
              Loading data...
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Form Dialog */}
      {showForm && (
        <Dialog open={true} onClose={handleFormCancel} maxWidth="md" fullWidth>
          <DialogTitle>
            <Typography variant="h5" component="div" align="center">
              {editRow ? "Edit Invoice" : "Create New Invoice"}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Vendor</InputLabel>
                    <Select
                      value={editRow?.vendor || ""}
                      onChange={(e) => editRow && setEditRow({ ...editRow, vendor: e.target.value })}
                      label="Vendor"
                      required
                    >
                      {vendors.filter(v => v.status === "Active").map((vendor) => (
                        <MenuItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Items
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Item Name</TableCell>
                          <TableCell>Units</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Total</TableCell>
                          <TableCell>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {editRow?.items?.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <TextField
                                fullWidth
                                value={item.name}
                                onChange={(e) => {
                                  const newItems = [...editRow.items];
                                  newItems[index].name = e.target.value;
                                  setEditRow({ ...editRow, items: newItems });
                                }}
                                required
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                value={item.units}
                                onChange={(e) => {
                                  const newItems = [...editRow.items];
                                  newItems[index].units = e.target.value;
                                  setEditRow({ ...editRow, items: newItems });
                                }}
                                required
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newItems = [...editRow.items];
                                  newItems[index].quantity = Number(e.target.value);
                                  newItems[index].total = newItems[index].quantity * newItems[index].purchasePrice;
                                  setEditRow({ ...editRow, items: newItems });
                                }}
                                required
                                inputProps={{ min: 0 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                type="number"
                                value={item.purchasePrice}
                                onChange={(e) => {
                                  const newItems = [...editRow.items];
                                  newItems[index].purchasePrice = Number(e.target.value);
                                  newItems[index].total = newItems[index].quantity * newItems[index].purchasePrice;
                                  setEditRow({ ...editRow, items: newItems });
                                }}
                                required
                                inputProps={{ min: 0 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                type="number"
                                value={item.total.toFixed(2)}
                                disabled
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                onClick={() => {
                                  if (editRow.items.length > 1) {
                                    const newItems = [...editRow.items];
                                    newItems.splice(index, 1);
                                    setEditRow({ ...editRow, items: newItems });
                                  }
                                }}
                                disabled={editRow.items.length <= 1}
                              >
                                <DeleteIcon color={editRow.items.length <= 1 ? "disabled" : "error"} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditRow({
                        ...editRow!,
                        items: [...editRow!.items, { name: "", units: "", quantity: 0, purchasePrice: 0, total: 0 }]
                      });
                    }}
                    sx={{ mt: 1 }}
                  >
                    Add Item
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Total Amount"
                    type="number"
                    value={editRow?.items.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                    disabled
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      value={editRow?.paymentStatus || "Pending"}
                      onChange={(e) => editRow && setEditRow({
                        ...editRow,
                        paymentStatus: e.target.value as "Paid" | "Partial" | "Pending"
                      })}
                      label="Payment Status"
                      required
                    >
                      <MenuItem value="Paid">Paid</MenuItem>
                      <MenuItem value="Partial">Partial</MenuItem>
                      <MenuItem value="Pending">Pending</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleFormCancel} color="secondary">
              Cancel
            </Button>
            <Button
              onClick={() => editRow && handleFormSubmit(editRow.items, editRow.vendor, editRow.paymentStatus)}
              color="primary"
              variant="contained"
            >
              {editRow ? "Update Invoice" : "Create Invoice"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Invoice Detail Dialog */}
      {showDetail && selectedEntry && (
        <Dialog open={showDetail} onClose={handleCloseDetail} maxWidth="md" fullWidth>
          <DialogTitle>
            <Typography variant="h5">Invoice #{selectedEntry.invoiceNumber}</Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Vendor: {selectedEntry.vendor}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Date: {formatDate(selectedEntry.date)}
            </Typography>
            <Chip
              label={selectedEntry.paymentStatus}
              color={
                selectedEntry.paymentStatus === 'Paid'
                  ? "success"
                  : selectedEntry.paymentStatus === 'Partial'
                    ? "warning"
                    : "error"
              }
              sx={{ mt: 1 }}
            />
          </DialogTitle>

          <DialogContent dividers>
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
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
                    {selectedEntry.items.map((item, index) => (
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
                          {selectedEntry.totalAmount.toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                Payment Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, backgroundColor: theme.palette.grey[100] }}>
                    <Typography variant="subtitle2">Total Amount</Typography>
                    <Typography variant="h6">{selectedEntry.totalAmount.toFixed(2)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, backgroundColor: theme.palette.grey[100] }}>
                    <Typography variant="subtitle2">Total Paid</Typography>
                    <Typography variant="h6">
                      {(selectedEntry.payments?.reduce((sum, p) => sum + p.amount, 0) || 0).toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{
                    p: 2,
                    backgroundColor: (selectedEntry.totalAmount - (selectedEntry.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)) > 0
                      ? theme.palette.error.light
                      : theme.palette.success.light
                  }}>
                    <Typography variant="subtitle2">Balance</Typography>
                    <Typography variant="h6">
                      {(selectedEntry.totalAmount - (selectedEntry.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)).toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {selectedEntry.payments?.length > 0 && (
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
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
                      {selectedEntry.payments.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(payment.date)}</TableCell>
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

            <Box>
              <Typography variant="h6" gutterBottom>
                Add New Payment
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({
                      ...newPayment,
                      amount: Number(e.target.value)
                    })}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({
                      ...newPayment,
                      date: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Method</InputLabel>
                    <Select
                      value={newPayment.method}
                      onChange={(e) => setNewPayment({
                        ...newPayment,
                        method: e.target.value as "Cash" | "Bank Transfer" | "Cheque" | "Other"
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
                    value={newPayment.reference}
                    onChange={(e) => setNewPayment({
                      ...newPayment,
                      reference: e.target.value
                    })}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseDetail}>Close</Button>
            <Button
              onClick={handlePaymentSubmit}
              variant="contained"
              color="primary"
              disabled={newPayment.amount <= 0}
            >
              Record Payment
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Main Content */}
      <Paper
        sx={{
          width: "100%",
          overflow: "hidden",
          p: 3,
          boxShadow: 3,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        {/* Header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexDirection: isSmallScreen ? 'column' : 'row',
          gap: 2,
        }}>
          <Typography
            variant={isSmallScreen ? "h5" : "h4"}
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
            }}
          >
            Raw Material Gate-In
          </Typography>

          <Button
            variant="contained"
            onClick={() => {
              setEditRow({
                _id: '', // Add this if your type requires it
                invoiceNumber: 0,
                vendor: vendors.length > 0 ? vendors[0].id : "", // Default to first vendor
                vendorId: vendors.length > 0 ? vendors[0].id : "",
                items: [{
                  name: "",
                  units: "kg", // Default unit
                  quantity: 1, // Default to 1 instead of 0
                  purchasePrice: 0,
                  total: 0
                }],
                totalAmount: 0,
                paymentStatus: "Pending",
                date: new Date().toISOString(),
                payments: []
              });
              setShowForm(true);
            }}
          >
            Create New Invoice
          </Button>
        </Box>

        {/* Table */}
        <TableContainer
          sx={{
            overflowX: "auto",
            borderRadius: '8px',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Table stickyHeader aria-label="sticky table" sx={{ minWidth: isSmallScreen ? 600 : 800 }}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    sx={{
                      minWidth: column.minWidth,
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.common.white,
                      fontWeight: 600,
                    }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading ? (
                renderLoadingRows()
              ) : rows.length > 0 ? (
                rows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row) => (
                    <TableRow hover key={row._id}>
                      {columns.map((column) => {
                        const value = row[column.id as keyof GateEntry];
                        return (
                          <TableCell
                            key={column.id}
                            align={column.align}
                          >
                            {(() => {
                              if (column.id === "invoiceNumber") {
                                return (
                                  <Link
                                    component="button"
                                    onClick={() => handleViewDetail(row)}
                                    sx={{
                                      color: theme.palette.primary.main,
                                      textDecoration: 'none',
                                      '&:hover': {
                                        textDecoration: 'underline',
                                      },
                                    }}
                                  >
                                    #{value as string}
                                  </Link>
                                );
                              }

                              if (column.id === "paymentStatus") {
                                return (
                                  <Chip
                                    label={row.paymentStatus}
                                    color={
                                      row.paymentStatus === "Paid"
                                        ? "success"
                                        : row.paymentStatus === "Partial"
                                          ? "warning"
                                          : "error"
                                    }
                                    size="small"
                                  />
                                );
                              }

                              if (column.id === "date") {
                                return formatDate(value as string);
                              }

                              if (column.id === "totalAmount") {
                                const amount = value as number || 0;
                                return column.format ? column.format(amount) : amount.toLocaleString();
                              }

                              if (column.id === "action") {
                                return (
                                  <IconButton
                                    onClick={(event) => handleMenuClick(event, row)}
                                    sx={{
                                      color: theme.palette.text.secondary,
                                      '&:hover': {
                                        color: theme.palette.primary.main,
                                      },
                                    }}
                                  >
                                    <MoreVertIcon />
                                  </IconButton>
                                );
                              }

                              // Default case - ensure it's a string
                              return value as string;
                            })()}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      No invoices available
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            '& .MuiTablePagination-toolbar': {
              padding: 1,
            },
          }}
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            borderRadius: '8px',
            minWidth: 180,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1,
              typography: 'body2',
            },
          },
        }}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={() => selectedRow && handleViewDetail(selectedRow)}>View Details</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: theme.palette.error.main }}>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default GateInPage;