/* The above code is a TypeScript React component that represents a form for adding or editing customer
information. Here is a breakdown of what the code does: */
import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Grid,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
} from "@mui/material";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

// Define the Customer interface
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "Active" | "Inactive"; // New field for customer status
}

// Props for the AddCustomerForm component
interface AddCustomerFormProps {
  onSubmit: (customer: Customer) => void | Promise<void>; // ✅ Accepts async function;
  onCancel: () => void;
  initialData?: Customer | null;
}

const AddCustomerForm: React.FC<AddCustomerFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
}) => {
  // State for form data
  const [formData, setFormData] = useState<Customer>(
    initialData || {
      id: "0",
      name: "",
      email: "",
      phone: "",
      address: "",
      status: "Active", // Default status
    }
  );

  // State for form validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // State for loading during form submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes for both TextField and Select
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name?: string; value: unknown } }
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name as string]: value as string }));
    // Clear errors when the user starts typing
    setErrors((prev) => ({ ...prev, [name as string]: "" }));
  };

  // Validate the form
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.phone) {
      newErrors.phone = "Phone is required";
    } else if (!/^\d+$/.test(formData.phone)) {
      newErrors.phone = "Phone must contain only digits";
    }
    if (!formData.address) newErrors.address = "Address is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) return; // Stop if validation fails

    setIsSubmitting(true); // Start loading
    onSubmit(formData); // Submit the form data
    setIsSubmitting(false); // Stop loading
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {initialData ? (
            <>
              <CheckCircleIcon color="primary" />
              Edit Customer
            </>
          ) : (
            <>
              <PersonIcon color="primary" />
              Add New Customer
            </>
          )}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            {/* Name Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                required
                InputProps={{
                  startAdornment: <PersonIcon sx={{ mr: 1, color: "action.active" }} />,
                }}
              />
            </Grid>

            {/* Email Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                required
                InputProps={{
                  startAdornment: <EmailIcon sx={{ mr: 1, color: "action.active" }} />,
                }}
              />
            </Grid>

            {/* Phone Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                error={!!errors.phone}
                helperText={errors.phone}
                required
                InputProps={{
                  startAdornment: <PhoneIcon sx={{ mr: 1, color: "action.active" }} />,
                }}
              />
            </Grid>

            {/* Address Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                error={!!errors.address}
                helperText={errors.address}
                required
                InputProps={{
                  startAdornment: <HomeIcon sx={{ mr: 1, color: "action.active" }} />,
                }}
              />
            </Grid>

            {/* Status Field */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="Status"
                >
                  <MenuItem value="Active">
                    <Chip label="Active" color="success" size="small" />
                  </MenuItem>
                  <MenuItem value="Inactive">
                    <Chip label="Inactive" color="error" size="small" />
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        {/* Cancel Button */}
        <Button onClick={onCancel} color="secondary" disabled={isSubmitting}>
          Cancel
        </Button>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {initialData ? "Update" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCustomerForm;