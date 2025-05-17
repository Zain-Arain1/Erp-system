'use client';
import { useState, useEffect } from "react";
import { TextField, Button, Grid, MenuItem } from "@mui/material";
import { LocalExpense } from "./expense";

interface ExpenseFormProps {
  onSubmit: (expense: Omit<LocalExpense, "_id">) => void;
  editingExpense?: LocalExpense | null;
  onCancel: () => void;
}

export default function ExpenseForm({ onSubmit, editingExpense, onCancel }: ExpenseFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState("");
  const [receipt, setReceipt] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setName(editingExpense.name);
      setCategory(editingExpense.category || "");
      setAmount(editingExpense.amount);
      setDescription(editingExpense.description || '');
      setReceipt(editingExpense.receipt || false);
    } else {
      resetForm();
    }
  }, [editingExpense]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === '' || amount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }
    if (!name || !category) {
      alert('Please fill in all required fields');
      return;
    }
    const expenseData: Omit<LocalExpense, "_id"> = {
      name,
      category,
      amount: Number(amount),
      description,
      receipt,
      yearlyTotal: 0,
      date: ""
    };
    onSubmit(expenseData);
    if (!editingExpense) resetForm();
  };

  const resetForm = () => {
    setName("");
    setCategory("");
    setAmount('');
    setDescription("");
    setReceipt(false);
  };

  const businessCategories = [
    "Travel", "Meals & Entertainment", "Office Supplies", "Equipment",
    "Software Subscriptions", "Professional Services", "Marketing & Advertising",
    "Rent & Utilities", "Transportation", "Training & Education", "Insurance",
    "Taxes & Licenses", "Other"
  ];

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            error={!name}
            helperText={!name ? "Name is required" : ""}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            label="Amount"
            value={amount}
            onChange={(e) => {
              const value = e.target.value;
              setAmount(value === '' ? '' : Number(value));
            }}
            inputProps={{ min: 0, step: 0.01 }}
            required
            error={amount === '' || (typeof amount === 'number' && amount <= 0)}
            helperText={
              amount === '' ? "Amount is required" :
                (typeof amount === 'number' && amount <= 0) ? "Amount must be greater than 0" : ""
            }
          />
        </Grid>
        <Grid item xs={12} >
          <TextField
            fullWidth
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            error={!category}
            helperText={!category ? "Category is required" : ""}
          >
            {businessCategories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide details about the expense..."
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            select
            label="Receipt Attached?"
            value={receipt ? "yes" : "no"}
            onChange={(e) => setReceipt(e.target.value === "yes")}
          >
            <MenuItem value="yes">Yes</MenuItem>
            <MenuItem value="no">No</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ py: 2 }}
          >
            {editingExpense ? "Update Expense" : "Submit Expense"}
          </Button>
          {editingExpense && (
            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              sx={{ py: 2, mt: 2 }}
              onClick={onCancel}
            >
              Cancel Editing
            </Button>
          )}
        </Grid>
      </Grid>
    </form>
  );
}