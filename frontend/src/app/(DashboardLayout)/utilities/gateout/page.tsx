/* The above code is a TypeScript React component that displays a table of product out entries. Here is
a summary of what the code does: */
"use client";
import React, { useState, useEffect } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Button,
  Typography,
  Chip,
  Menu,
  MenuItem,
  useMediaQuery,
  IconButton,
  Tooltip,
  Skeleton,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Avatar,
  Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Product from "./product";
import {
  getGateOutEntries,
  createGateOutEntry,
  updateGateOutEntry,
  deleteGateOutEntry,
  GateOutEntry
} from "@/services/gateoutservices";

interface Column {
  id: "invoice" | "customer" | "units" | "quantity" | "saleprice" | "total" | "date" | "status" | "from" | "action";
  label: string;
  minWidth?: number;
  align?: "right" | "left" | "center";
  format?: (value: number) => string;
}

const columns: Column[] = [
  { id: "invoice", label: "#", minWidth: 40, align: "left" },
  { id: "customer", label: "Item", minWidth: 100, align: "left" },
  { id: "units", label: "Units", minWidth: 70, align: "left" },
  {
    id: "quantity",
    label: "Quantity",
    minWidth: 100,
    align: "left",
    format: (value: number) => value.toLocaleString("en-US"),
  },
  {
    id: "saleprice",
    label: "Sale Price",
    minWidth: 100,
    align: "left",
    format: (value: number) => value.toFixed(2),
  },
  {
    id: "total",
    label: "Total",
    minWidth: 120,
    align: "left",
    format: (value: number) => value.toLocaleString("en-US"),
  },
  { id: "date", label: "Date", minWidth: 120, align: "left" },
  { id: "from", label: "Customers", minWidth: 160, align: "left" },
  { id: "status", label: "Status", minWidth: 100, align: "left" },
  { id: "action", label: "Action", minWidth: 100, align: "center" },
];

const Page = () => {
  const [rows, setRows] = useState<GateOutEntry[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<GateOutEntry | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<GateOutEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // Format date to day-month-year
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await getGateOutEntries();
        setRows(data);
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
    fetchData();
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleFormSubmit = async (
    customer: string,
    total: number,
    units: string,
    quantity: number,
    saleprice: number,
    paymentStatus: "Paid" | "Overdue" | "Pending",
    date: string,
    from: string
  ) => {
    const entryData = {
      customer,
      total,
      units,
      quantity,
      saleprice,
      paymentStatus,
      date,
      from
    };

    try {
      if (editRow && editRow._id) {
        const updatedEntry = await updateGateOutEntry(editRow._id, entryData);
        setRows(rows.map(row => row._id === editRow._id ? updatedEntry : row));
        setSnackbar({
          open: true,
          message: "Entry updated successfully!",
          severity: "success",
        });
      } else {
        const newEntry = await createGateOutEntry(entryData);
        setRows([newEntry, ...rows]);
        setSnackbar({
          open: true,
          message: "Entry created successfully!",
          severity: "success",
        });
      }
      setShowForm(false);
      setEditRow(null);
    } catch (error) {
      console.error("Error saving data:", error);
      setSnackbar({
        open: true,
        message: "Failed to save data",
        severity: "error",
      });
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditRow(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, row: GateOutEntry) => {
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
        await deleteGateOutEntry(selectedRow._id);
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

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Function to truncate long text and show tooltip
  const renderCellContent = (value: string | number, column: Column) => {
    const stringValue = typeof value === 'number' ? value.toString() : value;
    const maxLength = column.minWidth ? column.minWidth / 10 : 15;
    const shouldTruncate = stringValue.length > maxLength;
    
    // Special handling for date column
    if (column.id === "date" && typeof value === 'string') {
      return (
        <Typography 
          variant="body2" 
          sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: `${column.minWidth}px`,
            display: 'inline-block',
          }}
        >
          {formatDate(value)}
        </Typography>
      );
    }
    
    return (
      <Tooltip title={shouldTruncate ? stringValue : ''} arrow>
        <Typography 
          variant="body2" 
          sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: `${column.minWidth}px`,
            display: 'inline-block',
          }}
        >
          {column.format && typeof value === 'number' ? column.format(value) : stringValue}
        </Typography>
      </Tooltip>
    );
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
              Loading product out data...
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Form Dialog */}
      {showForm && (
        <Product
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          initialData={editRow}
        />
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
            Product Out
          </Typography>
          
          <Button 
            variant="contained" 
            onClick={() => setShowForm(true)}
            sx={{
              px: 3,
              py: 1,
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            }}
          >
            Add New Entry
          </Button>
        </Box>

        {/* Table */}
        <Box sx={{ 
          width: '100%',
          overflow: 'hidden',
        }}>
          <TableContainer 
            sx={{ 
              borderRadius: '8px',
              border: `1px solid ${theme.palette.divider}`,
              '&::-webkit-scrollbar': {
                display: 'none', // Hide scrollbar but keep functionality
              },
              msOverflowStyle: 'none',  // IE and Edge
              scrollbarWidth: 'none',  // Firefox
            }}
          >
            <Table 
              stickyHeader 
              aria-label="sticky table" 
              sx={{ 
                minWidth: '100%', // Changed from fixed width to 100%
                tableLayout: 'fixed', // Ensures equal column distribution
              }}
            >
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      sx={{
                        minWidth: column.minWidth,
                        width: column.minWidth ? `${column.minWidth}px` : 'auto',
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.common.white,
                        fontWeight: 600,
                        display: isSmallScreen && (column.id === "units" || column.id === "saleprice") ? "none" : "table-cell",
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
                          const value = row[column.id as keyof GateOutEntry];
                          return (
                            <TableCell
                              key={column.id}
                              align={column.align}
                              sx={{
                                display: isSmallScreen && (column.id === "units" || column.id === "saleprice") ? "none" : "table-cell",
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {column.id === "status" ? (
                                <Chip
                                  label={row.paymentStatus}
                                  color={
                                    row.paymentStatus === "Paid"
                                      ? "success"
                                      : row.paymentStatus === "Pending"
                                      ? "warning"
                                      : "error"
                                  }
                                  size="small"
                                />
                              ) : column.id === "action" ? (
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
                              ) : (
                                renderCellContent(value as string | number, column)
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="textSecondary">
                        No product out entries available
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

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
        <MenuItem onClick={handleDelete} sx={{ color: theme.palette.error.main }}>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Page;