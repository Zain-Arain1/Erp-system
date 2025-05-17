/* The above code is a TypeScript React component that represents a Customer Management section in a
web application. Here is a summary of what the code is doing: */
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  IconButton,
  Menu,
  MenuItem,
  Box,
  useMediaQuery,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  Stack,
  Divider,
  Tooltip,
  Snackbar,
  Alert,
  Skeleton,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import AddCustomerForm from "./AddCustomerForm";
import { useCustomerContext } from "@/app/(DashboardLayout)/utilities/context/CustomerContext";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "Active" | "Inactive";
}

interface Column {
  id: keyof Customer | "action" | "ledger" | "number";
  label: string;
  minWidth?: number;
  align?: "right" | "left" | "center";
  sortable?: boolean;
}

const columns: Column[] = [
  { id: "number", label: "#", minWidth: 50, align: "left" },
  { id: "name", label: "Name", minWidth: 150, align: "left", sortable: true },
  { id: "email", label: "Email", minWidth: 150, align: "left", sortable: true },
  { id: "phone", label: "Phone", minWidth: 120, align: "left" },
  { id: "address", label: "Address", minWidth: 160, align: "left" },
  { id: "status", label: "Status", minWidth: 100, align: "center" },
  { id: "action", label: "Actions", minWidth: 40, align: "center" },
  { id: "ledger", label: "Ledger", minWidth: 140, align: "center" },
];

const CustomerSection = () => {
  const router = useRouter();
  const { customers, addCustomer, updateCustomer, deleteCustomer, isLoading } = useCustomerContext();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Customer; direction: "asc" | "desc" } | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error" as "error" | "warning" | "info" | "success",
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  useEffect(() => {
    if (customers.length > 0) {
      setIsInitialLoad(false);
    }
  }, [customers]);

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(10);
    setPage(0);
  };

  const checkDuplicateCustomer = (customer: Customer): boolean => {
    return customers.some(
      (c) => c.phone === customer.phone && c.name.toLowerCase() === customer.name.toLowerCase()
    );
  };

  const handleFormSubmit = async (customer: Customer): Promise<void> => {
    try {
      if (!editCustomer && checkDuplicateCustomer(customer)) {
        setSnackbar({
          open: true,
          message: "Customer with this name and phone number already exists!",
          severity: "error",
        });
        return;
      }

      if (editCustomer) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/${customer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customer),
        });

        if (!res.ok) throw new Error('Failed to update customer');
        const updatedCustomer = await res.json();
        updateCustomer(customer.id, updatedCustomer);
        
        setSnackbar({
          open: true,
          message: "Customer updated successfully!",
          severity: "success",
        });
      } else {
        await addCustomer({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          status: customer.status,
        });
        
        setSnackbar({
          open: true,
          message: "Customer added successfully!",
          severity: "success",
        });
      }
      setShowForm(false);
      setEditCustomer(null);
    } catch (error) {
      console.error("Error saving customer:", error);
      setSnackbar({
        open: true,
        message: "An error occurred while saving the customer",
        severity: "error",
      });
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditCustomer(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, customer: Customer) => {
    setAnchorEl(event.currentTarget);
    setSelectedCustomer(customer);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCustomer(null);
  };

  const handleEdit = () => {
    if (selectedCustomer) {
      setEditCustomer(selectedCustomer);
      setShowForm(true);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedCustomer) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/${selectedCustomer.id}`, {
          method: 'DELETE',
        });

        if (!res.ok) throw new Error('Failed to delete customer');
        deleteCustomer(selectedCustomer.id);
        
        setSnackbar({
          open: true,
          message: "Customer deleted successfully!",
          severity: "success",
        });
      } catch (error) {
        console.error('Error deleting customer:', error);
        setSnackbar({
          open: true,
          message: "Failed to delete customer",
          severity: "error",
        });
      }
    }
    handleMenuClose();
  };
  const handleLedgerClick = (customer: Customer) => {
    router.push(`/utilities/customer/ledger/${customer.id}`);
  };
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);
    const matchesStatus = statusFilter === "All" || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort customers by creation date (newest first) by default
  const sortedCustomers = React.useMemo(() => {
    let result = [...filteredCustomers];
    
    // First sort by creation date (newest first)
    result.sort((a, b) => {
      const dateA = a.id ? new Date(a.id).getTime() : 0;
      const dateB = b.id ? new Date(b.id).getTime() : 0;
      return dateB - dateA;
    });

    // Then apply any additional sorting from sortConfig
    if (sortConfig) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    
    return result;
  }, [filteredCustomers, sortConfig]);

  const handleSort = (key: keyof Customer) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Function to truncate long text and show tooltip
  const renderCellContent = (value: string, column: Column) => {
    const maxLength = column.minWidth ? column.minWidth / 10 : 20; // Adjust based on column width
    const shouldTruncate = value.length > maxLength;
    
    return (
      <Tooltip title={shouldTruncate ? value : ''} arrow>
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
          {value}
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
      p: isMobile ? 1 : 3,
      backgroundColor: theme.palette.background.default,
      minHeight: '100vh',
      position: 'relative',
    }}>
      {/* Loading overlay */}
      {isInitialLoad && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: alpha(theme.palette.background.paper, 0.7),
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: theme.zIndex.modal,
          borderRadius: '12px',
        }}>
          <Stack direction="column" alignItems="center" spacing={2}>
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" color="textSecondary">
              Loading customers...
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Add/Edit Customer Form */}
      {showForm && (
        <AddCustomerForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          initialData={editCustomer}
        />
      )}

      {/* Beautiful Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{
            width: '100%',
            boxShadow: theme.shadows[4],
            alignItems: 'center',
            fontSize: '0.875rem',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Header Section */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        flexDirection: isMobile ? 'column' : 'row',
        gap: 2,
      }}>
        <Typography variant="h4" component="h1" sx={{ 
          fontWeight: 700,
          color: theme.palette.text.primary,
          fontSize: isMobile ? '1.5rem' : '2rem',
        }}>
          Customer Management
        </Typography>
        
        <Button
          variant="contained"
          onClick={() => setShowForm(true)}
          startIcon={<AddIcon />}
          sx={{
            bgcolor: theme.palette.primary.main,
            '&:hover': {
              bgcolor: theme.palette.primary.dark,
            },
            px: 3,
            py: 1,
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          }}
        >
          Add Customer
        </Button>
      </Box>

      {/* Search and Filter Section */}
      <Paper sx={{
        p: 2,
        mb: 3,
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        backgroundColor: theme.palette.background.paper,
      }}>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems="center">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ 
                  color: theme.palette.action.active,
                  mr: 1,
                }} />
              ),
              sx: {
                borderRadius: '8px',
                backgroundColor: theme.palette.background.paper,
              }
            }}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />

          <Stack direction="row" spacing={2} sx={{ width: isMobile ? '100%' : 'auto' }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "All" | "Active" | "Inactive")}
                label="Status"
                sx={{
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  },
                }}
              >
                <MenuItem value="All">All Status</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>

            <Tooltip title="Refresh data">
              <IconButton
                sx={{
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  borderRadius: '8px',
                  color: theme.palette.primary.main,
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Customer Table */}
      <Paper sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        backgroundColor: theme.palette.background.paper,
      }}>
        <TableContainer>
          <Table stickyHeader aria-label="customer table">
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
                      fontSize: '0.875rem',
                      '&:hover': column.sortable ? {
                        backgroundColor: alpha(theme.palette.primary.dark, 0.9),
                        cursor: 'pointer',
                      } : {},
                    }}
                    onClick={() => column.sortable && column.id !== 'number' && handleSort(column.id as keyof Customer)}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <span>{column.label}</span>
                      {sortConfig?.key === column.id && (
                        <span style={{ fontSize: '0.75rem' }}>
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </Stack>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading ? (
                renderLoadingRows()
              ) : sortedCustomers.length > 0 ? (
                sortedCustomers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((customer, index) => (
                    <TableRow 
                      hover 
                      key={customer.id}
                      sx={{
                        '&:nth-of-type(even)': {
                          backgroundColor: alpha(theme.palette.action.hover, 0.05),
                        },
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.light, 0.1),
                        },
                      }}
                    >
                      {columns.map((column) => {
                        const value = customer[column.id as keyof Customer];
                        return (
                          <TableCell 
                            key={column.id} 
                            align={column.align}
                            sx={{
                              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                              py: 2,
                            }}
                          >
                            {column.id === "number" ? (
                              <Typography variant="body2">
                                {sortedCustomers.length - (page * rowsPerPage + index)}
                              </Typography>
                            ) : column.id === "name" ? (
                              <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Avatar sx={{ 
                                  width: 32, 
                                  height: 32,
                                  bgcolor: theme.palette.primary.main,
                                  fontSize: '0.875rem',
                                }}>
                                  {customer.name.charAt(0).toUpperCase()}
                                </Avatar>
                                {renderCellContent(value as string, column)}
                              </Stack>
                            ) : column.id === "status" ? (
                              <Chip
                                label={value}
                                color={value === "Active" ? "success" : "error"}
                                size="small"
                                sx={{
                                  fontWeight: 500,
                                  px: 0.5,
                                  minWidth: 80,
                                }}
                              />
                            ) : column.id === "action" ? (
                              <IconButton 
                                onClick={(e) => handleMenuClick(e, customer)}
                                sx={{
                                  color: theme.palette.text.secondary,
                                  '&:hover': {
                                    color: theme.palette.primary.main,
                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                  },
                                }}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            ) : column.id === "ledger" ? (
                              <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                onClick={() => handleLedgerClick(customer)}
                                sx={{
                                  textTransform: 'none',
                                  borderRadius: '6px',
                                  px: 2,
                                  py: 0.5,
                                  borderWidth: '1.5px',
                                  '&:hover': {
                                    borderWidth: '1.5px',
                                  },
                                }}
                              >
                                View Ledger
                              </Button>
                            ) : (
                              renderCellContent(value as string, column)
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
                      No customers found. Try adjusting your search or add a new customer.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10]}
          component="div"
          count={sortedCustomers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            '& .MuiTablePagination-toolbar': {
              padding: 2,
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
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleEdit} sx={{ color: theme.palette.text.primary }}>
          Edit Customer
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem 
          onClick={handleDelete} 
          sx={{ color: theme.palette.error.main }}
        >
          Delete Customer
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CustomerSection;