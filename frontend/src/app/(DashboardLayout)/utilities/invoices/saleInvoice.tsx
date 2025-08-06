/* The above code is a TypeScript React component that displays a table of product out entries. Here is
a summary of what the code does: */
/* The above code is a TypeScript React component for managing sale invoices. It includes
functionalities such as displaying a list of invoices, searching invoices, adding payments to
invoices, viewing invoice details, editing invoices, deleting invoices, recording payments,
displaying payment history, saving invoices as PDF, and printing invoices. */
'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import {
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, Typography,
  TablePagination, Dialog, DialogTitle, DialogContent, 
  DialogActions, Snackbar, Alert, Chip, Box, Stack,
  Skeleton, CircularProgress, Tooltip, useMediaQuery,
  useTheme, IconButton, Menu, MenuItem, Modal, Grid,
  Divider, InputAdornment, ListItemIcon
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useInvoiceContext } from "../../utilities/context/InvoiceContext";
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CloseIcon from '@mui/icons-material/Close';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { getInvoiceById } from '@/services/invoiceService';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaymentIcon from '@mui/icons-material/Payment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface Product {
  id?: string | number;
  name: string;
  quantity: number;
  price: number;
}

interface Invoice {
  id: string;
  invoiceNumber?: string;
  date: string;
  customer?: string;
  customerDetails?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  dueDate: string;
  products: Product[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  status: "Paid" | "Pending" | "Overdue";
  paymentMethod: "Cash" | "CreditCard" | "BankTransfer";
  notes: string;
  paymentHistory?: Array<{
    date: string;
    amount: number;
    method: "Cash" | "CreditCard" | "BankTransfer";
  }>;
}

const SaleInvoice: React.FC = () => {
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<Invoice | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Invoice | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();

  const {
    invoices,
    loading,
    error,
    addPayment,
    refreshInvoices,
    deleteInvoice
  } = useInvoiceContext();

  useEffect(() => {
    refreshInvoices();
  }, [refreshInvoices]); 

  const processedInvoices = [...invoices]
    .sort((a, b) => {
      const aNum = parseInt((a.invoiceNumber || a.id).replace('INV-', ''));
      const bNum = parseInt((b.invoiceNumber || b.id).replace('INV-', ''));
      return bNum - aNum;
    })
    .map(invoice => ({
      ...invoice,
      customer: invoice.customerDetails?.name || (typeof invoice.customer === 'string' ? invoice.customer : 'N/A'),
      invoiceNumber: invoice.invoiceNumber || invoice.id
    }));

  const filteredInvoices = processedInvoices.filter((invoice) => {
    const searchTerm = search.toLowerCase();
    return (
      invoice.customer.toLowerCase().includes(searchTerm) ||
      (invoice.invoiceNumber?.toLowerCase()?.includes(searchTerm)) ||
      invoice.id.toLowerCase().includes(searchTerm)
    );
  });

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handlePaymentDialogOpen = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(0);
    setOpenDialog(true);
  };

  const handlePaymentDialogClose = () => {
    setOpenDialog(false);
    setSelectedInvoice(null);
    setPaymentAmount(0);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedInvoice || paymentAmount <= 0) return;

    try {
      await addPayment(selectedInvoice.id, paymentAmount);
      setSnackbar({
        open: true,
        message: "Payment added successfully!",
        severity: "success"
      });
      refreshInvoices();
      handlePaymentDialogClose();
    } catch (err) {
      console.error("Payment failed:", err);
      setSnackbar({
        open: true,
        message: "Failed to add payment. Please try again.",
        severity: "error"
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, row: Invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleViewDetails = () => {
    if (selectedRow) {
      router.push(`/invoices/${selectedRow.id}`);
    }
    handleMenuClose();
  };

  const handleAddPayment = () => {
    if (selectedRow) {
      handlePaymentDialogOpen(selectedRow);
    }
    handleMenuClose();
  };

  const handleInvoiceNumberClick = (invoice: Invoice) => {
    setSelectedInvoiceForModal(invoice);
    setInvoiceModalOpen(true);
  };

  const handleAddNewPayment = async () => {
    if (!selectedInvoiceForModal || newPaymentAmount <= 0) return;

    try {
      await addPayment(selectedInvoiceForModal.id, newPaymentAmount);
      setSnackbar({
        open: true,
        message: "Payment added successfully!",
        severity: "success"
      });
      refreshInvoices();
      setNewPaymentAmount(0);
      const updatedInvoice = await getInvoiceById(selectedInvoiceForModal.id);
      setSelectedInvoiceForModal(updatedInvoice);
    } catch (err) {
      console.error("Payment failed:", err);
      setSnackbar({
        open: true,
        message: "Failed to add payment. Please try again.",
        severity: "error"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      currencyDisplay: 'narrowSymbol',
    }).format(amount);
  };

  const handlePrintInvoice = () => {
    if (!selectedInvoiceForModal) return;

    let printCancelled = true;

    const handleAfterPrint = () => {
      printCancelled = false;
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('beforeprint', handleBeforePrint);
      if (printCancelled) {
        setInvoiceModalOpen(false);
        router.push('/utilities/saleInvoice');
      }
    };

    const handleBeforePrint = () => {
      printCancelled = false;
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice #${selectedInvoiceForModal.invoiceNumber || selectedInvoiceForModal.id}</title>
            <style>
              @media print {
                body {
                  font-family: 'Helvetica', Arial, sans-serif;
                  margin: 20mm;
                  color: #333;
                  line-height: 1.5;
                }
                .invoice-container {
                  max-width: 800px;
                  margin: 0 auto;
                }
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 30px;
                  border-bottom: 2px solid #2f80ed;
                  padding-bottom: 10px;
                }
                .header h1 {
                  font-size: 24px;
                  color: #2f80ed;
                }
                .info-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 20px;
                  margin-bottom: 30px;
                }
                .info-section h3 {
                  font-size: 16px;
                  margin-bottom: 10px;
                  color: #2f80ed;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 30px;
                }
                th, td {
                  border: 1px solid #ddd;
                  padding: 8px;
                  text-align: left;
                }
                th {
                  background-color: #2f80ed;
                  color: white;
                  font-weight: bold;
                }
                .summary {
                  max-width: 300px;
                  float: right;
                }
                .summary div {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 5px;
                }
                .summary .total {
                  font-weight: bold;
                  border-top: 1px solid #ddd;
                  padding-top: 5px;
                }
                @page {
                  size: A4;
                  margin: 15mm;
                }
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <div class="header">
                <div>
                  <h1>INVOICE</h1>
                  <p>#${selectedInvoiceForModal.invoiceNumber || selectedInvoiceForModal.id}</p>
                </div>
                <div style="text-align: right;">
                  <p><strong>Date:</strong> ${formatDate(selectedInvoiceForModal.date)}</p>
                  <p><strong>Due Date:</strong> ${formatDate(selectedInvoiceForModal.dueDate)}</p>
                  <p><strong>Status:</strong> ${selectedInvoiceForModal.status}</p>
                </div>
              </div>
              <div class="info-grid">
                <div class="info-section">
                  <h3>BILL TO</h3>
                  <p>${selectedInvoiceForModal.customerDetails?.name || selectedInvoiceForModal.customer}</p>
                  ${selectedInvoiceForModal.customerDetails?.email ? `<p>${selectedInvoiceForModal.customerDetails.email}</p>` : ''}
                  ${selectedInvoiceForModal.customerDetails?.phone ? `<p>${selectedInvoiceForModal.customerDetails.phone}</p>` : ''}
                  ${selectedInvoiceForModal.customerDetails?.address ? `<p>${selectedInvoiceForModal.customerDetails.address}</p>` : ''}
                </div>
                <div class="info-section" style="text-align: right;">
                  <h3>FROM</h3>
                  <p>Your Company Name</p>
                  <p>accounts@yourcompany.com</p>
                  <p>123 Business Street, City, Country</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style="text-align: right;">Qty</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${selectedInvoiceForModal.products.map(product => `
                    <tr>
                      <td>${product.name}</td>
                      <td style="text-align: right;">${product.quantity}</td>
                      <td style="text-align: right;">${formatCurrency(product.price)}</td>
                      <td style="text-align: right;">${formatCurrency(product.quantity * product.price)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="summary">
                <div>
                  <span>Subtotal:</span>
                  <span>${formatCurrency(selectedInvoiceForModal.subtotal)}</span>
                </div>
                <div>
                  <span>Tax:</span>
                  <span>${formatCurrency(selectedInvoiceForModal.tax || 0)}</span>
                </div>
                <div>
                  <span>Discount:</span>
                  <span>${formatCurrency(selectedInvoiceForModal.discount || 0)}</span>
                </div>
                <div class="total">
                  <span>Total:</span>
                  <span>${formatCurrency(selectedInvoiceForModal.total)}</span>
                </div>
                <div>
                  <span>Amount Paid:</span>
                  <span>${formatCurrency(selectedInvoiceForModal.paid)}</span>
                </div>
                <div class="total">
                  <span>Balance Due:</span>
                  <span>${formatCurrency(selectedInvoiceForModal.due)}</span>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();

      // Fallback for browsers that don't support afterprint
      setTimeout(() => {
        if (printCancelled) {
          printWindow.close();
          setInvoiceModalOpen(false);
          router.push('/utilities/saleInvoice');
        }
      }, 1000);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedInvoiceForModal) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Header
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 15, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.text("Your Company Name", 14, 10);

    // Invoice Title
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 14, 25);

    // Invoice Details
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`#${selectedInvoiceForModal.invoiceNumber || selectedInvoiceForModal.id}`, 14, 32);
    doc.text(`Date: ${formatDate(selectedInvoiceForModal.date)}`, 150, 25);
    doc.text(`Due Date: ${formatDate(selectedInvoiceForModal.dueDate)}`, 150, 32);
    doc.text(`Status: ${selectedInvoiceForModal.status}`, 150, 39);

    // Customer and Company Info
    const infoY = 45;
    doc.setFontSize(11);
    doc.setTextColor(41, 128, 185);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO", 14, infoY);
    doc.text("FROM", 105, infoY);

    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.setFont("helvetica", "normal");
    let yPos = infoY + 7;
    doc.text(
      String(
        selectedInvoiceForModal.customerDetails?.name ??
        selectedInvoiceForModal.customer ??
        ""
      ),
      14,
      yPos
    );
    
    doc.text("Inceptious Tech", 105, yPos);
    yPos += 5;
    if (selectedInvoiceForModal.customerDetails?.email) {
      doc.text(selectedInvoiceForModal.customerDetails.email, 14, yPos);
      yPos += 5;
    }
    doc.text("accounts@yourcompany.com", 105, yPos);
    yPos += 5;
    if (selectedInvoiceForModal.customerDetails?.phone) {
      doc.text(selectedInvoiceForModal.customerDetails.phone, 14, yPos);
      yPos += 5;
    }
    doc.text("123 Business Street, City, Country", 105, yPos);
    yPos += 5;
    if (selectedInvoiceForModal.customerDetails?.address) {
      doc.text(selectedInvoiceForModal.customerDetails.address, 14, yPos);
    }

    // Items Table
    const tableData = selectedInvoiceForModal.products.map(product => [
      product.name,
      product.quantity.toString(),
      formatCurrency(product.price),
      formatCurrency(product.quantity * product.price)
    ]);

    autoTable(doc, {
      head: [['Item', 'Qty', 'Price', 'Amount']],
      body: tableData,
      startY: yPos + 10,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        textColor: [40, 40, 40],
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      }
    });

    // Summary
    const summaryY = (doc as any).lastAutoTable.finalY + 10;
    const summaryX = 130;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Subtotal: ${formatCurrency(selectedInvoiceForModal.subtotal)}`, summaryX, summaryY);
    doc.text(`Tax: ${formatCurrency(selectedInvoiceForModal.tax || 0)}`, summaryX, summaryY + 7);
    doc.text(`Discount: ${formatCurrency(selectedInvoiceForModal.discount || 0)}`, summaryX, summaryY + 14);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${formatCurrency(selectedInvoiceForModal.total)}`, summaryX, summaryY + 21);
    doc.setFont("helvetica", "normal");
    doc.text(`Amount Paid: ${formatCurrency(selectedInvoiceForModal.paid)}`, summaryX, summaryY + 28);
    doc.setFont("helvetica", "bold");
    doc.text(`Balance Due: ${formatCurrency(selectedInvoiceForModal.due)}`, summaryX, summaryY + 35);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Thank you for your business!", 105, summaryY + 50, { align: "center" });

    doc.save(`Invoice_${selectedInvoiceForModal.invoiceNumber || selectedInvoiceForModal.id}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const renderLoadingRows = () => {
    return Array.from({ length: rowsPerPage }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        {[...Array(9)].map((_, colIndex) => (
          <TableCell key={`skeleton-col-${colIndex}`}>
            <Skeleton variant="text" width="80%" />
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ 
        p: { xs: 2, sm: 3, md: 4 },
        backgroundColor: theme.palette.background.paper,
        minHeight: '100vh',
        maxWidth: '100%',
        margin: '0 auto'
      }}>
        {loading && (
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
            zIndex: theme.zIndex.modal
          }}>
            <Stack direction="column" alignItems="center" spacing={2}>
              <CircularProgress size={60} thickness={4} />
              <Typography variant="h6" color="textSecondary">
                Loading invoices...
              </Typography>
            </Stack>
          </Box>
        )}

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

        <Paper sx={{ 
          width: '100%', 
          overflow: 'hidden', 
          p: { xs: 2, sm: 3 },
          boxShadow: 3,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper
        }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2
          }}>
            <Typography 
              variant={isSmallScreen ? "h5" : "h4"} 
              sx={{ 
                fontWeight: 700,
                color: theme.palette.text.primary
              }}
            >
              Sale Invoices
            </Typography>
            
            <Box sx={{
              display: 'flex',
              gap: 2,
              width: { xs: '100%', sm: 'auto' },
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' }
            }}>
              <TextField
                variant="outlined"
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                sx={{
                  width: { xs: '100%', sm: 300 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VisibilityIcon color="action" />
                    </InputAdornment>
                  )
                }}
              />
              <Button
                variant="contained"
                onClick={() => router.push('/utilities/createInvoice')}
                sx={{
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  textTransform: 'none',
                  width: { xs: '100%', sm: 'auto' }
                }}
              >
                + Create Invoice
              </Button>
            </Box>
          </Box>

          <TableContainer sx={{ 
            overflowX: 'auto',
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`
          }}>
            <Table stickyHeader aria-label="sticky table" sx={{ minWidth: { xs: 600, md: 800 } }}>
              <TableHead>
                <TableRow>
                  {['Invoice #', 'Date', 'Customer', 'Total', 'Paid', 'Due', 'Due Date', 'Status', 'Actions'].map((header) => (
                    <TableCell key={header} sx={{ 
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.common.white,
                      fontWeight: 600,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      whiteSpace: 'nowrap'
                    }}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  renderLoadingRows()
                ) : filteredInvoices.length > 0 ? (
                  filteredInvoices
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((invoice) => {
                      const isOverdue = invoice.status === "Overdue" ||
                        (invoice.status === "Pending" && new Date(invoice.dueDate) < new Date());
                      const isPaid = invoice.status === "Paid" || invoice.due <= 0;

                      return (
                        <TableRow hover key={invoice.id}>
                          <TableCell>
                            <Button 
                              onClick={() => handleInvoiceNumberClick(invoice)}
                              sx={{
                                textTransform: 'none',
                                color: theme.palette.primary.main,
                                fontWeight: 500,
                                p: 0,
                                minWidth: 0,
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                '&:hover': {
                                  textDecoration: 'underline',
                                  backgroundColor: 'transparent'
                                }
                              }}
                            >
                              {invoice.invoiceNumber || invoice.id}
                            </Button>
                          </TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {formatDate(invoice.date)}
                          </TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            <Tooltip title={invoice.customer || "N/A"} arrow>
                              <Typography sx={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: { xs: 100, sm: 150 }
                              }}>
                                {invoice.customer || "N/A"}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {formatCurrency(invoice.total)}
                          </TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {formatCurrency(invoice.paid)}
                          </TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {formatCurrency(invoice.due)}
                          </TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {formatDate(invoice.dueDate)}
                          </TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {isPaid ? (
                              <Chip 
                                label="Paid" 
                                color="success" 
                                size="small" 
                                sx={{ fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                              />
                            ) : isOverdue ? (
                              <Chip 
                                label="Overdue" 
                                color="error" 
                                size="small" 
                                sx={{ fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                              />
                            ) : (
                              <Chip 
                                label="Pending" 
                                color="warning" 
                                size="small" 
                                sx={{ fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              onClick={(event) => handleMenuClick(event, invoice)}
                              sx={{
                                color: theme.palette.text.secondary,
                                '&:hover': {
                                  color: theme.palette.primary.main
                                }
                              }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="textSecondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {search ? "No matching invoices found" : "No invoices available"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredInvoices.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              borderTop: `1px solid ${theme.palette.divider}`,
              '& .MuiTablePagination-toolbar': {
                padding: { xs: 1, sm: 2 },
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }
            }}
          />
        </Paper>

        <Dialog 
          open={openDialog} 
          onClose={handlePaymentDialogClose}
          PaperProps={{
            sx: {
              borderRadius: 2,
              p: 2,
              minWidth: { xs: '90%', sm: 500 },
              backgroundColor: theme.palette.background.paper
            }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 600,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.common.white,
            borderRadius: '8px 8px 0 0'
          }}>
            Add Payment
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
            {selectedInvoice && (
              <Stack spacing={2}>
                <Typography variant="body1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  <strong>Invoice:</strong> {selectedInvoice.invoiceNumber || selectedInvoice.id}
                </Typography>
                <Typography variant="body1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  <strong>Customer:</strong> {selectedInvoice.customer || "N/A"}
                </Typography>
                <Typography variant="body1" color="error.main" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  <strong>Current Due:</strong> {formatCurrency(selectedInvoice.due)}
                </Typography>
                <TextField
                  label="Payment Amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  fullWidth
                  sx={{ mt: 2 }}
                  inputProps={{
                    min: 0.01,
                    max: selectedInvoice.due,
                    step: "any"
                  }}
                  disabled={loading}
                  variant="outlined"
                  size="small"
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'flex-end' }}>
            <Button
              onClick={handlePaymentDialogClose}
              disabled={loading}
              variant="outlined"
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePaymentSubmit}
              color="primary"
              variant="contained"
              disabled={
                loading ||
                !selectedInvoice ||
                paymentAmount <= 0 ||
                paymentAmount > (selectedInvoice?.due || 0)
              }
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              {loading ? "Processing..." : "Add Payment"}
            </Button>
          </DialogActions>
        </Dialog>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 3,
            sx: {
              borderRadius: 2,
              minWidth: 180,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              '& .MuiMenuItem-root': {
                px: 2,
                py: 1,
                typography: 'body2',
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }
            }
          }}
        >
          <MenuItem onClick={handleViewDetails}>
            <ListItemIcon>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            View Details
          </MenuItem>
          <MenuItem onClick={handleAddPayment}>
            <ListItemIcon>
              <PaymentIcon fontSize="small" />
            </ListItemIcon>
            Add Payment
          </MenuItem>
          <MenuItem onClick={() => {
            if (selectedRow) {
              router.push(`/utilities/invoices/edit/${selectedRow.id}`);
            }
            handleMenuClose();
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            Edit
          </MenuItem>
          <MenuItem onClick={async () => {
            if (selectedRow) {
              try {
                await deleteInvoice(selectedRow.id);
                setSnackbar({
                  open: true,
                  message: "Invoice deleted successfully!",
                  severity: "success"
                });
              } catch (err) {
                setSnackbar({
                  open: true,
                  message: "Failed to delete invoice",
                  severity: "error"
                });
              }
            }
            handleMenuClose();
          }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            Delete
          </MenuItem>
        </Menu>

        <Modal
          open={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          aria-labelledby="invoice-modal-title"
          aria-describedby="invoice-modal-description"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 1, sm: 2 },
            overflow: 'auto'
          }}
        >
          <Paper sx={{
            width: { xs: '95%', sm: '90%', md: 800 },
            maxHeight: '90vh',
            overflowY: 'auto',
            p: { xs: 2, sm: 3 },
            position: 'relative',
            borderRadius: 3,
            boxShadow: 6,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`
          }}>
            <IconButton
              sx={{
                position: 'absolute',
                right: 12,
                top: 12,
                color: theme.palette.grey[500],
                backgroundColor: theme.palette.grey[100],
                '&:hover': {
                  backgroundColor: theme.palette.grey[200]
                }
              }}
              onClick={() => setInvoiceModalOpen(false)}
            >
              <CloseIcon />
            </IconButton>

            {selectedInvoiceForModal && (
              <>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                  pb: 2,
                  borderBottom: `2px solid ${theme.palette.primary.main}`
                }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      INVOICE
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      #{selectedInvoiceForModal.invoiceNumber || selectedInvoiceForModal.id}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body1" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      <strong>Date:</strong> {formatDate(selectedInvoiceForModal.date)}
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      <strong>Due Date:</strong> {formatDate(selectedInvoiceForModal.dueDate)}
                    </Typography>
                    <Chip 
                      label={selectedInvoiceForModal.status} 
                      color={
                        selectedInvoiceForModal.status === 'Paid' ? 'success' : 
                        selectedInvoiceForModal.status === 'Overdue' ? 'error' : 'warning'
                      } 
                      size="small"
                      sx={{ mt: 1, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    />
                  </Box>
                </Box>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6" gutterBottom sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.primary.main,
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}>
                      BILL TO
                    </Typography>
                    <Typography variant="body1" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {selectedInvoiceForModal.customerDetails?.name || selectedInvoiceForModal.customer}
                    </Typography>
                    {selectedInvoiceForModal.customerDetails?.email && (
                      <Typography variant="body2" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {selectedInvoiceForModal.customerDetails.email}
                      </Typography>
                    )}
                    {selectedInvoiceForModal.customerDetails?.phone && (
                      <Typography variant="body2" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {selectedInvoiceForModal.customerDetails.phone}
                      </Typography>
                    )}
                    {selectedInvoiceForModal.customerDetails?.address && (
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {selectedInvoiceForModal.customerDetails.address}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6" gutterBottom sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.primary.main,
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}>
                      FROM
                    </Typography>
                    <Typography variant="body1" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      Your Company Name
                    </Typography>
                    <Typography variant="body2" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      accounts@yourcompany.com
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      123 Business Street, City, Country
                    </Typography>
                  </Grid>
                </Grid>

                <TableContainer sx={{ 
                  mb: 4,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2
                }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: theme.palette.primary.light }}>
                        <TableCell sx={{ 
                          fontWeight: 'bold',
                          color: theme.palette.primary.contrastText,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>Item</TableCell>
                        <TableCell align="right" sx={{ 
                          fontWeight: 'bold',
                          color: theme.palette.primary.contrastText,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>Qty</TableCell>
                        <TableCell align="right" sx={{ 
                          fontWeight: 'bold',
                          color: theme.palette.primary.contrastText,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>Price</TableCell>
                        <TableCell align="right" sx={{ 
                          fontWeight: 'bold',
                          color: theme.palette.primary.contrastText,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedInvoiceForModal.products.map((product, index) => (
                        <TableRow key={index}>
                          <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{product.name}</TableCell>
                          <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{product.quantity}</TableCell>
                          <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{formatCurrency(product.price)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {formatCurrency(product.quantity * product.price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end',
                  mb: 4
                }}>
                  <Box sx={{ width: { xs: '100%', sm: 300 } }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      mb: 1
                    }}>
                      <Typography variant="body1" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Subtotal:</Typography>
                      <Typography variant="body1" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {formatCurrency(selectedInvoiceForModal.subtotal)}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      mb: 1
                    }}>
                      <Typography variant="body1" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Tax:</Typography>
                      <Typography variant="body1" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {formatCurrency(selectedInvoiceForModal.tax || 0)}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      mb: 1
                    }}>
                      <Typography variant="body1" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Discount:</Typography>
                      <Typography variant="body1" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {formatCurrency(selectedInvoiceForModal.discount || 0)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      mb: 1
                    }}>
                      <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Total:</Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {formatCurrency(selectedInvoiceForModal.total)}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      mb: 1
                    }}>
                      <Typography variant="body1" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Amount Paid:</Typography>
                      <Typography variant="body1" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {formatCurrency(selectedInvoiceForModal.paid)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between'
                    }}>
                      <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Balance Due:</Typography>
                      <Typography 
                        variant="body1" 
                        fontWeight="bold"
                        color={selectedInvoiceForModal.due <= 0 ? 'success.main' : 'error.main'}
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        {formatCurrency(selectedInvoiceForModal.due)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ 
                  p: { xs: 2, sm: 3 }, 
                  backgroundColor: theme.palette.grey[100],
                  borderRadius: 2,
                  mb: 3,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    fontWeight: 'bold',
                    color: theme.palette.primary.main,
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }}>
                    RECORD PAYMENT
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Amount"
                        type="number"
                        fullWidth
                        value={newPaymentAmount}
                        onChange={(e) => setNewPaymentAmount(parseFloat(e.target.value) || 0)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">PKR</InputAdornment>
                          ),
                          inputProps: {
                            min: 0.01,
                            max: selectedInvoiceForModal.due,
                            step: "any"
                          }
                        }}
                        variant="outlined"
                        size="small"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Payment Date"
                        value={new Date(paymentDate)}
                        onChange={(newValue) => {
                          if (newValue) {
                            setPaymentDate(newValue.toISOString().split('T')[0]);
                          }
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            sx: { fontSize: { xs: '0.75rem', sm: '0.875rem' } }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        startIcon={<AttachMoneyIcon />}
                        onClick={handleAddNewPayment}
                        disabled={newPaymentAmount <= 0 || newPaymentAmount > selectedInvoiceForModal.due}
                        sx={{ 
                          mt: 1, 
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}
                      >
                        Record Payment
                      </Button>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    fontWeight: 'bold',
                    color: theme.palette.primary.main,
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }}>
                    PAYMENT HISTORY
                  </Typography>
                  <TableContainer sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2
                  }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: theme.palette.primary.light }}>
                          <TableCell sx={{ 
                            fontWeight: 'bold',
                            color: theme.palette.primary.contrastText,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}>Date</TableCell>
                          <TableCell align="right" sx={{ 
                            fontWeight: 'bold',
                            color: theme.palette.primary.contrastText,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}>Amount</TableCell>
                          <TableCell sx={{ 
                            fontWeight: 'bold',
                            color: theme.palette.primary.contrastText,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}>Method</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedInvoiceForModal.paymentHistory && selectedInvoiceForModal.paymentHistory.length > 0 ? (
                          selectedInvoiceForModal.paymentHistory.map((payment, index) => (
                            <TableRow key={index}>
                              <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                {formatDate(payment.date)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                {formatCurrency(payment.amount)}
                              </TableCell>
                              <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                {payment.method === 'Cash' ? 'Cash' : 
                                 payment.method === 'CreditCard' ? 'Credit Card' : 'Bank Transfer'}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} align="center" sx={{ py: 2 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                No payment history available
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {selectedInvoiceForModal.notes && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.primary.main,
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}>
                      NOTES
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {selectedInvoiceForModal.notes}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end',
                  gap: 2,
                  mt: 3,
                  flexWrap: 'wrap'
                }}>
                  <Button
                    variant="outlined"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={handleDownloadPDF}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      px: 3,
                      py: 1
                    }}
                  >
                    Save as PDF
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PrintIcon />}
                    onClick={handlePrintInvoice}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      px: 3,
                      py: 1
                    }}
                  >
                    Print
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        </Modal>
      </Box>
    </LocalizationProvider>
  );
};

export default SaleInvoice;