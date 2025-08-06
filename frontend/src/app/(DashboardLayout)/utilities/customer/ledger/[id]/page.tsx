/* The above code is a TypeScript React component that displays a customer ledger for a specific
customer. It fetches customer and invoice data, prepares ledger entries based on invoices and
payments, and allows filtering and pagination of the ledger entries. It also provides functionality
to refresh the ledger, print the ledger statement, and export the ledger as a PDF. The component
includes a table to display ledger entries, filters for search, date range, and type, as well as a
modal to view detailed information about individual invoices. */
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Avatar,
  Divider,
  TextField,
  IconButton,
  Tooltip,
  useTheme,
  TablePagination,
  CircularProgress,
  Skeleton,
  Stack,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  DateRange as DateRangeIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useCustomerContext } from "@/app/(DashboardLayout)/utilities/context/CustomerContext";
import { useInvoiceContext } from "@/app/(DashboardLayout)/utilities/context/InvoiceContext";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO, isWithinInterval } from "date-fns";

interface Payment {
  date: string;
  amount: number;
  method?: string;
}

interface Invoice {
  id: string;
  date: string;
  invoiceNumber?: string;
  customer: string;
  customerDetails?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  total: number;
  paid: number;
  due: number;
  products: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  paymentHistory?: Payment[];
}

interface LedgerEntry {
  id: string;
  date: string;
  type: "invoice" | "payment";
  documentNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  invoiceId?: string;
}

const CustomerLedger = () => {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const theme = useTheme();
  const { customers } = useCustomerContext();
  const { invoices, loading: invoicesLoading } = useInvoiceContext();

  const [customer, setCustomer] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<LedgerEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: null as Date | null,
    end: null as Date | null,
  });
  const [filterType, setFilterType] = useState<"all" | "invoice" | "payment">("all");

  // Calculate totals
  const totalDebit = filteredEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = filteredEntries.reduce((sum, entry) => sum + entry.credit, 0);

  // Prepare ledger entries with useCallback to prevent unnecessary recreations
  const prepareLedgerEntries = useCallback((customerId: string) => {
    setIsLoading(true);

    try {
      // Filter invoices for this customer
      const customerInvoices = invoices.filter(inv =>
        inv.customerDetails?._id === customerId ||
        inv.customer === customerId
      ) as Invoice[];

      const entries: LedgerEntry[] = [];
      let runningBalance = 0;

      // Create a flat array of all invoice and payment events
      const allEvents: Array<{
        type: "invoice" | "payment";
        date: string;
        data: Invoice;
        amount: number;
      }> = [];

      for (const inv of customerInvoices) {
        // Add invoice entry
        allEvents.push({
          type: "invoice",
          date: inv.date,
          data: inv,
          amount: inv.total
        });

        // Add payment entries from payment history if available
        if (inv.paymentHistory && inv.paymentHistory.length > 0) {
          for (const payment of inv.paymentHistory) {
            allEvents.push({
              type: "payment",
              date: payment.date,
              data: inv,
              amount: payment.amount
            });
          }
        } else if (inv.paid > 0) {
          // Fallback to single payment if no payment history
          allEvents.push({
            type: "payment",
            date: inv.date,
            data: inv,
            amount: inv.paid
          });
        }
      }

      // Sort all events by date (oldest first)
      allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Process sorted events to create ledger entries
      for (const event of allEvents) {
        if (event.type === "invoice") {
          const entry: LedgerEntry = {
            id: event.data.id,
            date: event.date,
            type: "invoice",
            documentNumber: event.data.invoiceNumber || `INV-${event.data.id.slice(-6)}`,
            description: `Invoice ${event.data.invoiceNumber || event.data.id}`,
            debit: event.amount,
            credit: 0,
            balance: runningBalance + event.amount,
            invoiceId: event.data.id,
          };
          runningBalance += event.amount;
          entries.push(entry);
        } else {
          const entry: LedgerEntry = {
            id: `${event.data.id}-payment-${event.date}`,
            date: event.date,
            type: "payment",
            documentNumber: `PAY-${event.data.invoiceNumber?.slice(-4) || event.data.id.slice(-4)}`,
            description: `Payment for Invoice ${event.data.invoiceNumber || event.data.id}`,
            debit: 0,
            credit: event.amount,
            balance: runningBalance - event.amount,
            invoiceId: event.data.id,
          };
          runningBalance -= event.amount;
          entries.push(entry);
        }
      }

      setLedgerEntries(entries);
      setFilteredEntries(entries);
      setBalance(runningBalance);
    } catch (error) {
      console.error("Error preparing ledger entries:", error);
    } finally {
      setIsLoading(false);
    }
  }, [invoices]);

  // Load customer data and prepare ledger entries
  useEffect(() => {
    if (!customerId || !customers.length || invoicesLoading) return;

    const foundCustomer = customers.find(c => c.id === customerId);

    if (!foundCustomer) {
      router.push("/utilities/customer");
      return;
    }

    setCustomer(foundCustomer);
    prepareLedgerEntries(foundCustomer.id);
  }, [customerId, customers, invoicesLoading, prepareLedgerEntries, router]);

  // Apply all filters (search, date range, type)
  useEffect(() => {
    let filtered = ledgerEntries;

    // Apply search filter
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(entry =>
        entry.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.date.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(entry => {
        const entryDate = parseISO(entry.date);
        return isWithinInterval(entryDate, {
          start: dateRange.start!,
          end: dateRange.end!
        });
      });
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(entry => entry.type === filterType);
    }

    setFilteredEntries(filtered);
    setPage(0);
  }, [searchTerm, ledgerEntries, dateRange, filterType]);

  // Rest of the component remains the same...
  const handleDateRangeChange = (type: "start" | "end", value: Date | null) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const clearDateFilter = () => {
    setDateRange({ start: null, end: null });
  };

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = () => {
    if (customer) {
      prepareLedgerEntries(customer.id);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Customer Ledger - ${customer?.name}</title>
            <style>
              @media print {
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 20mm; 
                  color: #333;
                }
                .ledger-container { 
                  width: 100%; 
                  max-width: 1000px; 
                  margin: 0 auto;
                }
                .header { 
                  text-align: center; 
                  margin-bottom: 20px;
                }
                .customer-info { 
                  display: flex; 
                  justify-content: space-between; 
                  margin-bottom: 20px;
                  font-size: 14px;
                }
                table { 
                  width: 100%; 
                  border-collapse: collapse; 
                  margin-bottom: 20px;
                }
                th, td { 
                  border: 1px solid #ddd; 
                  padding: 8px; 
                  text-align: left; 
                  font-size: 12px;
                }
                th { 
                  background-color: #2f80ed; 
                  color: white; 
                  font-weight: bold;
                }
                .total-row { 
                  font-weight: bold; 
                  background-color: #f5f5f5;
                }
                .summary { 
                  margin-top: 20px; 
                  font-size: 14px;
                }
                .footer { 
                  text-align: center; 
                  margin-top: 20px; 
                  font-size: 12px; 
                  color: #666;
                }
                @page { 
                  size: A4; 
                  margin: 15mm;
                }
              }
            </style>
          </head>
          <body>
            <div class="ledger-container">
              <div class="header">
                <h1>Customer Ledger Statement</h1>
                <p>Generated by Your Company Name</p>
              </div>
              <div class="customer-info">
                <div>
                  <p><strong>Customer Name:</strong> ${customer?.name || 'N/A'}</p>
                  <p><strong>Contact:</strong> ${customer?.phone || 'N/A'}</p>
                  <p><strong>Email:</strong> ${customer?.email || 'N/A'}</p>
                  <p><strong>Address:</strong> ${customer?.address || 'N/A'}</p>
                </div>
                <div style="text-align: right;">
                  <p><strong>Statement Date:</strong> ${format(new Date(), 'MMMM dd, yyyy')}</p>
                  <p><strong>Current Balance:</strong> R.s ${balance.toFixed(2)}</p>
                  <p><strong>Balance Status:</strong> ${balance >= 0 ? 'Receivable' : 'Payable'}</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Doc #</th>
                    <th>Description</th>
                    <th style="text-align: right;">Debit</th>
                    <th style="text-align: right;">Credit</th>
                    <th style="text-align: right;">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredEntries.map(entry => `
                    <tr>
                      <td>${formatDate(entry.date)}</td>
                      <td>${entry.documentNumber}</td>
                      <td>${entry.description}</td>
                      <td style="text-align: right;">${entry.debit > 0 ? `R.s ${entry.debit.toFixed(2)}` : '-'}</td>
                      <td style="text-align: right;">${entry.credit > 0 ? `R.s ${entry.credit.toFixed(2)}` : '-'}</td>
                      <td style="text-align: right;">R.s ${entry.balance.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td colspan="3" style="text-align: right;">Totals:</td>
                    <td style="text-align: right;">R.s ${totalDebit.toFixed(2)}</td>
                    <td style="text-align: right;">R.s ${totalCredit.toFixed(2)}</td>
                    <td style="text-align: right;">R.s ${balance.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <div class="summary">
                <h3>Summary</h3>
                <p><strong>Total Debit:</strong> R.s ${totalDebit.toFixed(2)}</p>
                <p><strong>Total Credit:</strong> R.s ${totalCredit.toFixed(2)}</p>
                <p><strong>Net Balance:</strong> R.s ${balance.toFixed(2)}</p>
                <p><strong>Balance Status:</strong> ${balance >= 0 ? 'Customer owes you' : 'You owe customer'}</p>
              </div>
              <div class="footer">
                <p>Thank you for your business!</p>
                <p>For any inquiries, please contact accounts@yourcompany.com</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Add logo or company branding
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 15, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.text("Your Company Name", 14, 10);

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text("Customer Ledger Statement", 105, 25, { align: "center" });

    // Customer Information
    const customerInfoY = 35;
    const lineHeight = 7;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.setFont("helvetica", "normal");
    
    // Left column
    doc.text(`Customer Name: ${customer?.name || 'N/A'}`, 14, customerInfoY);
    doc.text(`Contact: ${customer?.phone || 'N/A'}`, 14, customerInfoY + lineHeight);
    doc.text(`Email: ${customer?.email || 'N/A'}`, 14, customerInfoY + lineHeight * 2);
    doc.text(`Address: ${customer?.address || 'N/A'}`, 14, customerInfoY + lineHeight * 3);
    
    // Right column
    doc.text(`Statement Date: ${format(new Date(), 'MMMM dd, yyyy')}`, 195, customerInfoY, { align: "right" });
    doc.text(`Current Balance: R.s ${balance.toFixed(2)}`, 195, customerInfoY + lineHeight, { align: "right" });
    doc.text(`Balance Status: ${balance >= 0 ? 'Receivable' : 'Payable'}`, 195, customerInfoY + lineHeight * 2, { align: "right" });

    // Divider
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(14, customerInfoY + lineHeight * 4, 195, customerInfoY + lineHeight * 4);

    // Table
    const tableData = filteredEntries.map(entry => [
      formatDate(entry.date),
      entry.documentNumber,
      entry.description,
      entry.debit > 0 ? `R.s ${entry.debit.toFixed(2)}` : '-',
      entry.credit > 0 ? `R.s ${entry.credit.toFixed(2)}` : '-',
      `R.s ${entry.balance.toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: [['Date', 'Doc #', 'Description', 'Debit', 'Credit', 'Balance']],
      body: [
        ...tableData,
        ['', '', 'Totals', `R.s ${totalDebit.toFixed(2)}`, `R.s ${totalCredit.toFixed(2)}`, `R.s ${balance.toFixed(2)}`]
      ],
      startY: customerInfoY + lineHeight * 5,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        valign: 'middle',
        textColor: [40, 40, 40],
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 65 },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${(doc as any).internal.getNumberOfPages()}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    });

    // Summary
    const summaryY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, summaryY);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Debit: R.s ${totalDebit.toFixed(2)}`, 14, summaryY + 8);
    doc.text(`Total Credit: R.s ${totalCredit.toFixed(2)}`, 14, summaryY + 16);
    doc.text(`Net Balance: R.s ${balance.toFixed(2)}`, 14, summaryY + 24);
    doc.text(`Balance Status: ${balance >= 0 ? 'Customer owes you' : 'You owe customer'}`, 14, summaryY + 32);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Thank you for your business!", 105, summaryY + 45, { align: "center" });
    doc.text("For inquiries: accounts@yourcompany.com | www.yourcompany.com", 105, summaryY + 50, { align: "center" });

    doc.save(`Ledger_Statement_${customer?.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const formatCurrency = (amount: number) => {
    return `R.s ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const handleInvoiceClick = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice as Invoice);
      setInvoiceModalOpen(true);
    }
  };

  if (!customer) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3, md: 4 },
      maxWidth: '100%',
      margin: '0 auto',
      overflowX: 'hidden'
    }}>
      {/* Header Section */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3,
        gap: 2,
        backgroundColor: theme.palette.background.paper,
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        boxShadow: theme.shadows[2],
        flexWrap: 'wrap'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <IconButton
            onClick={() => router.push('/utilities/customer')}
            sx={{
              backgroundColor: theme.palette.grey[200],
              '&:hover': { backgroundColor: theme.palette.grey[300] }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography 
              variant="h5" 
              component="h1" 
              sx={{ 
                fontWeight: 700, 
                color: theme.palette.text.primary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              Customer Ledger
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {customer?.name} - {customer?.email}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          flexWrap: 'wrap',
          justifyContent: { xs: 'flex-start', sm: 'flex-end' },
          mt: { xs: 2, sm: 0 }
        }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={isLoading}
            size="small"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            size="small"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Print
          </Button>
          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={handleExportPDF}
            size="small"
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              backgroundColor: theme.palette.error.main,
              '&:hover': { backgroundColor: theme.palette.error.dark }
            }}
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {/* Customer Summary Card */}
      <Paper sx={{
        p: { xs: 2, sm: 3 },
        mb: 3,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[100]} 100%)`,
        boxShadow: theme.shadows[2],
        borderRadius: 2,
        borderLeft: `4px solid ${theme.palette.primary.main}`,
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          flex: 1,
          minWidth: 0
        }}>
          <Avatar sx={{
            width: { xs: 40, sm: 48 },
            height: { xs: 40, sm: 48 },
            bgcolor: theme.palette.primary.main,
            fontSize: { xs: '1rem', sm: '1.2rem' },
            boxShadow: theme.shadows[1]
          }}>
            {customer?.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography 
              variant="subtitle1" 
              fontWeight={600} 
              color="text.primary"
              sx={{ 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {customer?.name}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {customer?.phone}
            </Typography>
          </Box>
        </Box>

        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: { xs: 'flex-start', sm: 'flex-end' },
          backgroundColor: theme.palette.grey[200],
          p: { xs: 1, sm: 1.5 },
          borderRadius: 1,
          minWidth: { xs: '100%', sm: 180 },
          width: { xs: '100%', sm: 'auto' }
        }}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
          >
            Current Balance
          </Typography>
          <Typography 
            variant="h5" 
            fontWeight={700} 
            color={balance >= 0 ? 'primary.main' : 'error.main'}
            sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}
          >
            {formatCurrency(Math.abs(balance))}
            <Typography 
              component="span" 
              variant="body2" 
              sx={{ 
                ml: 1, 
                fontSize: { xs: '0.7rem', sm: '0.75rem' } 
              }}
            >
              {balance >= 0 ? '(Receivable)' : '(Payable)'}
            </Typography>
          </Typography>
        </Box>
      </Paper>

      {/* Filters Section */}
      <Paper sx={{
        p: { xs: 2, sm: 3 },
        mb: 3,
        borderRadius: 2,
        boxShadow: theme.shadows[1],
      }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
                sx: { borderRadius: 2 }
              }}
              size="small"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                label="Type"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="invoice">Invoices</MenuItem>
                <MenuItem value="payment">Payments</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={5}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                alignItems: 'center',
                flexWrap: { xs: 'wrap', sm: 'nowrap' }
              }}>
                <DatePicker
                  label="Start Date"
                  value={dateRange.start}
                  onChange={(date) => handleDateRangeChange("start", date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      sx: { flex: 1 }
                    }
                  }}
                />
                <DateRangeIcon sx={{ color: 'action.active' }} />
                <DatePicker
                  label="End Date"
                  value={dateRange.end}
                  onChange={(date) => handleDateRangeChange("end", date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      sx: { flex: 1 }
                    }
                  }}
                />
                {(dateRange.start || dateRange.end) && (
                  <Button 
                    onClick={clearDateFilter} 
                    size="small"
                    sx={{ minWidth: 32 }}
                  >
                    Clear
                  </Button>
                )}
              </Box>
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>

      {/* Ledger Table */}
      <Paper sx={{
        mb: 2,
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: theme.shadows[1],
      }}>
        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                height={56}
                sx={{ mb: 1, borderRadius: 1 }}
              />
            ))}
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: { xs: 400, sm: 500, md: 600 } }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{
                      fontWeight: 700,
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      width: { xs: '20%', sm: '15%' }
                    }}>Date</TableCell>
                    <TableCell sx={{
                      fontWeight: 700,
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      width: { xs: '20%', sm: '15%' }
                    }}>Doc #</TableCell>
                    <TableCell sx={{
                      fontWeight: 700,
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      width: { xs: '40%', sm: '35%' }
                    }}>Description</TableCell>
                    <TableCell sx={{
                      fontWeight: 700,
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      width: { xs: '20%', sm: '15%' },
                      textAlign: 'right'
                    }}>Debit</TableCell>
                    <TableCell sx={{
                      fontWeight: 700,
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      width: { xs: '20%', sm: '15%' },
                      textAlign: 'right'
                    }}>Credit</TableCell>
                    <TableCell sx={{
                      fontWeight: 700,
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      width: { xs: '20%', sm: '15%' },
                      textAlign: 'right'
                    }}>Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEntries.length > 0 ? (
                    <>
                      {filteredEntries
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((entry) => (
                          <TableRow
                            key={entry.id}
                            hover
                            sx={{
                              '&:nth-of-type(even)': {
                                backgroundColor: theme.palette.action.hover
                              }
                            }}
                          >
                            <TableCell sx={{ 
                              fontWeight: 500, 
                              whiteSpace: 'nowrap',
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                              {formatDate(entry.date)}
                            </TableCell>
                            <TableCell sx={{ 
                              whiteSpace: 'nowrap',
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {entry.type === "invoice" ? (
                                  <Tooltip title="View Invoice Details">
                                    <Button
                                      onClick={() => handleInvoiceClick(entry.invoiceId || '')}
                                      sx={{
                                        textTransform: 'none',
                                        color: theme.palette.primary.main,
                                        p: 0,
                                        minWidth: 0,
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                        '&:hover': {
                                          textDecoration: 'underline',
                                          backgroundColor: 'transparent'
                                        }
                                      }}
                                    >
                                      {entry.documentNumber}
                                    </Button>
                                  </Tooltip>
                                ) : (
                                  <Typography 
                                    variant="body2" 
                                    fontWeight={500}
                                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                  >
                                    {entry.documentNumber}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ 
                              maxWidth: { xs: 150, sm: 200 }, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis'
                            }}>
                              <Typography 
                                variant="body2" 
                                noWrap
                                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                              >
                                {entry.description}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ 
                              whiteSpace: 'nowrap',
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                              {entry.debit > 0 ? (
                                <Typography 
                                  variant="body2" 
                                  fontWeight={500} 
                                  color="error.main"
                                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                >
                                  {formatCurrency(entry.debit)}
                                </Typography>
                              ) : (
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                >
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right" sx={{ 
                              whiteSpace: 'nowrap',
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                              {entry.credit > 0 ? (
                                <Typography 
                                  variant="body2" 
                                  fontWeight={500} 
                                  color="success.main"
                                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                >
                                  {formatCurrency(entry.credit)}
                                </Typography>
                              ) : (
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                >
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right" sx={{ 
                              whiteSpace: 'nowrap',
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                              <Typography
                                fontWeight={600}
                                color={entry.balance >= 0 ? 'primary.main' : 'error.main'}
                                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                              >
                                {formatCurrency(Math.abs(entry.balance))}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      {/* Totals Row */}
                      <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
                        <TableCell colSpan={3} sx={{ 
                          fontWeight: 700,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          Totals
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          fontWeight: 700,
                          color: 'error.main',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          {formatCurrency(totalDebit)}
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          fontWeight: 700,
                          color: 'success.main',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          {formatCurrency(totalCredit)}
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          fontWeight: 700,
                          color: balance >= 0 ? 'primary.main' : 'error.main',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          {formatCurrency(Math.abs(balance))}
                        </TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography 
                          variant="body1" 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                        >
                          No ledger entries found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredEntries.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          '& .MuiTablePagination-toolbar': {
            paddingLeft: 0,
            flexWrap: 'wrap',
            justifyContent: { xs: 'center', sm: 'flex-end' },
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }
        }}
      />

      {/* Invoice Details Modal */}
      <Dialog
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle>
          <Typography variant="h6" component="div">
            Invoice Details
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Invoice #{selectedInvoice.invoiceNumber || selectedInvoice.id}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Date: {formatDate(selectedInvoice.date)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Customer: {selectedInvoice.customerDetails?.name || selectedInvoice.customer}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Total: {formatCurrency(selectedInvoice.total)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Paid: {formatCurrency(selectedInvoice.paid)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Due: {formatCurrency(selectedInvoice.due)}
              </Typography>

              <Typography variant="h6" sx={{ mt: 3 }}>
                Products
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedInvoice.products.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell align="right">{product.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(product.price)}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(product.quantity * product.price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {selectedInvoice.paymentHistory && selectedInvoice.paymentHistory.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mt: 3 }}>
                    Payment History
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Method</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedInvoice.paymentHistory.map((payment, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(payment.date)}</TableCell>
                            <TableCell align="right">{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>{payment.method || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceModalOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerLedger;