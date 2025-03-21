"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { customers as initialCustomers } from "@/app/(DashboardLayout)/utilities/customer/customers"; // Rename imported data
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import { useTheme } from "@mui/material/styles";
import AddCustomerForm from "./AddCustomerForm"; // Separate form component

// Define the Customer interface
interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "Active" | "Inactive"; // New field for customer status
}

// Define table columns
interface Column {
  id: keyof Customer | "action" | "ledger";
  label: string;
  minWidth?: number;
  align?: "right" | "left" | "center";
  sortable?: boolean; // Enable sorting for specific columns
}

const columns: Column[] = [
  { id: "id", label: "#", minWidth: 50, align: "left" },
  { id: "name", label: "Name", minWidth: 150, align: "left", sortable: true },
  { id: "email", label: "Email", minWidth: 150, align: "left", sortable: true },
  { id: "phone", label: "Phone", minWidth: 120, align: "left" },
  { id: "address", label: "Address", minWidth: 160, align: "left" },
  { id: "status", label: "Status", minWidth: 100, align: "center" },
  { id: "action", label: "Action", minWidth: 40, align: "left" },
  { id: "ledger", label: "All Invoices", minWidth: 140, align: "left" }, // New column for ledger
];

const CustomerSection = () => {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers); // Use renamed imported data
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Customer; direction: "asc" | "desc" } | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  // Handle form submission
  const handleFormSubmit = (customer: Customer) => {
    if (editCustomer) {
      // Update existing customer
      const updatedCustomers = customers.map((c) =>
        c.id === customer.id ? customer : c
      );
      setCustomers(updatedCustomers);
    } else {
      // Add new customer
      const newCustomer = { ...customer, id: customers.length + 1 };
      setCustomers([newCustomer, ...customers]);
    }
    setShowForm(false);
    setEditCustomer(null);
  };

  // Handle form cancellation
  const handleFormCancel = () => {
    setShowForm(false);
    setEditCustomer(null);
  };

  // Handle menu click for actions
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, customer: Customer) => {
    setAnchorEl(event.currentTarget);
    setSelectedCustomer(customer);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCustomer(null);
  };

  // Handle edit action
  const handleEdit = () => {
    if (selectedCustomer) {
      setEditCustomer(selectedCustomer);
      setShowForm(true);
    }
    handleMenuClose();
  };

  // Handle delete action
  const handleDelete = () => {
    if (selectedCustomer) {
      const updatedCustomers = customers.filter((c) => c.id !== selectedCustomer.id);
      setCustomers(updatedCustomers);
    }
    handleMenuClose();
  };

  // Handle ledger button click
  const handleLedgerClick = (customer: Customer) => {
    router.push(`/customers/${customer.id}/ledger`);
  };

  // Handle search
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);
    const matchesStatus = statusFilter === "All" || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle sorting
  const sortedCustomers = React.useMemo(() => {
    if (sortConfig) {
      return [...filteredCustomers].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return filteredCustomers;
  }, [filteredCustomers, sortConfig]);

  // Handle column sorting
  const handleSort = (key: keyof Customer) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      {/* Add/Edit Customer Form */}
      {showForm && (
        <AddCustomerForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          initialData={editCustomer}
        />
      )}

      {/* Search and Filter Section */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by name, email, or phone"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1 }} />,
          }}
        />
        <FormControl fullWidth sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "All" | "Active" | "Inactive")}
            label="Status"
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Customer Table */}
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: isMobile ? "auto" : 440 }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Typography variant={isMobile ? "h6" : "h4"}>Customers List</Typography>
                  <Button
                    variant="contained"
                    onClick={() => setShowForm(true)}
                    sx={{ mt: 2 }}
                    startIcon={<AddIcon />}
                    fullWidth={isMobile}
                  >
                    Add New Customer
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{
                      minWidth: column.minWidth,
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.common.white,
                    }}
                    onClick={() => column.sortable && handleSort(column.id as keyof Customer)}
                    sx={{ cursor: column.sortable ? "pointer" : "default" }}
                  >
                    {column.label}
                    {sortConfig?.key === column.id && (
                      <span>{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedCustomers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((customer) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={customer.id}>
                    {columns.map((column) => {
                      const value = customer[column.id as keyof Customer];
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.id === "status" ? (
                            <Chip
                              label={value}
                              color={value === "Active" ? "success" : "error"}
                              size="small"
                            />
                          ) : column.id === "action" ? (
                            <IconButton onClick={(e) => handleMenuClick(e, customer)}>
                              <MoreVertIcon />
                            </IconButton>
                          ) : column.id === "ledger" ? (
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={() => handleLedgerClick(customer)}
                              size={isMobile ? "small" : "medium"}
                            >
                              All Invoices
                            </Button>
                          ) : (
                            value
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 100]}
          component="div"
          count={sortedCustomers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleDelete}>Delete</MenuItem>
      </Menu>
    </Box>
  );
};

export default CustomerSection;