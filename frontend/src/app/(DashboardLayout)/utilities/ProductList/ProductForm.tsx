/* The above code is a TypeScript React component called `ProductForm` that serves as a form for adding
or editing product information. Here is a breakdown of its functionality: */
"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Avatar,
  IconButton,
  useTheme,
} from "@mui/material";
import { CloudUpload } from "@mui/icons-material";

interface ProductFormProps {
  onSubmit: (
    name: string,
    sku: string,
    category: string,
    price: number,
    quantity: number,
    status: "In Stock" | "Low Stock" | "Out of Stock",
    image?: string
  ) => void;
  onCancel: () => void;
  initialData?: {
    _id?: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    quantity: number;
    status: "In Stock" | "Low Stock" | "Out of Stock";
    image?: string;
  };
}

const ProductForm: React.FC<ProductFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [status, setStatus] = useState<"In Stock" | "Low Stock" | "Out of Stock">("In Stock");
  const [image, setImage] = useState<string | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState({
    name: '',
    sku: '',
    price: '',
    quantity: ''
  });

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setSku(initialData.sku);
      setCategory(initialData.category);
      setPrice(initialData.price);
      setQuantity(initialData.quantity);
      setStatus(initialData.status);
      setImage(initialData.image);
      setImagePreview(initialData.image);
    }
  }, [initialData]);

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      name: name ? '' : 'Product name is required',
      sku: sku ? '' : 'SKU is required',
      price: price > 0 ? '' : 'Price must be positive',
      quantity: quantity >= 0 ? '' : 'Quantity cannot be negative'
    };

    setErrors(newErrors);
    valid = Object.values(newErrors).every(x => x === '');
    return valid;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        // In a real app, you would upload the image to a server here
        // and get back a URL to store in your database
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(name, sku, category, price, quantity, status, image);
    }
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight={600}>
          {initialData ? "Edit Product" : "Add New Product"}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <label htmlFor="product-image-upload">
              <input
                id="product-image-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageChange}
              />
              <IconButton component="span">
                <Avatar
                  src={imagePreview}
                  sx={{ width: 100, height: 100 }}
                >
                  <CloudUpload fontSize="large" />
                </Avatar>
              </IconButton>
            </label>
          </Box>

          <TextField
            label="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            error={!!errors.name}
            helperText={errors.name}
          />

          <TextField
            label="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            fullWidth
            required
            error={!!errors.sku}
            helperText={errors.sku}
          />

          <TextField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Price"
              type="number"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value))}
              fullWidth
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              error={!!errors.price}
              helperText={errors.price}
            />

            <TextField
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              fullWidth
              InputProps={{ inputProps: { min: 0 } }}
              error={!!errors.quantity}
              helperText={errors.quantity}
            />
          </Box>

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => setStatus(e.target.value as "In Stock" | "Low Stock" | "Out of Stock")}
            >
              <MenuItem value="In Stock">In Stock</MenuItem>
              <MenuItem value="Low Stock">Low Stock</MenuItem>
              <MenuItem value="Out of Stock">Out of Stock</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onCancel} variant="outlined" sx={{ borderRadius: '8px' }}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          sx={{ borderRadius: '8px' }}
        >
          {initialData ? "Update Product" : "Add Product"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductForm;