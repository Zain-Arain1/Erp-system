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
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTheme } from "@mui/material/styles";

interface Vendor {
  id: string;
  name: string;
  status: "Active" | "Inactive";
}

interface Item {
  name: string;
  units: string;
  quantity: number;
  unitPrice: number;
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
    unitPrice: string;
    total: string;
  }>;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSubmit, onCancel, initialData, vendors }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<InvoiceData>({
    vendorId: "",
    vendor: "",
    items: [{ name: "", units: "", quantity: 0, unitPrice: 0, total: 0 }],
    paymentStatus: "Pending",
    totalAmount: 0,
  });
  const [errors, setErrors] = useState<FieldErrors>({
    vendorId: "",
    items: [{ name: "", units: "", quantity: "", unitPrice: "", total: "" }],
  });
  const [touched, setTouched] = useState<{ vendorId: boolean; items: boolean[] }>({
    vendorId: false,
    items: [false],
  });
  const [isFormValid, setIsFormValid] = useState(false);

  // Initialize form data and validate on load
  useEffect(() => {
    if (initialData) {
      const vendorId = initialData.vendorId || vendors.find(v => v.name === initialData.vendor)?.id || "";
      setFormData({
        ...initialData,
        items: initialData.items.length > 0 ? initialData.items : [{ name: "", units: "", quantity: 0, unitPrice: 0, total: 0 }],
        vendorId,
      });
      setErrors({
        vendorId: "",
        items: initialData.items.map(() => ({ name: "", units: "", quantity: "", unitPrice: "", total: "" })),
      });
      setTouched({
        vendorId: true,
        items: initialData.items.map(() => true),
      });
    } else {
      setFormData({
        vendorId: "",
        vendor: "",
        items: [{ name: "", units: "", quantity: 0, unitPrice: 0, total: 0 }],
        paymentStatus: "Pending",
        totalAmount: 0,
      });
      setErrors({
        vendorId: "",
        items: [{ name: "", units: "", quantity: "", unitPrice: "", total: "" }],
      });
      setTouched({
        vendorId: false,
        items: [false],
      });
    }
  }, [initialData, vendors]);

  // Update total amount when items change
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => sum + item.total, 0);
    setFormData(prev => ({ ...prev, totalAmount: Number(total.toFixed(2)) }));
  }, [formData.items]);

  // Validate form whenever formData changes
  useEffect(() => {
    setIsFormValid(validateForm());
  }, [formData]);

  const validateField = useCallback((item: Item, index: number) => {
    const itemErrors = {
      name: item.name.trim() ? "" : "Enter an item name.",
      units: item.units.trim() ? "" : "Specify units (e.g., kg, units).",
      quantity: item.quantity > 0 && !isNaN(item.quantity) ? "" : "Quantity must be greater than 0.",
      unitPrice: item.unitPrice > 0 && !isNaN(item.unitPrice) ? "" : "Unit price must be greater than 0.",
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
        unitPrice: item.unitPrice > 0 && !isNaN(item.unitPrice) ? "" : "Unit price must be greater than 0.",
        total: !isNaN(item.total) && item.total >= 0 ? "" : "Invalid total amount.",
      })),
    };
    setErrors(newErrors);
    return !newErrors.vendorId && newErrors.items.every(item => !item.name && !item.units && !item.quantity && !item.unitPrice && !item.total);
  }, [formData]);

  const handleItemChange = (index: number, field: keyof Item, value: string | number) => {
    const updatedItems = [...formData.items];
    const newValue = field === "quantity" || field === "unitPrice" ? Math.max(0, Number(value)) : value;
    updatedItems[index] = { ...updatedItems[index], [field]: newValue };

    if (field === "quantity" || field === "unitPrice") {
      updatedItems[index].total = Number((updatedItems[index].quantity * updatedItems[index].unitPrice).toFixed(2));
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
      items: [...prev.items, { name: "", units: "", quantity: 0, unitPrice: 0, total: 0 }],
    }));
    setErrors(prev => ({
      ...prev,
      items: [...prev.items, { name: "", units: "", quantity: "", unitPrice: "", total: "" }],
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
      unitPrice: Number(item.unitPrice),
      total: Number(item.total.toFixed(2)),
    }));

    onSubmit(validatedItems, formData.vendorId, vendor.name, formData.paymentStatus);
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="md" fullWidth aria-labelledby="invoice-form-title">
      <DialogTitle id="invoice-form-title" sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>
        <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
          {formData.invoiceNumber && formData.invoiceNumber.trim() !== "" ? `Edit Invoice #${formData.invoiceNumber}` : "Create New Invoice"}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 3 }}>
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth error={touched.vendorId && !!errors.vendorId}>
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
                  <Typography variant="caption" color="error" id="vendor-error">
                    {errors.vendorId}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" component="div" gutterBottom sx={{ fontWeight: 500 }}>
                Invoice Items
              </Typography>
              <TableContainer component={Paper} sx={{ boxShadow: theme.shadows[2] }}>
                <Table aria-label="invoice items table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item Name</TableCell>
                      <TableCell>Units</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Unit Price</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            fullWidth
                            value={item.name}
                            onChange={(e) => handleItemChange(index, "name", e.target.value)}
                            required
                            error={touched.items[index] && !!errors.items[index]?.name}
                            helperText={touched.items[index] && errors.items[index]?.name}
                            placeholder="e.g., Steel Rods"
                            aria-describedby={`item-name-error-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            value={item.units}
                            onChange={(e) => handleItemChange(index, "units", e.target.value)}
                            required
                            error={touched.items[index] && !!errors.items[index]?.units}
                            helperText={touched.items[index] && errors.items[index]?.units}
                            placeholder="e.g., kg, units"
                            aria-describedby={`item-units-error-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            type="number"
                            value={item.quantity || ""}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                            required
                            inputProps={{ min: 0, step: 1 }}
                            error={touched.items[index] && !!errors.items[index]?.quantity}
                            helperText={touched.items[index] && errors.items[index]?.quantity}
                            placeholder="e.g., 10"
                            aria-describedby={`item-quantity-error-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            type="number"
                            value={item.unitPrice || ""}
                            onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                            required
                            inputProps={{ min: 0, step: 0.01 }}
                            error={touched.items[index] && !!errors.items[index]?.unitPrice}
                            helperText={touched.items[index] && errors.items[index]?.unitPrice}
                            placeholder="e.g., 100.00"
                            aria-describedby={`item-price-error-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            type="number"
                            value={item.total.toFixed(2)}
                            disabled
                            aria-readonly="true"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Remove this item">
                            <span>
                              <IconButton
                                onClick={() => removeItem(index)}
                                disabled={formData.items.length <= 1}
                                aria-label={`Remove item ${index + 1}`}
                              >
                                <DeleteIcon color={formData.items.length <= 1 ? "disabled" : "error"} />
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
                startIcon={<AddIcon />}
                onClick={addNewItem}
                sx={{ mt: 2, color: theme.palette.primary.main }}
                aria-label="Add new item"
              >
                Add New Item
              </Button>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Total Amount"
                type="number"
                value={formData.totalAmount.toFixed(2)}
                disabled
                aria-readonly="true"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
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
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Partial">Partially Paid</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} color="secondary" variant="outlined" aria-label="Cancel invoice form">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={!isFormValid}
          aria-label={formData.invoiceNumber && formData.invoiceNumber.trim() !== "" ? "Update invoice" : "Create invoice"}
        >
          {formData.invoiceNumber && formData.invoiceNumber.trim() !== "" ? "Update Invoice" : "Create Invoice"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceForm;