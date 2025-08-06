import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

interface NewProductFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (product: {
    name: string;
    price: number;
    unit: string;
    stock?: number;
  }) => void;
}

const NewProductForm: React.FC<NewProductFormProps> = ({ open, onClose, onSubmit }) => {
  const [product, setProduct] = useState({
    name: '',
    price: 0,
    unit: 'kg',
    stock: 0,
  });

  const units = ['kg', 'g', 'l', 'ml', 'piece', 'dozen', 'packet', 'box'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProduct(prev => ({
      ...prev,
      [name]: name === 'name' || name === 'unit' ? value : Number(value),
    }));
  };

  const handleSubmit = () => {
    if (!product.name || product.price <= 0) return;
    onSubmit(product);
    setProduct({
      name: '',
      price: 0,
      unit: 'kg',
      stock: 0,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Product</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Product Name"
              name="name"
              value={product.name}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Price"
              name="price"
              type="number"
              value={product.price}
              onChange={handleChange}
              inputProps={{ min: 0, step: 0.01 }}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Unit</InputLabel>
              <Select
                name="unit"
                value={product.unit}
                onChange={(e) => setProduct(prev => ({
                  ...prev,
                  unit: e.target.value as string,
                }))}
                label="Unit"
              >
                {units.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Initial Stock (optional)"
              name="stock"
              type="number"
              value={product.stock}
              onChange={handleChange}
              inputProps={{ min: 0 }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained"
          disabled={!product.name || product.price <= 0}
        >
          Save Product
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProductForm;