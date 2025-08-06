'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Download,
  PictureAsPdf,
  GridOn,
  FilterAlt,
  Refresh,
  Search,
  MoreVert,
  InsertChart,
  TrendingUp
} from '@mui/icons-material';
import { fetchMonthlyExpenses } from '../api/expenseApi';
import { LocalExpense } from './expense';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function MonthlyExpensesPage() {
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [daysWithExpenses, setDaysWithExpenses] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const start = startOfMonth(new Date(currentYear, currentMonth - 1, 1));
      const end = endOfMonth(new Date(currentYear, currentMonth - 1, 1));
      const data = await fetchMonthlyExpenses({ dateRange: `${start.toISOString()},${end.toISOString()}` });
      
      setExpenses(data.map(exp => ({
        ...exp,
        date: typeof exp.date === 'string' ? exp.date : new Date(exp.date).toISOString()
      })));
      const total = data.reduce((sum, exp) => sum + exp.amount, 0);
      setTotalExpenses(total);
      setDaysWithExpenses(data.length);
    } catch (err) {
      console.error('Error loading monthly expenses:', err);
      setExpenses([]);
      setTotalExpenses(0);
      setDaysWithExpenses(0);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterAnchorEl(null);
  };

  const exportToCSV = () => {
    const headers = ['Day', 'Date', 'Amount'];
    const csvContent = [
      headers.join(','),
      ...expenses.map(exp => [
        new Date(exp.date).getDate(),
        new Date(exp.date).toLocaleDateString(),
        Math.round(exp.amount) // integer only
      ].join(','))
    ].join('\n');

    const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `expenses-${monthName}-${currentYear}.csv`);
    handleMenuClose();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' });
    const title = `Monthly Expenses - ${monthName} ${currentYear}`;

    doc.text(title, 14, 16);

    (doc as any).autoTable({
      startY: 25,
      head: [['Day', 'Date', 'Amount']],
      body: expenses.map(exp => [
        new Date(exp.date).getDate(),
        new Date(exp.date).toLocaleDateString(),
        Math.round(exp.amount) // integer only
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [63, 81, 181] }
    });

    doc.save(`expenses-${monthName}-${currentYear}.pdf`);
    handleMenuClose();
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date && !isNaN(date.getTime())) {
      setCurrentMonth(date.getMonth() + 1);
      setCurrentYear(date.getFullYear());
    }
  };

  const filteredExpenses = expenses.filter(exp =>
    exp.amount.toString().includes(searchTerm) ||
    (exp.date && typeof exp.date === 'object' && exp.date !== null && exp.date instanceof Date
      ? typeof exp.date === 'string'
        ? new Date(exp.date).toLocaleDateString().includes(searchTerm)
        : exp.date.toLocaleDateString().includes(searchTerm)
      : new Date(exp.date).toLocaleDateString().includes(searchTerm))
  );

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' });

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3} sx={{ mb: 3 }} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1" gutterBottom>
              Monthly Expenses
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DatePicker
                views={['year', 'month']}
                label="Select Month"
                minDate={new Date('2020-01-01')}
                maxDate={new Date('2030-12-31')}
                value={selectedDate}
                onChange={handleDateChange}
                slotProps={{ textField: { size: 'small', error: !selectedDate } }}
              />
              <Tooltip title="Refresh data">
                <IconButton onClick={loadExpenses} color="primary">
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>

          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title="Filter options">
              <IconButton onClick={handleFilterMenuOpen} color="primary">
                <FilterAlt />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              color="primary"
              startIcon={<Download />}
              onClick={handleMenuOpen}
            >
              Export
            </Button>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={exportToCSV}>
                <GridOn sx={{ mr: 1 }} /> Export as CSV
              </MenuItem>
              <MenuItem onClick={exportToPDF}>
                <PictureAsPdf sx={{ mr: 1 }} /> Export as PDF
              </MenuItem>
            </Menu>

            <Menu
              anchorEl={filterAnchorEl}
              open={Boolean(filterAnchorEl)}
              onClose={handleFilterMenuClose}
            >
              <MenuItem onClick={handleFilterMenuClose}>This Month</MenuItem>
              <MenuItem onClick={handleFilterMenuClose}>Last Month</MenuItem>
              <MenuItem onClick={handleFilterMenuClose}>Custom Range</MenuItem>
            </Menu>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <InsertChart color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="text.secondary">
                    Total Expenses
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ mt: 1 }}>
                  {Math.round(totalExpenses)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {filteredExpenses.length} transactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <TrendingUp color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="text.secondary">
                    Days with Expenses
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ mt: 1 }}>
                  {daysWithExpenses}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {Math.round((daysWithExpenses / daysInMonth) * 100)}% of month
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography variant="h6" color="text.secondary">
                    Daily Average
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ mt: 1 }}>
                  {Math.round(totalExpenses / (daysWithExpenses || 1))}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {daysInMonth - daysWithExpenses} days without expenses
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={3} sx={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: (theme) => theme.palette.grey[100] }}>
                  <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Day</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '40%', textAlign: 'right' }}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const date = new Date(currentYear, currentMonth - 1, day);
                  const dayData = filteredExpenses.find(exp => {
                    const expDate = typeof exp.date === 'string' && !isNaN(Date.parse(exp.date)) ? new Date(exp.date) : exp.date;
                    return new Date(expDate).getDate() === day;
                  });
                  const hasExpense = !!dayData;

                  return (
                    <TableRow
                      key={day}
                      hover
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        backgroundColor: hasExpense ? 'inherit' : (theme) => theme.palette.action.hover
                      }}
                    >
                      <TableCell>{day}</TableCell>
                      <TableCell>
                        {date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell sx={{
                        textAlign: 'right',
                        color: hasExpense ? 'inherit' : 'text.secondary',
                        fontWeight: hasExpense ? 'bold' : 'normal'
                      }}>
                        {hasExpense ? Math.round(dayData.amount) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </LocalizationProvider>
  );
}