'use client';
import { useState, useEffect } from 'react';
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
  TrendingUp,
  CalendarMonth
} from '@mui/icons-material';
import { fetchYearlyExpenses } from '../api/expenseApi';
import { LocalExpense } from './expense';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

export default function YearlyExpensesPage() {
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    loadExpenses();
  }, [currentYear]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await fetchYearlyExpenses(currentYear);
      const monthlyTotals: Record<number, LocalExpense> = {};
      for (let m = 0; m < 12; m++) {
        monthlyTotals[m] = {
          _id: `month_${m + 1}_${currentYear}`,
          amount: 0,
          date: new Date(currentYear, m, 1).toISOString(),
          name: '',
          category: '',
          description: '',
          receipt: false,
          yearlyTotal: 0,
        };
      }

      data.forEach(exp => {
        const dateObj = typeof exp.date === 'string' ? new Date(exp.date) : exp.date;
        const month = dateObj.getMonth();
        monthlyTotals[month].amount = exp.amount;
      });

      const total = Object.values(monthlyTotals).reduce((sum, exp) => sum + exp.amount, 0);
      setExpenses(Object.values(monthlyTotals));
      setTotalExpenses(total);
    } catch (err) {
      console.error('Error loading yearly expenses:', err);
      setExpenses([]);
      setTotalExpenses(0);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const exportToCSV = () => {
    const headers = ['Month', 'Year', 'Total Amount'];
    const csvContent = [
      headers.join(','),
      ...expenses.map(exp => [
        new Date(exp.date).toLocaleString('default', { month: 'long' }),
        currentYear,
        Math.round(exp.amount)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `yearly-expenses-${currentYear}.csv`);
    handleMenuClose();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = `Yearly Expenses - ${currentYear}`;
    
    doc.text(title, 14, 16);
    
    (doc as any).autoTable({
      startY: 25,
      head: [['Month', 'Year', 'Total Amount']],
      body: expenses.map(exp => [
        new Date(exp.date).toLocaleString('default', { month: 'long' }),
        currentYear,
        Math.round(exp.amount)
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [63, 81, 181] }
    });
    
    doc.save(`yearly-expenses-${currentYear}.pdf`);
    handleMenuClose();
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date && !isNaN(date.getTime())) {
      setCurrentYear(date.getFullYear());
    }
  };

  const filteredExpenses = expenses.filter(exp => 
    new Date(exp.date).toLocaleString('default', { month: 'long' }).toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.amount.toString().includes(searchTerm)
  );

  const averageMonthlyExpense = filteredExpenses.length > 0 ? totalExpenses / 12 : 0;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3} sx={{ mb: 3 }} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1" gutterBottom>
              Yearly Expenses Overview
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DatePicker
                views={['year']}
                label="Select Year"
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
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ height: '100%', background: 'linear-gradient(135deg, #3f51b5 0%, #2196f3 100%)' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <InsertChart sx={{ mr: 1, color: 'white' }} />
                  <Typography variant="h6" color="white">
                    Total Yearly Expenses
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ mt: 1, color: 'white' }}>
                  {Math.round(totalExpenses)}
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mt: 1 }}>
                  {filteredExpenses.length} months recorded
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ height: '100%', background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <TrendingUp sx={{ mr: 1, color: 'white' }} />
                  <Typography variant="h6" color="white">
                    Average Monthly
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ mt: 1, color: 'white' }}>
                  {Math.round(averageMonthlyExpense)}
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mt: 1 }}>
                  {12 - filteredExpenses.filter(exp => exp.amount > 0).length} months without data
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ height: '100%', background: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <CalendarMonth sx={{ mr: 1, color: 'white' }} />
                  <Typography variant="h6" color="white">
                    Year Overview
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ mt: 1, color: 'white' }}>
                  {currentYear}
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mt: 1 }}>
                  Financial Year Summary
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
          <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '10%' }}>#</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '45%' }}>Month</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '45%', textAlign: 'right' }}>Total Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="textSecondary">
                        No expenses found for the selected criteria
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense, index) => (
                    <TableRow 
                      key={expense._id}
                      hover
                      sx={{ 
                        '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' },
                        '&:hover': { backgroundColor: '#e3f2fd' },
                        transition: 'background-color 0.3s'
                      }}
                    >
                      <TableCell sx={{ py: 2 }}>{index + 1}</TableCell>
                      <TableCell sx={{ py: 2 }}>
                        {new Date(expense.date).toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </TableCell>
                      <TableCell sx={{ py: 2, textAlign: 'right', fontWeight: 'bold' }}>
                        {Math.round(expense.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </LocalizationProvider>
  );
}