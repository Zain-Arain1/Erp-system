"use client";
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Chip, Avatar, CircularProgress,
  Tooltip, Alert, Grid, InputAdornment, TableContainer, TablePagination,
  useMediaQuery, useTheme, Divider
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import {
  AttachMoney, CloudDownload, Add, Paid,
  Search, Clear, Visibility, Info
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { SalaryRecord } from './HRMTypes';
import { format } from 'date-fns';

interface SalaryRecordTabProps {
  salaryRecords: SalaryRecord[];
  loading: boolean;
  fetchData: () => Promise<void>;
  currentMonth: number;
  setCurrentMonth: (month: number) => void;
  currentYear: number;
  setCurrentYear: (year: number) => void;
  employees: any[];
  selectedEmployees: string[];
  handleExport: (type: 'employees' | 'salaries' | 'advances' | 'attendances') => Promise<void>;
}

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/hrm`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

const SalaryRecordTab: React.FC<SalaryRecordTabProps> = ({
  salaryRecords,
  loading,
  fetchData,
  currentMonth,
  setCurrentMonth,
  currentYear,
  setCurrentYear,
  employees,
  selectedEmployees,
  handleExport
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { enqueueSnackbar } = useSnackbar();

  // State for dialog and form
  const [openSalaryDialog, setOpenSalaryDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState<any>(null);
  const [salaryForm, setSalaryForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    allowances: 0,
    deductions: 0,
    bonuses: 0,
    employeeName: '',
    employeePosition: '',
    department: ''
  });

  // Table pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter records by search term
  const filteredRecords = useMemo(() => {
    return salaryRecords.filter(record => {
      const searchLower = searchTerm.toLowerCase();
      return (
        record.employeeName?.toLowerCase().includes(searchLower) ||
        record.employeePosition?.toLowerCase().includes(searchLower) ||
        record.department?.toLowerCase().includes(searchLower) ||
        record.status?.toLowerCase().includes(searchLower) ||
        record.employeeContact?.includes(searchTerm) ||
        record.employeeEmail?.includes(searchTerm) ||
        record.netSalary?.toString().includes(searchTerm)
      );
    });
  }, [salaryRecords, searchTerm]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredRecords, page, rowsPerPage]);

  const handleSalarySubmit = async () => {
    try {
      if (!selectedEmployee && selectedEmployees.length === 0) {
        enqueueSnackbar('Please select an employee or employees', { variant: 'warning' });
        return;
      }

      if (selectedEmployees.length > 0) {
        await api.post('/salaries/bulk', {
          employees: selectedEmployees,
          month: salaryForm.month,
          year: salaryForm.year,
          allowances: salaryForm.allowances || 0,
          deductions: salaryForm.deductions || 0,
          bonuses: salaryForm.bonuses || 0
        });
        enqueueSnackbar('Bulk salary records added successfully', { variant: 'success' });
      } else {
        const employee = employees.find(emp => emp._id === selectedEmployee);
        if (!employee) {
          enqueueSnackbar('Employee not found', { variant: 'error' });
          return;
        }

        const basicSalary = Number(employee.basicSalary) || 0;
        const allowances = Number(salaryForm.allowances) || 0;
        const deductions = Number(salaryForm.deductions) || 0;
        const bonuses = Number(salaryForm.bonuses) || 0;

        const netSalary = basicSalary + allowances - deductions + bonuses;

        await api.post('/salaries', {
          employeeId: selectedEmployee,
          month: salaryForm.month,
          year: salaryForm.year,
          basicSalary,
          allowances,
          deductions,
          bonuses,
          netSalary,
          status: 'pending',
          department: employee.department || '',
          employeeName: employee.name,
          employeePosition: employee.position
        });
        enqueueSnackbar('Salary record added successfully', { variant: 'success' });
      }

      resetSalaryForm();
      await fetchData();
    } catch (error: any) {
      console.error('Error saving salary:', error);
      enqueueSnackbar(error.response?.data?.message || 'Failed to add salary record', {
        variant: 'error',
        autoHideDuration: 3000
      });
    }
  };

  const resetSalaryForm = () => {
    setOpenSalaryDialog(false);
    setSelectedEmployee('');
    setSelectedEmployeeDetails(null);
    setSalaryForm({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      allowances: 0,
      deductions: 0,
      bonuses: 0,
      employeeName: '',
      employeePosition: '',
      department: ''
    });
  };

  const paySalary = async (id: string) => {
    try {
      await api.patch(`/salaries/${id}`, {
        status: 'paid',
        paymentDate: new Date().toISOString()
      });
      enqueueSnackbar('Salary marked as paid successfully', { variant: 'success' });
      await fetchData();
    } catch (error: any) {
      console.error('Error paying salary:', error);
      enqueueSnackbar(error.response?.data?.message || 'Failed to mark salary as paid', {
        variant: 'error',
        autoHideDuration: 3000
      });
    }
  };

  const handleViewRecord = (record: SalaryRecord) => {
    setSelectedRecord(record);
    setOpenViewDialog(true);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const paidRecords = salaryRecords.filter(r => r.status === 'paid');
    const pendingRecords = salaryRecords.filter(r => r.status === 'pending');

    return {
      totalPaid: paidRecords.length,
      totalPending: pendingRecords.length,
      totalAmount: salaryRecords.reduce((sum, record) => sum + (record.netSalary || 0), 0),
      avgSalary: salaryRecords.length > 0
        ? salaryRecords.reduce((sum, record) => sum + (record.netSalary || 0), 0) / salaryRecords.length
        : 0
    };
  }, [salaryRecords]);

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
  <Grid item xs={12} sm={6} md={3}>
    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#1976d2', color: '#ffffff' }}>
      <Typography variant="h6">Total Records</Typography>
      <Typography variant="h4">{salaryRecords.length}</Typography>
    </Paper>
  </Grid>
  <Grid item xs={12} sm={6} md={3}>
    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#2e7d32', color: '#ffffff' }}>
      <Typography variant="h6">Paid</Typography>
      <Typography variant="h4">{summaryStats.totalPaid}</Typography>
    </Paper>
  </Grid>
  <Grid item xs={12} sm={6} md={3}>
    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ed6c02', color: '#ffffff' }}>
      <Typography variant="h6">Pending</Typography>
      <Typography variant="h4">{summaryStats.totalPending}</Typography>
    </Paper>
  </Grid>
  <Grid item xs={12} sm={6} md={3}>
    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#0288d1', color: '#ffffff' }}>
      <Typography variant="h6">Total Amount</Typography>
      <Typography variant="h4">
        ${summaryStats.totalAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Typography>
    </Paper>
  </Grid>
</Grid>


      {/* Filters and Actions */}
      <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems="center" mb={3} gap={2}>
        <Box display="flex" gap={1} width={isMobile ? '100%' : 'auto'}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <Clear fontSize="small" />
                </IconButton>
              )
            }}
            fullWidth={isMobile}
          />
        </Box>

        <Box display="flex" gap={1} width={isMobile ? '100%' : 'auto'}>
          <Box display="flex" gap={1}>
            <TextField
              label="Month"
              type="number"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
              inputProps={{ min: 1, max: 12 }}
              size="small"
              sx={{ width: 100 }}
            />
            <TextField
              label="Year"
              type="number"
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value) || new Date().getFullYear())}
              size="small"
              sx={{ width: 100 }}
            />
          </Box>

          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={() => handleExport('salaries')}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {isMobile ? 'Export' : 'Export Data'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => setOpenSalaryDialog(true)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {isMobile ? 'Add' : 'Add Salary'}
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
            <Table>
              <TableHead sx={{ bgcolor: theme.palette.grey[100] }}>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  {!isMobile && <TableCell>Position</TableCell>}
                  {!isMobile && <TableCell>Department</TableCell>}
                  <TableCell>Period</TableCell>
                  {!isMobile && <TableCell>Basic</TableCell>}
                  {!isMobile && <TableCell>Allowances</TableCell>}
                  {!isMobile && <TableCell>Deductions</TableCell>}
                  {!isMobile && <TableCell>Bonuses</TableCell>}
                  <TableCell>Net Salary</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((record: SalaryRecord) => (
                    <TableRow key={record._id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar src={record.employeeAvatar}>
                            {record.employeeName?.charAt(0) || '?'}
                          </Avatar>
                          <Box>
                            <Typography fontWeight="bold">
                              {record.employeeName || 'Unknown'}
                            </Typography>
                            {isMobile && (
                              <Typography variant="body2" color="text.secondary">
                                {record.employeePosition || '-'}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      {!isMobile && <TableCell>{record.employeePosition || '-'}</TableCell>}
                      {!isMobile && <TableCell>{record.department || '-'}</TableCell>}
                      <TableCell>
                        {format(new Date(record.year, record.month - 1, 1), 'MMM yyyy')}
                      </TableCell>
                      {!isMobile && <TableCell>${record.basicSalary?.toFixed(2) || '0.00'}</TableCell>}
                      {!isMobile && <TableCell>${record.allowances?.toFixed(2) || '0.00'}</TableCell>}
                      {!isMobile && <TableCell>${record.deductions?.toFixed(2) || '0.00'}</TableCell>}
                      {!isMobile && <TableCell>${record.bonuses?.toFixed(2) || '0.00'}</TableCell>}
                      <TableCell>
                        <Typography fontWeight="bold">
                          ${record.netSalary?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.status?.toUpperCase() || 'UNKNOWN'}
                          color={
                            record.status === 'paid' ? 'success' :
                              record.status === 'pending' ? 'warning' :
                                'error'
                          }
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" gap={1} justifyContent="center">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewRecord(record)}
                              color="info"
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {record.status === 'pending' && (
                            <Tooltip title="Mark as Paid">
                              <IconButton
                                size="small"
                                onClick={() => paySalary(record._id || '')}
                                color="success"
                              >
                                <Paid fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isMobile ? 5 : 11} align="center">
                      <Typography variant="body1" color="text.secondary" py={3}>
                        No salary records found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredRecords.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ mt: 2 }}
          />
        </>
      )}

      {/* Add Salary Dialog */}
      <Dialog
        open={openSalaryDialog}
        onClose={resetSalaryForm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AttachMoney color="primary" />
            <Typography variant="h6">Add Salary Record</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedEmployees.length > 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Adding salary records for {selectedEmployees.length} selected employees
            </Alert>
          ) : (
            <>
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => `${option.name} (${option.position})`}
                // Add this line to ensure unique keys
                getOptionKey={(option) => option._id}
                onChange={(_, value) => {
                  if (value) {
                    setSelectedEmployee(value._id);
                    setSelectedEmployeeDetails(value);
                    setSalaryForm({
                      ...salaryForm,
                      employeeName: value.name,
                      employeePosition: value.position,
                      department: value.department || ''
                    });
                  } else {
                    setSelectedEmployee('');
                    setSelectedEmployeeDetails(null);
                    setSalaryForm({
                      ...salaryForm,
                      employeeName: '',
                      employeePosition: '',
                      department: ''
                    });
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    margin="normal"
                    label="Employee"
                    required
                    fullWidth
                  />
                )}
              />

              {selectedEmployeeDetails && (
                <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Info color="info" /> Employee Details
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Department:</Typography>
                      <Typography>{selectedEmployeeDetails.department || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Basic Salary:</Typography>
                      <Typography>${selectedEmployeeDetails.basicSalary?.toFixed(2) || '0.00'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Email:</Typography>
                      <Typography>{selectedEmployeeDetails.email || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Contact:</Typography>
                      <Typography>{selectedEmployeeDetails.contact || '-'}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Month"
                type="number"
                value={salaryForm.month}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  month: Math.min(12, Math.max(1, parseInt(e.target.value) || 1))
                })}
                inputProps={{ min: 1, max: 12 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Year"
                type="number"
                value={salaryForm.year}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  year: parseInt(e.target.value) || new Date().getFullYear()
                })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Allowances"
                type="number"
                value={salaryForm.allowances}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  allowances: parseFloat(e.target.value) || 0
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Deductions"
                type="number"
                value={salaryForm.deductions}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  deductions: parseFloat(e.target.value) || 0
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="normal"
                fullWidth
                label="Bonuses"
                type="number"
                value={salaryForm.bonuses}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  bonuses: parseFloat(e.target.value) || 0
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetSalaryForm} color="inherit">Cancel</Button>
          <Button
            onClick={handleSalarySubmit}
            variant="contained"
            color="primary"
            disabled={!selectedEmployee && selectedEmployees.length === 0}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Salary Details Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Paid color="primary" />
            <Typography variant="h6">Salary Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar src={selectedRecord.employeeAvatar} sx={{ width: 56, height: 56 }}>
                  {selectedRecord.employeeName?.charAt(0) || '?'}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedRecord.employeeName || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedRecord.employeePosition || '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedRecord.department || '-'}
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Period</Typography>
                  <Typography>
                    {format(new Date(selectedRecord.year, selectedRecord.month - 1, 1), 'MMMM yyyy')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedRecord.status?.toUpperCase() || 'UNKNOWN'}
                    color={
                      selectedRecord.status === 'paid' ? 'success' :
                        selectedRecord.status === 'pending' ? 'warning' :
                          'error'
                    }
                    size="small"
                  />
                </Grid>

                {selectedRecord.employeeContact && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Contact</Typography>
                    <Typography>{selectedRecord.employeeContact}</Typography>
                  </Grid>
                )}

                {selectedRecord.employeeEmail && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography>{selectedRecord.employeeEmail}</Typography>
                  </Grid>
                )}

                <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Basic Salary</Typography>
                  <Typography>${selectedRecord.basicSalary?.toFixed(2) || '0.00'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Allowances</Typography>
                  <Typography>${selectedRecord.allowances?.toFixed(2) || '0.00'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Deductions</Typography>
                  <Typography>${selectedRecord.deductions?.toFixed(2) || '0.00'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Bonuses</Typography>
                  <Typography>${selectedRecord.bonuses?.toFixed(2) || '0.00'}</Typography>
                </Grid>

                <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Net Salary</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    ${selectedRecord.netSalary?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </Typography>
                </Grid>

                {selectedRecord.status === 'paid' && selectedRecord.paymentDate && (
                  <>
                    <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Payment Date</Typography>
                      <Typography>
                        {format(new Date(selectedRecord.paymentDate), 'PPPp')}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalaryRecordTab;