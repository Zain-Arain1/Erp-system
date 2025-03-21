'use client';
import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import {
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, Typography,
  Pagination, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import Cards from "./cards";
import { useInvoiceContext } from "../../utilities/context/InvoiceContext";

// Define Invoice Type
interface Invoice {
  id: string;
  date: string;
  customer: string;
  total: number;
  paid: number;
  due: number;
  dueDate: string;
  status: "Paid" | "Pending" | "Overdue"; // Add status field
}

const SaleInvoice: React.FC = () => {
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const invoicesPerPage = 5;
  const { invoices, addInvoice, updateInvoice } = useInvoiceContext(); // Add updateInvoice from context

  const router = useRouter();
  const redirectToCreate = () => {
    console.log("Redirecting to Create Page");
    router.push('/utilities/createInvoice');
  };

  // Filtered Invoices based on search
  const filteredInvoices = invoices.filter((invoice) =>
    invoice.customer.toLowerCase().includes(search.toLowerCase()) ||
    invoice.id.includes(search)
  );

  // Pagination Logic
  const startIndex = (page - 1) * invoicesPerPage;
  const endIndex = startIndex + invoicesPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);

  // Handle Payment Dialog Open
  const handlePaymentDialogOpen = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setOpenDialog(true);
  };

  // Handle Payment Dialog Close
  const handlePaymentDialogClose = () => {
    setOpenDialog(false);
    setSelectedInvoice(null);
    setPaymentAmount(0);
  };

  // Handle Payment Submission
  const handlePaymentSubmit = () => {
    if (selectedInvoice && paymentAmount > 0) {
      const updatedPaid = selectedInvoice.paid + paymentAmount;
      const updatedDue = selectedInvoice.due - paymentAmount;
      const updatedStatus: "Paid" | "Pending" | "Overdue" = 
        updatedDue <= 0 ? "Paid" : new Date(selectedInvoice.dueDate) < new Date() ? "Overdue" : "Pending";

      const updatedInvoice: Partial<Invoice> = {
        ...selectedInvoice,
        paid: updatedPaid,
        due: updatedDue,
        status: updatedStatus, // Explicitly typed as "Paid" | "Pending" | "Overdue"
      };

      // Pass both the ID and the updated invoice object
      updateInvoice(selectedInvoice.id, updatedInvoice); // Corrected line
      handlePaymentDialogClose();
    }
  };

  return (
    <div>
      <Cards invoices={filteredInvoices} />
      <Paper sx={{ padding: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Typography variant="h6">Sale Invoices</Typography>
          <TextField
            variant="outlined"
            placeholder="Search Invoice"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
          />
          <Button variant="contained" color="primary" onClick={redirectToCreate}>
            + Create Sale
          </Button>
        </div>

        {/* Table Section */}
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: '1.2rem' }}>Invoice</TableCell>
                <TableCell sx={{ fontSize: '1.2rem' }}>Date</TableCell>
                <TableCell sx={{ fontSize: '1.2rem' }}>Customer</TableCell>
                <TableCell sx={{ fontSize: '1.2rem' }}>Total</TableCell>
                <TableCell sx={{ fontSize: '1.2rem' }}>Paid</TableCell>
                <TableCell sx={{ fontSize: '1.2rem' }}>Due</TableCell>
                <TableCell sx={{ fontSize: '1.2rem' }}>Due Date</TableCell>
                <TableCell sx={{ fontSize: '1.2rem' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedInvoices.map((invoice) => {
                const isOverdue = new Date(invoice.dueDate) < new Date();
                const isPaid = invoice.paid >= invoice.total;
                const isPending = !isPaid && !isOverdue;

                return (
                  <TableRow hover key={invoice.id}>
                    <TableCell>{invoice.id}</TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>{invoice.customer}</TableCell>
                    <TableCell>${invoice.total}</TableCell>
                    <TableCell>${invoice.paid}</TableCell>
                    <TableCell>${invoice.due}</TableCell>
                    <TableCell>{invoice.dueDate}</TableCell>
                    <TableCell>
                      {isPaid ? (
                        <Button variant="contained" color="success" disabled>
                          Paid
                        </Button>
                      ) : isOverdue ? (
                        <Button
                          variant="contained"
                          color="warning"
                          onClick={() => handlePaymentDialogOpen(invoice)}
                        >
                          P.Paid
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="warning"
                          onClick={() => handlePaymentDialogOpen(invoice)}
                        >
                          Pending
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Section */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
          />
        </div>
      </Paper>

      {/* Payment Dialog */}
      <Dialog open={openDialog} onClose={handlePaymentDialogClose}>
        <DialogTitle>Add Payment</DialogTitle>
        <DialogContent>
          <TextField
            label="Payment Amount"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePaymentDialogClose}>Cancel</Button>
          <Button
            onClick={handlePaymentSubmit}
            color="primary"
            disabled={paymentAmount > (selectedInvoice?.due || 0) || paymentAmount <= 0} // Disable if payment is greater than due or non-positive
          >
            Add Payment
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default SaleInvoice;