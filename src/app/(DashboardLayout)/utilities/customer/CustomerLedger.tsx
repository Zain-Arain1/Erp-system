"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Grid,
  Card,
  CardContent,
  TableSortLabel,
} from "@mui/material";
import { useRouter } from "next/navigation";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CloseIcon from "@mui/icons-material/Close";
import { useInvoiceContext, Invoice } from "@/app/(DashboardLayout)/utilities/context/InvoiceContext"; // Import Invoice type

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "Active" | "Inactive";
}

interface CustomerLedgerProps {
  customer: Customer;
}

const CustomerLedger: React.FC<CustomerLedgerProps> = ({ customer }) => {
  const router = useRouter();
  const { invoices } = useInvoiceContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Pending" | "Overdue">("All");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"All" | "Cash" | "Credit Card" | "Bank Transfer">("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [orderBy, setOrderBy] = useState<keyof Invoice>("date");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  // Debugging: Log the customer prop and invoices array
  console.log("Customer Prop in Ledger:", customer); // Debugging: Log the customer prop
  console.log("All Invoices in Context:", invoices); // Debugging: Log all invoices

  // Filter invoices by customer name (case-insensitive and trimmed)
  const customerInvoices = invoices.filter((invoice) => {
    console.log("Filtering Invoices for Customer:", customer.name, invoice.customer); // Debugging: Log the customer names
    return invoice.customer.trim().toLowerCase() === customer.name.trim().toLowerCase();
  });

  console.log("Customer Invoices:", customerInvoices); // Debugging: Log the filtered invoices

  // Handle search and filter
  const filteredInvoices = customerInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.date.includes(searchTerm);
    const matchesStatus = statusFilter === "All" || invoice.status === statusFilter;
    const matchesPaymentMethod = paymentMethodFilter === "All" || invoice.paymentMethod === paymentMethodFilter;
    const matchesDateRange =
      (!startDate || invoice.date >= startDate) && (!endDate || invoice.date <= endDate);
    return matchesSearch && matchesStatus && matchesPaymentMethod && matchesDateRange;
  });

  // Handle sorting
  const handleSort = (property: keyof Invoice) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedInvoices = filteredInvoices.sort((a, b) => {
    const aValue = a[orderBy]; // No need for casting, as orderBy is guaranteed to be a valid key
    const bValue = b[orderBy]; // No need for casting, as orderBy is guaranteed to be a valid key

    if (order === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  // Handle invoice details modal
  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleCloseModal = () => {
    setSelectedInvoice(null);
  };

  // Handle export functionality
  const handleExport = (format: "CSV" | "PDF") => {
    alert(`Exporting invoices in ${format} format.`);
    // Implement export logic here
  };

  // Calculate total summary
  const totalInvoices = filteredInvoices.length;
  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const averageAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;

  // Check if an invoice is due soon
  const isDueSoon = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const timeDiff = due.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff <= 3 && daysDiff >= 0;
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Customer Information */}
      <Typography variant="h4" sx={{ mb: 2 }}>
        {customer.name}'s All Invoices
      </Typography>
      <Box sx={{ mb: 4 }}>
        <Typography variant="body1">
          <strong>Email:</strong> {customer.email}
        </Typography>
        <Typography variant="body1">
          <strong>Phone:</strong> {customer.phone}
        </Typography>
        <Typography variant="body1">
          <strong>Address:</strong> {customer.address}
        </Typography>
        <Typography variant="body1" component="div">
          <strong>Status:</strong>{" "}
          <Chip
            label={customer.status}
            color={customer.status === "Active" ? "success" : "error"}
            size="small"
          />
        </Typography>
      </Box>

      {/* Search and Filter Section */}
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by invoice number or date"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1 }} />,
          }}
        />
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "All" | "Paid" | "Pending" | "Overdue")}
            label="Status"
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Overdue">Overdue</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Payment Method</InputLabel>
          <Select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value as "All" | "Cash" | "Credit Card" | "Bank Transfer")}
            label="Payment Method"
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Credit Card">Credit Card</MenuItem>
            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
          </Select>
        </FormControl>
        <TextField
          type="date"
          label="Start Date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          label="End Date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {/* Enhanced Summary Section */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Invoices</Typography>
              <Typography variant="h4">{totalInvoices}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Amount</Typography>
              <Typography variant="h4">${totalAmount.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Average Amount</Typography>
              <Typography variant="h4">${averageAmount.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Invoices Table */}
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "id"}
                    direction={orderBy === "id" ? order : "asc"}
                    onClick={() => handleSort("id")}
                  >
                    Invoice Number
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "date"}
                    direction={orderBy === "date" ? order : "asc"}
                    onClick={() => handleSort("date")}
                  >
                    Date
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "dueDate"}
                    direction={orderBy === "dueDate" ? order : "asc"}
                    onClick={() => handleSort("dueDate")}
                  >
                    Due Date
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "total"}
                    direction={orderBy === "total" ? order : "asc"}
                    onClick={() => handleSort("total")}
                  >
                    Total Amount
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Paid Amount</TableCell>
                <TableCell align="right">Due Amount</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "status"}
                    direction={orderBy === "status" ? order : "asc"}
                    onClick={() => handleSort("status")}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>Payment Method</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedInvoices
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((invoice) => (
                  <TableRow
                    hover
                    key={invoice.id}
                    onClick={() => handleInvoiceClick(invoice)}
                    sx={{ 
                      cursor: "pointer",
                      backgroundColor: isDueSoon(invoice.dueDate) ? "#fff3e0" : "inherit"
                    }}
                  >
                    <TableCell>{invoice.id}</TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>{invoice.dueDate}</TableCell>
                    <TableCell align="right">${invoice.total.toFixed(2)}</TableCell>
                    <TableCell align="right">${invoice.paid.toFixed(2)}</TableCell>
                    <TableCell align="right">${invoice.due.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status}
                        color={
                          invoice.status === "Paid"
                            ? "success"
                            : invoice.status === "Pending"
                            ? "warning"
                            : "error"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{invoice.paymentMethod}</TableCell>
                    <TableCell>{invoice.notes}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Pagination */}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Button
          variant="contained"
          onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          disabled={page === 0}
        >
          Previous
        </Button>
        <Typography sx={{ mx: 2, alignSelf: "center" }}>
          Page {page + 1} of {Math.ceil(filteredInvoices.length / rowsPerPage)}
        </Typography>
        <Button
          variant="contained"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={page >= Math.ceil(filteredInvoices.length / rowsPerPage) - 1}
        >
          Next
        </Button>
      </Box>

      {/* Export Buttons */}
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<FileDownloadIcon />}
          onClick={() => handleExport("CSV")}
          sx={{ mr: 2 }}
        >
          Export as CSV
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<FileDownloadIcon />}
          onClick={() => handleExport("PDF")}
        >
          Export as PDF
        </Button>
      </Box>

      {/* Back Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => router.push("/utilities/customer")}
        sx={{ mt: 2, ml: 2 }}
      >
        Back to Customers
      </Button>

      {/* Invoice Details Modal */}
      <Dialog open={Boolean(selectedInvoice)} onClose={handleCloseModal}>
        <DialogTitle>
          Invoice Details
          <IconButton
            onClick={handleCloseModal}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box>
              <Typography>
                <strong>Invoice Number:</strong> {selectedInvoice.id}
              </Typography>
              <Typography>
                <strong>Date:</strong> {selectedInvoice.date}
              </Typography>
              <Typography>
                <strong>Due Date:</strong> {selectedInvoice.dueDate}
              </Typography>
              <Typography>
                <strong>Total Amount:</strong> ${selectedInvoice.total.toFixed(2)}
              </Typography>
              <Typography>
                <strong>Paid Amount:</strong> ${selectedInvoice.paid.toFixed(2)}
              </Typography>
              <Typography>
                <strong>Due Amount:</strong> ${selectedInvoice.due.toFixed(2)}
              </Typography>
              <Typography>
                <strong>Status:</strong>{" "}
                <Chip
                  label={selectedInvoice.status}
                  color={
                    selectedInvoice.status === "Paid"
                      ? "success"
                      : selectedInvoice.status === "Pending"
                      ? "warning"
                      : "error"
                  }
                  size="small"
                />
              </Typography>
              <Typography>
                <strong>Payment Method:</strong> {selectedInvoice.paymentMethod}
              </Typography>
              <Typography>
                <strong>Notes:</strong> {selectedInvoice.notes}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerLedger;