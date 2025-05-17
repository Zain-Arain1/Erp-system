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
import ProductForm from "./ProductForm";
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  Product,
} from '@/services/product';

interface Column {
  id: "name" | "sku" | "category" | "price" | "quantity" | "status" | "action";
  label: string;
  minWidth?: number;
  align?: "right" | "left" | "center";
  format?: (value: number) => string;
}

interface Data {
  _id?: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  image?: string;
}

const columns: Column[] = [
  { id: "name", label: "Product Name", minWidth: 150, align: "left" },
  { id: "sku", label: "SKU", minWidth: 100, align: "left" },
  { id: "category", label: "Category", minWidth: 120, align: "left" },
  {
    id: "price",
    label: "Price",
    minWidth: 100,
    align: "left",
    format: (value: number) => `$${value.toFixed(2)}`,
  },
  {
    id: "quantity",
    label: "Quantity",
    minWidth: 100,
    align: "left",
    format: (value: number) => value.toLocaleString("en-US"),
  },
  { id: "status", label: "Status", minWidth: 120, align: "left" },
  { id: "action", label: "Action", minWidth: 100, align: "center" },
];

const ProductsPage = () => {
  const [rows, setRows] = useState<Data[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<Data | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<Data | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await getProducts();
        setRows(data);
      } catch (error) {
        console.error("Error fetching products:", error);
        setSnackbar({
          open: true,
          message: "Failed to load products",
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
    name: string,
    sku: string,
    category: string,
    price: number,
    quantity: number,
    status: "In Stock" | "Low Stock" | "Out of Stock",
    image?: string
  ) => {
    const productData = {
      name,
      sku,
      category,
      price,
      quantity,
      status,
      image,
    };

    try {
      if (editRow && editRow._id) {
        const updatedProduct = await updateProduct(editRow._id, productData);
        setRows(rows.map(row => row._id === editRow._id ? updatedProduct : row));
        setSnackbar({
          open: true,
          message: "Product updated successfully!",
          severity: "success",
        });
      } else {
        const newProduct = await createProduct(productData);
        setRows([newProduct, ...rows]);
        setSnackbar({
          open: true,
          message: "Product created successfully!",
          severity: "success",
        });
      }
      setShowForm(false);
      setEditRow(null);
    } catch (error) {
      console.error("Error saving product:", error);
      setSnackbar({
        open: true,
        message: "Failed to save product",
        severity: "error",
      });
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditRow(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, row: Data) => {
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
        await deleteProduct(selectedRow._id);
        setRows(rows.filter(row => row._id !== selectedRow._id));
        setSnackbar({
          open: true,
          message: "Product deleted successfully!",
          severity: "success",
        });
      } catch (error) {
        console.error("Error deleting product:", error);
        setSnackbar({
          open: true,
          message: "Failed to delete product",
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
              Loading products...
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Form Dialog */}
      {showForm && (
  <ProductForm
    onSubmit={handleFormSubmit}
    onCancel={handleFormCancel}
    initialData={editRow || undefined}
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
            Product Inventory
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
            Add New Product
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
                      display: isSmallScreen && column.id === "category" ? "none" : "table-cell",
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
                    <TableRow hover key={row._id || row.sku}>
                      {columns.map((column) => {
                        const value = row[column.id as keyof Data];
                        return (
                          <TableCell
                            key={column.id}
                            align={column.align}
                            sx={{
                              display: isSmallScreen && column.id === "category" ? "none" : "table-cell",
                            }}
                          >
                            {column.id === "name" && row.image ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar src={row.image} alt={row.name} sx={{ width: 40, height: 40 }} />
                                {renderCellContent(value as string, column)}
                              </Box>
                            ) : column.id === "status" ? (
                              <Chip
                                label={row.status}
                                color={
                                  row.status === "In Stock"
                                    ? "success"
                                    : row.status === "Low Stock"
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
                      No products available
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
        <MenuItem onClick={handleDelete} sx={{ color: theme.palette.error.main }}>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ProductsPage;