'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Grid,
  TextField,
  MenuItem,
  Button,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ExpenseForm from './ExpenseForm';
import ExpenseTable from './expenseTable';
import { LocalExpense } from './expense';
import {
  fetchTempDailyExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  transferDailyExpenses
} from '../api/expenseApi';
import { getAllTempExpenseDates } from '@/utils/localStorageUtils';

export default function DailyExpensesPage() {
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [editingExpense, setEditingExpense] = useState<LocalExpense | null>(null);
  const [transferDate, setTransferDate] = useState('');
  const [transferStatus, setTransferStatus] = useState<{ loading: boolean; success?: boolean; message: string }>({ loading: false, message: '' });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); // YYYY-MM-DD

  // Load expenses for selected date
  const loadExpenses = async (dateStr: string) => {
    try {
      const localExpenses = await fetchTempDailyExpenses(dateStr);
      setExpenses(localExpenses);
    } catch (err) {
      console.error('Error fetching temporary daily expenses:', err);
      setExpenses([]);
    }
  };

  // Load available dates for transfer dropdown
  const loadDates = () => {
    try {
      const dates = getAllTempExpenseDates();
      setAvailableDates(dates);
    } catch (error) {
      console.error('Failed to load dates:', error);
      setTransferStatus({
        loading: false,
        success: false,
        message: 'Failed to load transfer dates',
      });
    }
  };

  useEffect(() => {
    loadExpenses(selectedDate);
    loadDates();
  }, [selectedDate]);

  const handleDateChange = (date: Date | null) => {
    if (date && !isNaN(date.getTime())) {
      const dateStr = date.toISOString().split('T')[0];
      setSelectedDate(dateStr);
      setEditingExpense(null);
    }
  };

  const handleAddOrUpdateExpense = async (expenseData: Omit<LocalExpense, '_id'>) => {
    // Always use selectedDate for new expense
    const expenseWithDate = { ...expenseData, date: selectedDate };
    if (editingExpense) {
      try {
        const updated = await updateExpense(editingExpense._id, {
          ...expenseWithDate
        });
        await loadExpenses(selectedDate);
        setTransferStatus({
          loading: false,
          success: true,
          message: 'Local expense updated successfully',
        });
        setEditingExpense(null);
      } catch (err) {
        console.error('Failed to update expense:', err);
        setTransferStatus({
          loading: false,
          success: false,
          message: 'Failed to update expense',
        });
      }
    } else {
      try {
        const newExpense = await createExpense(expenseWithDate);
        await loadExpenses(selectedDate);
        setTransferStatus({
          loading: false,
          success: true,
          message: 'Expense added to temporary storage',
        });
        loadDates();
      } catch (err) {
        console.error('Failed to save expense:', err);
        setTransferStatus({
          loading: false,
          success: false,
          message: 'Failed to save expense',
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id);
      await loadExpenses(selectedDate);
      setTransferStatus({
        loading: false,
        success: true,
        message: 'Local expense deleted successfully',
      });
      loadDates();
    } catch (err) {
      console.error('Failed to delete expense:', err);
      setTransferStatus({
        loading: false,
        success: false,
        message: 'Failed to delete expense',
      });
    }
  };

  const handleTransfer = async () => {
    if (!transferDate) {
      setTransferStatus({
        loading: false,
        success: false,
        message: 'Please select a date to transfer',
      });
      return;
    }

    setTransferStatus({ loading: true, message: 'Transferring...' });
    try {
      const result = await transferDailyExpenses(transferDate);
      if (result.success) {
        if (transferDate === selectedDate) {
          await loadExpenses(selectedDate);
        }
        loadDates();
        setTransferDate('');
      }
      setTransferStatus({
        loading: false,
        success: result.success,
        message: result.message || 'Transfer completed',
      });
    } catch (err) {
      console.error('Transfer failed:', err);
      setTransferStatus({
        loading: false,
        success: false,
        message: err instanceof Error ? err.message : 'Transfer failed',
      });
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: { xs: 1, md: 3 }, background: '#f7f9fb', minHeight: '100vh' }}>
        <Grid container spacing={3}>
          {/* Add Daily Expense Section */}
          <Grid item xs={12}>
            <Card elevation={2} sx={{ borderRadius: 3, mb: 4, maxWidth: '100%', mx: 'auto' }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="primary" fontWeight={700}>
                      Add Daily Expense
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Select Date"
                      value={new Date(selectedDate)}
                      onChange={handleDateChange}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                      maxDate={new Date('2100-12-31')}
                      minDate={new Date('2000-01-01')}
                    />
                  </Grid>
                </Grid>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ px: { xs: 0, md: 12 } }}>
                  <ExpenseForm
                    onSubmit={handleAddOrUpdateExpense}
                    editingExpense={editingExpense}
                    onCancel={() => setEditingExpense(null)}
                  />
                  {transferStatus.message && (
                    <Alert
                      severity={transferStatus.success ? 'success' : 'error'}
                      sx={{ mt: 2 }}
                    >
                      {transferStatus.message}
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Daily Expenses Table */}
          <Grid item xs={12}>
            <Card elevation={1} sx={{ borderRadius: 3, mb: 4, maxWidth: '100%', mx: 'auto' }}>
              <CardContent>
                <Typography variant="h6" color="primary" fontWeight={600} sx={{ mb: 2 }}>
                  Daily Expenses (Temporary)
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <ExpenseTable
                  expenses={expenses}
                  onEdit={setEditingExpense}
                  onDelete={handleDelete}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Transfer Section */}
          <Grid item xs={12}>
            <Card elevation={2} sx={{ borderRadius: 3, maxWidth: '100%', mx: 'auto' }}>
              <CardContent>
                <Typography variant="h6" color="warning.main" fontWeight={700} sx={{ mb: 2 }}>
                  Transfer Daily to Monthly
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      fullWidth
                      label="Select Date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="">
                        Select a date
                      </MenuItem>
                      {availableDates.map((date) => (
                        <MenuItem key={date} value={date}>
                          {new Date(date).toLocaleDateString()}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleTransfer}
                      disabled={!transferDate || transferStatus.loading}
                      sx={{
                        height: '40px',
                        fontWeight: 'bold',
                        background: '#ffd600',
                        color: '#333',
                        boxShadow: 1,
                        '&:hover': {
                          background: '#ffe082'
                        },
                        transition: 'all 0.2s'
                      }}
                    >
                      {transferStatus.loading ? <CircularProgress size={24} /> : 'Transfer'}
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    {transferStatus.message && (
                      <Alert
                        severity={transferStatus.success ? 'success' : 'error'}
                        sx={{ mt: 1 }}
                      >
                        {transferStatus.message}
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
}