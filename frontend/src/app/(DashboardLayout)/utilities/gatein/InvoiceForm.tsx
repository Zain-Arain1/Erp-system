import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Divider,
  Chip,
  Collapse,
  CircularProgress,
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTheme } from "@mui/material/styles";
import ProductCard from './ProductCard';
import NewProductForm from './NewProductForm';
import axios from 'axios';

interface Vendor {
  id: string;
  name: string;
  status: "Active" | "Inactive";
}

interface Item {
  name: string;
  units: string;
  quantity: number;
  purchasePrice: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber?: string;
  vendorId: string;
  vendor: string;
  items: Item[];
  paymentStatus: "Paid" | "Partial" | "Pending";
  totalAmount: number;
}

interface InvoiceFormProps {
  onSubmit: (
    items: Item[],
    vendorId: string,
    vendorName: string,
    paymentStatus: "Paid" | "Partial" | "Pending"
  ) => void;
  onCancel: () => void;
  initialData?: InvoiceData;
  vendors: Vendor[];
}

interface FieldErrors {
  vendorId: string;
  items: Array<{
    name: string;
    units: string;
    quantity: string;
    purchasePrice: string;
    total: string;
  }>;
}

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  stock?: number;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSubmit, onCancel, initialData, vendors }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<InvoiceData>({
    vendorId: "",
    vendor: "",
    items: [{ name: "", units: "", quantity: 0, purchasePrice: 0, total: 0 }],
    paymentStatus: "Pending",
    totalAmount: 0,
  });
  const [errors, setErrors] = useState<FieldErrors>({
    vendorId: "",
    items: [{ name: "", units: "", quantity: "", purchasePrice: "", total: "" }],
  });
  const [touched, setTouched] = useState<{ vendorId: boolean; items: boolean[] }>({
    vendorId: false,
    items: [false],
  });
  const [isFormValid, setIsFormValid] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [showProducts, setShowProducts] = useState(true);

  useEffect(() => {
    if (initialData) {
      const vendorId = initialData.vendorId || vendors.find(v => v.name === initialData.vendor)?.id || "";
      setFormData({
        ...initialData,
        items: initialData.items.length > 0 ? initialData.items : [{ name: "", units: "", quantity: 0, purchasePrice: 0, total: 0 }],
        vendorId,
      });
      setErrors({
        vendorId: "",
        items: initialData.items.map(() => ({ name: "", units: "", quantity: "", purchasePrice: "", total: "" })),
      });
      setTouched({
        vendorId: true,
        items: initialData.items.map(() => true),
      });
    }
  }, [initialData, vendors]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/raw-products`);
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const total = formData.items.reduce((sum, item) => sum + item.total, 0);
    setFormData(prev => ({ ...prev, totalAmount: Number(total.toFixed(2)) }));
  }, [formData.items]);

  const validateField = useCallback((item: Item, index: number) => {
    const itemErrors = {
      name: item.name.trim() ? "" : "Enter an item name.",
      units: item.units.trim() ? "" : "Specify units (e.g., kg, units).",
      quantity: item.quantity > 0 && !isNaN(item.quantity) ? "" : "Quantity must be greater than 0.",
      purchasePrice: item.purchasePrice > 0 && !isNaN(item.purchasePrice) ? "" : "Unit price must be greater than 0.",
      total: !isNaN(item.total) && item.total >= 0 ? "" : "Invalid total amount.",
    };
    setErrors(prev => {
      const newItems = [...prev.items];
      newItems[index] = itemErrors;
      return { ...prev, items: newItems };
    });
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FieldErrors = {
      vendorId: formData.vendorId ? "" : "Select a vendor.",
      items: formData.items.map(item => ({
        name: item.name.trim() ? "" : "Enter an item name.",
        units: item.units.trim() ? "" : "Specify units (e.g., kg, units).",
        quantity: item.quantity > 0 && !isNaN(item.quantity) ? "" : "Quantity must be greater than 0.",
        purchasePrice: item.purchasePrice > 0 && !isNaN(item.purchasePrice) ? "" : "Unit price must be greater than 0.",
        total: !isNaN(item.total) && item.total >= 0 ? "" : "Invalid total amount.",
      })),
    };
    setErrors(newErrors);
    return !newErrors.vendorId && newErrors.items.every(item => !item.name && !item.units && !item.quantity && !item.purchasePrice && !item.total);
  }, [formData]);

  useEffect(() => {
    setIsFormValid(validateForm());
  }, [formData, validateForm]);

  const handleItemChange = (index: number, field: keyof Item, value: string | number) => {
    const updatedItems = [...formData.items];
    const newValue = field === "quantity" || field === "purchasePrice" ? Math.max(0, Number(value)) : value;
    updatedItems[index] = { ...updatedItems[index], [field]: newValue };

    if (field === "quantity" || field === "purchasePrice") {
      updatedItems[index].total = Number((updatedItems[index].quantity * updatedItems[index].purchasePrice).toFixed(2));
    }

    setFormData(prev => ({ ...prev, items: updatedItems }));
    setTouched(prev => {
      const newItems = [...prev.items];
      newItems[index] = true;
      return { ...prev, items: newItems };
    });
    validateField(updatedItems[index], index);
  };

  const addNewItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: "", units: "", quantity: 0, purchasePrice: 0, total: 0 }],
    }));
    setErrors(prev => ({
      ...prev,
      items: [...prev.items, { name: "", units: "", quantity: "", purchasePrice: "", total: "" }],
    }));
    setTouched(prev => ({
      ...prev,
      items: [...prev.items, false],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    setErrors(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    setTouched(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleAddProduct = (product: Product) => {
    const existingItemIndex = formData.items.findIndex(item => item.name === product.name);

    if (existingItemIndex >= 0) {
      const updatedItems = [...formData.items];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].total =
        updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].purchasePrice;

      setFormData(prev => ({ ...prev, items: updatedItems }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: [
          ...prev.items,
          {
            name: product.name,
            units: product.unit,
            quantity: 1,
            purchasePrice: product.price,
            total: product.price,
          }
        ]
      }));
      setErrors(prev => ({
        ...prev,
        items: [...prev.items, { name: "", units: "", quantity: "", purchasePrice: "", total: "" }],
      }));
      setTouched(prev => ({
        ...prev,
        items: [...prev.items, false],
      }));
    }
  };

  const handleCreateProduct = async (newProduct: Omit<Product, 'id'>) => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/raw-products`, newProduct);
      const productWithId = response.data;
      setProducts(prev => [...prev, productWithId]);
      handleAddProduct(productWithId);
      setShowNewProductForm(false);
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleSubmit = () => {
    setTouched({ vendorId: true, items: formData.items.map(() => true) });
    if (!validateForm()) return;

    const vendor = vendors.find(v => v.id === formData.vendorId);
    if (!vendor) {
      setErrors(prev => ({ ...prev, vendorId: "Selected vendor not found." }));
      return;
    }

    const validatedItems = formData.items.map(item => ({
      ...item,
      quantity: Number(item.quantity),
      purchasePrice: Number(item.purchasePrice),
      total: Number(item.total.toFixed(2)),
    }));

    onSubmit(validatedItems, formData.vendorId, vendor.name, formData.paymentStatus);
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="lg" fullWidth sx={{
      minHeight: '80vh',
      '& .MuiDialog-paper': {
        [theme.breakpoints.down('sm')]: {
          margin: '8px',
          width: 'calc(100% - 16px)',
        }
      }
    }}>
    <DialogTitle sx={{ 
  bgcolor: theme.palette.primary.main, 
  color: theme.palette.primary.contrastText,
  padding: { xs: '12px 16px', sm: '16px 24px' }
}}>
  <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
    {initialData?.invoiceNumber ? `Edit Invoice #${initialData.invoiceNumber}` : "Create New Invoice"}
  </Typography>
</DialogTitle>
      <DialogContent dividers sx={{
        pt: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '70vh',
        minHeight: '500px',
        [theme.breakpoints.down('sm')]: {
          pt: 1,
          height: 'auto',
          minHeight: '400px'
        }
      }}>
        <Box sx={{
          display: 'flex',
          gap: 2,
          flex: 1,
          overflow: 'hidden',
          height: '100%',
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          {/* Product Selection Panel */}
          <Box sx={{
            width: { xs: '100%', sm: '35%' },
            borderRight: { sm: `1px solid ${theme.palette.divider}` },
            borderBottom: { xs: `1px solid ${theme.palette.divider}`, sm: 'none' },
            pr: { sm: 2 },
            pb: { xs: 2, sm: 0 },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1
            }}>
              <Typography variant="subtitle1" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                Products
              </Typography>
              <Box>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setShowNewProductForm(true)}
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                >
                  New Product
                </Button>
                <IconButton
                  onClick={() => setShowProducts(!showProducts)}
                  size="small"
                >
                  {showProducts ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </Box>
            </Box>

            <Collapse in={showProducts} unmountOnExit>
              {loadingProducts ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : products.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    No products available
                  </Typography>
                  <Button
                    onClick={() => setShowNewProductForm(true)}
                    sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    size="small"
                  >
                    Add New Product
                  </Button>
                </Box>
              ) : (
                <Box sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 1
                }}>
                  <Grid container spacing={1}>
                    {products.map(product => (
                      <Grid item xs={6} sm={6} md={4} key={product.id}>
                        <ProductCard
                          product={product}
                          onClick={() => handleAddProduct(product)}
                          isSelected={formData.items.some(item => item.name === product.name)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Collapse>
          </Box>

          {/* Invoice Form Panel */}
          <Box sx={{
            flex: 1,
            overflow: 'auto',
            [theme.breakpoints.down('sm')]: {
              paddingTop: '8px'
            }
          }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth error={touched.vendorId && !!errors.vendorId} size="small">
                  <InputLabel id="vendor-select-label">Vendor</InputLabel>
                  <Select
                    labelId="vendor-select-label"
                    value={formData.vendorId}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        vendorId: e.target.value,
                        vendor: vendors.find(v => v.id === e.target.value)?.name || "",
                      }));
                      setTouched(prev => ({ ...prev, vendorId: true }));
                      setErrors(prev => ({ ...prev, vendorId: e.target.value ? "" : "Select a vendor." }));
                    }}
                    label="Vendor"
                    required
                    aria-describedby="vendor-error"
                  >
                    {vendors.filter(v => v.status === "Active").map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {touched.vendorId && errors.vendorId && (
                    <Typography variant="caption" color="error" id="vendor-error" sx={{ fontSize: '0.75rem' }}>
                      {errors.vendorId}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" component="div" gutterBottom sx={{
                  fontWeight: 500,
                  fontSize: { xs: '0.9rem', sm: '1rem' }
                }}>
                  Invoice Items
                </Typography>
                <TableContainer component={Paper} sx={{ boxShadow: theme.shadows[1] }}>
                  <Table aria-label="invoice items table" size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Item Name</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Units</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Quantity</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Unit Price</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Total</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <TextField
                              fullWidth
                              size="small"
                              value={item.name}
                              onChange={(e) => handleItemChange(index, "name", e.target.value)}
                              required
                              error={touched.items[index] && !!errors.items[index]?.name}
                              helperText={touched.items[index] && errors.items[index]?.name}
                              placeholder="e.g., Steel Rods"
                              aria-describedby={`item-name-error-${index}`}
                              sx={{
                                '& .MuiInputBase-input': {
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              fullWidth
                              size="small"
                              value={item.units}
                              onChange={(e) => handleItemChange(index, "units", e.target.value)}
                              required
                              error={touched.items[index] && !!errors.items[index]?.units}
                              helperText={touched.items[index] && errors.items[index]?.units}
                              placeholder="e.g., kg, units"
                              aria-describedby={`item-units-error-${index}`}
                              sx={{
                                '& .MuiInputBase-input': {
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              fullWidth
                              type="number"
                              size="small"
                              value={item.quantity || ""}
                              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                              required
                              inputProps={{ min: 0, step: 1 }}
                              error={touched.items[index] && !!errors.items[index]?.quantity}
                              helperText={touched.items[index] && errors.items[index]?.quantity}
                              placeholder="e.g., 10"
                              aria-describedby={`item-quantity-error-${index}`}
                              sx={{
                                '& .MuiInputBase-input': {
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              fullWidth
                              type="number"
                              size="small"
                              value={item.purchasePrice || ""}
                              onChange={(e) => handleItemChange(index, "purchasePrice", e.target.value)}
                              required
                              inputProps={{ min: 0, step: 0.01 }}
                              error={touched.items[index] && !!errors.items[index]?.purchasePrice}
                              helperText={touched.items[index] && errors.items[index]?.purchasePrice}
                              placeholder="e.g., 100.00"
                              aria-describedby={`item-price-error-${index}`}
                              sx={{
                                '& .MuiInputBase-input': {
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              fullWidth
                              type="number"
                              size="small"
                              value={item.total.toFixed(2)}
                              disabled
                              aria-readonly="true"
                              sx={{
                                '& .MuiInputBase-input': {
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Remove this item">
                              <span>
                                <IconButton
                                  onClick={() => removeItem(index)}
                                  disabled={formData.items.length <= 1}
                                  aria-label={`Remove item ${index + 1}`}
                                  size="small"
                                >
                                  <DeleteIcon fontSize="small" color={formData.items.length <= 1 ? "disabled" : "error"} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Button
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={addNewItem}
                  sx={{
                    mt: 1,
                    color: theme.palette.primary.main,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}
                  aria-label="Add new item"
                  size="small"
                >
                  Add New Item
                </Button>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Total Amount"
                  type="number"
                  size="small"
                  value={formData.totalAmount.toFixed(2)}
                  disabled
                  aria-readonly="true"
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="payment-status-label">Payment Status</InputLabel>
                  <Select
                    labelId="payment-status-label"
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      paymentStatus: e.target.value as "Paid" | "Partial" | "Pending",
                    }))}
                    label="Payment Status"
                    required
                    aria-describedby="payment-status"
                  >
                    <MenuItem value="Paid" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Paid</MenuItem>
                    <MenuItem value="Partial" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Partially Paid</MenuItem>
                    <MenuItem value="Pending" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{
        px: 2,
        py: 1,
        display: 'flex',
        justifyContent: 'space-between',
        borderTop: `1px solid ${theme.palette.divider}`,
        [theme.breakpoints.down('sm')]: {
          flexDirection: 'column',
          gap: 1,
          alignItems: 'stretch'
        }
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          [theme.breakpoints.down('sm')]: {
            justifyContent: 'center',
            mb: 1
          }
        }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Items: {formData.items.length}
          </Typography>
          <Divider orientation="vertical" flexItem />
          <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.primary.main }}>
            Total: Rs. {formData.totalAmount.toFixed(2)}
          </Typography>
          <Divider orientation="vertical" flexItem />
          <Chip
            label={formData.paymentStatus}
            size="small"
            color={
              formData.paymentStatus === 'Paid' ? 'success' :
                formData.paymentStatus === 'Partial' ? 'warning' : 'error'
            }
          />
        </Box>

        <Box sx={{
          display: 'flex',
          [theme.breakpoints.down('sm')]: {
            justifyContent: 'space-between'
          }
        }}>
          <Button
            onClick={onCancel}
            color="secondary"
            variant="outlined"
            aria-label="Cancel invoice form"
            sx={{
              mr: 1,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              padding: { xs: '6px 12px', sm: '8px 16px' }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            color="primary"
            variant="contained"
            disabled={!isFormValid}
            aria-label={formData.invoiceNumber ? "Update invoice" : "Create invoice"}
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              padding: { xs: '6px 12px', sm: '8px 16px' },
              minWidth: { xs: '120px', sm: 'auto' }
            }}
          >
            {formData.invoiceNumber ? "Update Invoice" : "Create Invoice"}
          </Button>
        </Box>
      </DialogActions>

      <NewProductForm
        open={showNewProductForm}
        onClose={() => setShowNewProductForm(false)}
        onSubmit={handleCreateProduct}
      />
    </Dialog>
  );
};

export default InvoiceForm;