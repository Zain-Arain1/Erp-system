"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Grid,
  Card,
  CardContent,
  Pagination,
} from "@mui/material";
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  AccountCircle as AccountCircleIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationOnIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import AddVendorForm from "./AddVendorform";
import { useVendorContext, Vendor } from "@/app/(DashboardLayout)/utilities/context/vendorContext";

interface Column {
  id: keyof Vendor | "action" | "ledger" | "number";
  label: string;
  minWidth?: number;
  align?: "right" | "left" | "center";
  sortable?: boolean;
  icon?: React.ReactElement;
}

const VendorSection = () => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const { 
    vendors, 
    addVendor, 
    updateVendor, 
    deleteVendor, 
    isLoading, 
    error, 
    refreshVendors,
    lastRefresh 
  } = useVendorContext();
  
  // State declarations
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Vendor; direction: "asc" | "desc" } | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error" as "error" | "warning" | "info" | "success",
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const columns: Column[] = useMemo(() => [
    { id: "number", label: "#", minWidth: 50, align: "left" },
    {
      id: "name",
      label: "Vendor Name",
      minWidth: 150,
      align: "left",
      sortable: true,
      icon: <AccountCircleIcon fontSize="small" />
    },
    {
      id: "company",
      label: "Company",
      minWidth: 150,
      align: "left",
      sortable: true,
      icon: <BusinessIcon fontSize="small" />
    },
    {
      id: "email",
      label: "Email",
      minWidth: 150,
      align: "left",
      sortable: true,
      icon: <EmailIcon fontSize="small" />
    },
    {
      id: "phone",
      label: "Phone",
      minWidth: 120,
      align: "left",
      icon: <PhoneIcon fontSize="small" />
    },
    {
      id: "address",
      label: "Address",
      minWidth: 160,
      align: "left",
      icon: <LocationOnIcon fontSize="small" />
    },
    {
      id: "status",
      label: "Status",
      minWidth: 100,
      align: "center",
      icon: <CheckCircleIcon fontSize="small" />
    },
    { id: "action", label: "Actions", minWidth: 40, align: "center" },
    {
      id: "ledger",
      label: "Ledger",
      minWidth: 140,
      align: "center",
      icon: <ReceiptIcon fontSize="small" />
    },
  ], []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setViewMode("grid");
    }
  }, [isMobile]);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshVendors();
      setSnackbar({
        open: true,
        message: "Vendors refreshed successfully!",
        severity: "success",
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to refresh vendors",
        severity: "error",
      });
    }
  }, [refreshVendors]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [handleRefresh]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const checkDuplicateVendor = useCallback((vendor: Vendor): boolean => {
    return vendors.some(
      (v) =>
        (v.phone === vendor.phone && v.id !== vendor.id) ||
        (v.email.toLowerCase() === vendor.email.toLowerCase() && v.id !== vendor.id) ||
        (v.name.toLowerCase() === vendor.name.toLowerCase() && v.id !== vendor.id)
    );
  }, [vendors]);

  const handleFormSubmit = useCallback(async (vendor: Vendor): Promise<void> => {
    try {
      if (!editVendor && checkDuplicateVendor(vendor)) {
        setSnackbar({
          open: true,
          message: "Vendor with this name, email or phone already exists!",
          severity: "error",
        });
        return;
      }

      if (editVendor) {
        await updateVendor(vendor.id, vendor);
        setSnackbar({
          open: true,
          message: "Vendor updated successfully!",
          severity: "success",
        });
      } else {
        const { id, ...newVendor } = vendor;
        await addVendor(newVendor);
        setSnackbar({
          open: true,
          message: "Vendor added successfully!",
          severity: "success",
        });
      }

      setShowForm(false);
      setEditVendor(null);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "An error occurred while saving the vendor",
        severity: "error",
      });
    }
  }, [editVendor, checkDuplicateVendor, updateVendor, addVendor]);

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
    setEditVendor(null);
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLElement>, vendor: Vendor) => {
    setAnchorEl(event.currentTarget);
    setSelectedVendor(vendor);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedVendor(null);
  }, []);

  const handleEdit = useCallback(() => {
    if (selectedVendor) {
      setEditVendor(selectedVendor);
      setShowForm(true);
    }
    handleMenuClose();
  }, [selectedVendor, handleMenuClose]);

  const handleDelete = useCallback(async () => {
    if (selectedVendor) {
      try {
        await deleteVendor(selectedVendor.id);
        setSnackbar({
          open: true,
          message: "Vendor deleted successfully!",
          severity: "success",
        });
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: error.message || "Failed to delete vendor",
          severity: "error",
        });
      }
    }
    handleMenuClose();
  }, [selectedVendor, deleteVendor, handleMenuClose]);

  const handleLedgerClick = useCallback((vendor: Vendor) => {
    router.push(`/utilities/vendor/ledger/${vendor.id}`);
  }, [router]);

  const filteredVendors = useMemo(() => vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone.includes(searchTerm) ||
      (vendor.company && vendor.company.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "All" || vendor.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [vendors, searchTerm, statusFilter]);

  const sortedVendors = useMemo(() => {
    let result = [...filteredVendors];

    if (sortConfig !== null) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const valueA = a[key] ?? '';
        const valueB = b[key] ?? '';

        if (valueA < valueB) {
          return direction === "asc" ? -1 : 1;
        }
        if (valueA > valueB) {
          return direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [filteredVendors, sortConfig]);

  const handleSort = useCallback((key: keyof Vendor) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  const renderCellContent = useCallback((value: string, column: Column) => {
    const maxLength = column.minWidth ? column.minWidth / 10 : 20;
    const shouldTruncate = value && value.length > maxLength;

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
          {value || '-'}
        </Typography>
      </Tooltip>
    );
  }, []);

  const renderLoadingRows = useCallback(() => {
    return Array.from({ length: rowsPerPage }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        {columns.map((column) => (
          <TableCell key={`skeleton-${column.id}-${index}`}>
            <Skeleton variant="text" width={column.minWidth ? column.minWidth * 0.7 : 100} />
          </TableCell>
        ))}
      </TableRow>
    ));
  }, [rowsPerPage, columns]);

  const renderLoadingCards = useCallback(() => {
    return Array.from({ length: 6 }).map((_, index) => (
      <Grid item xs={12} sm={6} md={4} key={`card-skeleton-${index}`}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Stack spacing={2}>
              <Skeleton variant="rectangular" width="100%" height={40} />
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="70%" />
              <Stack direction="row" spacing={1}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="circular" width={40} height={40} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    ));
  }, []);

  const renderVendorCard = useCallback((vendor: Vendor) => {
    return (
      <Grid item xs={12} sm={6} md={4} key={vendor.id}>
        <Card sx={{
          height: '100%',
          borderLeft: `4px solid ${vendor.status === "Active" ? theme.palette.success.main : theme.palette.error.main}`,
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[4],
          }
        }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar sx={{
                    width: 40,
                    height: 40,
                    bgcolor: theme.palette.primary.main,
                    fontSize: '1rem',
                  }}>
                    {vendor.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                    {vendor.name}
                  </Typography>
                </Stack>
                <Chip
                  label={vendor.status}
                  color={vendor.status === "Active" ? "success" : "error"}
                  size="small"
                  icon={vendor.status === "Active" ? <CheckCircleIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
                  sx={{ fontWeight: 500 }}
                />
              </Stack>

              <Divider />

              <Stack spacing={1.5}>
                {vendor.company && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <BusinessIcon color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      {vendor.company}
                    </Typography>
                  </Stack>
                )}

                <Stack direction="row" spacing={1} alignItems="center">
                  <EmailIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    {vendor.email || '-'}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <PhoneIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    {vendor.phone || '-'}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <LocationOnIcon color="action" fontSize="small" sx={{ mt: 0.5 }} />
                  <Typography variant="body2" color="text.secondary" sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {vendor.address || '-'}
                  </Typography>
                </Stack>
              </Stack>

              <Divider />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={() => handleLedgerClick(vendor)}
                  startIcon={<ReceiptIcon fontSize="small" />}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '6px',
                  }}
                >
                  Ledger
                </Button>

                <IconButton
                  onClick={(e) => handleMenuClick(e, vendor)}
                  sx={{
                    color: theme.palette.text.secondary,
                    '&:hover': {
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  <MoreVertIcon />
                </IconButton>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    );
  }, [handleLedgerClick, handleMenuClick, theme]);

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading vendors: {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={handleRefresh}
          startIcon={<RefreshIcon />}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (isLoading && isInitialLoad) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '300px' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      p: isMobile ? 1 : 3,
      backgroundColor: theme.palette.background.default,
      minHeight: '100vh',
    }}>
      {showForm && (
        <AddVendorForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          initialData={editVendor}
        />
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
          Vendor Management
        </Typography>

        <Stack direction="row" spacing={2} sx={{ width: isMobile ? '100%' : 'auto' }}>
          {!isMobile && (
            <Button
              variant={viewMode === 'table' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('table')}
              sx={{
                minWidth: 100,
                borderRadius: '8px',
              }}
            >
              Table
            </Button>
          )}
          {!isMobile && (
            <Button
              variant={viewMode === 'grid' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('grid')}
              sx={{
                minWidth: 100,
                borderRadius: '8px',
              }}
            >
              Grid
            </Button>
          )}
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
            }}
          >
            Add Vendor
          </Button>
        </Stack>
      </Box>

      <Paper sx={{
        p: 2,
        mb: 3,
        borderRadius: '12px',
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[1],
      }}>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems="center">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search vendors..."
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
          />

          <Stack direction="row" spacing={2} sx={{ width: isMobile ? '100%' : 'auto' }}>
            <FormControl sx={{ minWidth: 120 }} size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "All" | "Active" | "Inactive")}
                label="Status"
              >
                <MenuItem value="All">All Status</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>

            <Tooltip title="Refresh data">
              <IconButton
                onClick={handleRefresh}
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

      {vendors.length === 0 && !isLoading ? (
        <Paper sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '300px',
          borderRadius: '12px',
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.shadows[1],
        }}>
          <Box sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}>
            <BusinessIcon color="primary" sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
            No Vendors Found
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3, maxWidth: '400px' }}>
            You don&apos;t have any vendors yet. Click the button below to add your first vendor.
          </Typography>

          <Button
            variant="contained"
            onClick={() => setShowForm(true)}
            startIcon={<AddIcon />}
            size="large"
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              },
              px: 4,
              py: 1.5,
              borderRadius: '8px',
            }}
          >
            Add New Vendor
          </Button>
        </Paper>
      ) : viewMode === 'table' ? (
        <>
          <Paper sx={{
            width: "100%",
            overflow: "hidden",
            borderRadius: '12px',
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.shadows[1],
          }}>
            <TableContainer>
              <Table stickyHeader aria-label="vendor table">
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
                        onClick={() => column.sortable && column.id !== 'number' && handleSort(column.id as keyof Vendor)}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {column.icon && React.isValidElement(column.icon) &&
                            React.cloneElement(column.icon, {
                              sx: { fontSize: '1rem' },
                              fontSize: 'inherit',
                            } as React.HTMLAttributes<HTMLElement>)}
                          <span>{column.label}</span>
                          {sortConfig?.key === column.id && (
                            sortConfig.direction === "asc" ?
                              <ArrowUpwardIcon fontSize="small" /> :
                              <ArrowDownwardIcon fontSize="small" />
                          )}
                        </Stack>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {isLoading ? (
                    renderLoadingRows()
                  ) : (
                    sortedVendors
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((vendor, index) => (
                        <TableRow
                          hover
                          key={vendor.id}
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
                            const value = vendor[column.id as keyof Vendor];
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
                                    {page * rowsPerPage + index + 1}
                                  </Typography>
                                ) : column.id === "name" ? (
                                  <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Avatar sx={{
                                      width: 32,
                                      height: 32,
                                      bgcolor: theme.palette.primary.main,
                                      fontSize: '0.875rem',
                                    }}>
                                      {vendor.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    {renderCellContent(value as string, column)}
                                  </Stack>
                                ) : column.id === "status" ? (
                                  <Chip
                                    label={value}
                                    color={value === "Active" ? "success" : "error"}
                                    size="small"
                                    icon={value === "Active" ? <CheckCircleIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
                                    sx={{
                                      fontWeight: 500,
                                      px: 0.5,
                                      minWidth: 80,
                                    }}
                                  />
                                ) : column.id === "action" ? (
                                  <IconButton
                                    onClick={(e) => handleMenuClick(e, vendor)}
                                    sx={{
                                      color: theme.palette.text.secondary,
                                      '&:hover': {
                                        color: theme.palette.primary.main,
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
                                    onClick={() => handleLedgerClick(vendor)}
                                    startIcon={<ReceiptIcon fontSize="small" />}
                                    sx={{
                                      textTransform: 'none',
                                      borderRadius: '6px',
                                      px: 2,
                                      py: 0.5,
                                    }}
                                  >
                                    Ledger
                                  </Button>
                                ) : (
                                  renderCellContent(value as string, column)
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={sortedVendors.length}
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
        </>
      ) : (
        <Grid container spacing={3}>
          {isLoading ? (
            renderLoadingCards()
          ) : (
            sortedVendors
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((vendor) => renderVendorCard(vendor)))
          }

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={Math.ceil(sortedVendors.length / rowsPerPage)}
                page={page + 1}
                onChange={(event, value) => setPage(value - 1)}
                color="primary"
                showFirstButton
                showLastButton
                sx={{
                  '& .MuiPaginationItem-root': {
                    borderRadius: '6px',
                  },
                }}
              />
            </Box>
          </Grid>
        </Grid>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            borderRadius: '8px',
            minWidth: 180,
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
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit Vendor
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={handleDelete}
          sx={{ color: theme.palette.error.main }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Vendor
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default VendorSection;