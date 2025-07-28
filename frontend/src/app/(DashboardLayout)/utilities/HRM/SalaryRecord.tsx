"use client";
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Chip, Avatar, CircularProgress,
  Tooltip, Alert, Grid, InputAdornment, TableContainer, TablePagination,
  useMediaQuery, useTheme, Divider, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import {
  AttachMoney, CloudDownload, Add, Paid, Edit,
  Search, Clear, Visibility, Info, Group
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
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { enqueueSnackbar } = useSnackbar();

  // State for dialogs and forms
  const [openSalaryDialog, setOpenSalaryDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDepartmentDialog, setOpenDepartmentDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState<any>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
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

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(emp => {
      if (emp.department) {
        depts.add(emp.department);
      }
    });
    return Array.from(depts);
  }, [employees]);

  // Filter records by search term
  const filteredRecords = useMemo(() => {
    return salaryRecords.filter(record => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (record.employeeName?.toLowerCase().includes(searchLower) ?? false) ||
        (record.employeePosition?.toLowerCase().includes(searchLower) ?? false) ||
        (record.department?.toLowerCase().includes(searchLower) ?? false) ||
        (record.status?.toLowerCase().includes(searchLower) ?? false) ||
        (record.employeeContact?.includes(searchTerm) ?? false) ||
        (record.employeeEmail?.includes(searchTerm) ?? false) ||
        (record.netSalary?.toString().includes(searchTerm) ?? false)
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

  const handleDepartmentSalarySubmit = async () => {
    try {
      if (!selectedDepartment) {
        enqueueSnackbar('Please select a department', { variant: 'warning' });
        return;
      }

      const departmentEmployees = employees
        .filter(emp => emp.department === selectedDepartment)
        .map(emp => emp._id);

      if (departmentEmployees.length === 0) {
        enqueueSnackbar('No employees found in selected department', { variant: 'warning' });
        return;
      }

      await api.post('/salaries/bulk', {
        employees: departmentEmployees,
        month: salaryForm.month,
        year: salaryForm.year,
        allowances: salaryForm.allowances || 0,
        deductions: salaryForm.deductions || 0,
        bonuses: salaryForm.bonuses || 0
      });
      enqueueSnackbar(`Salary records added for ${departmentEmployees.length} employees`, { variant: 'success' });
      resetDepartmentForm();
      await fetchData();
    } catch (error: any) {
      console.error('Error saving department salaries:', error);
      enqueueSnackbar(error.response?.data?.message || 'Failed to add department salary records', {
        variant: 'error',
        autoHideDuration: 3000
      });
    }
  };

  const handleMarkDepartmentPaid = async () => {
    try {
      if (!selectedDepartment) {
        enqueueSnackbar('Please select a department', { variant: 'warning' });
        return;
      }

      const departmentEmployees = employees
        .filter(emp => emp.department === selectedDepartment)
        .map(emp => emp._id);

      if (departmentEmployees.length === 0) {
        enqueueSnackbar('No employees found in selected department', { variant: 'warning' });
        return;
      }

      const pendingSalaries = salaryRecords
        .filter(record => 
          record.employeeId && 
          departmentEmployees.includes(record.employeeId) &&
          record.status === 'pending' &&
          record.month === currentMonth &&
          record.year === currentYear
        )
        .map(record => record._id)
        .filter((id): id is string => id !== undefined);

      if (pendingSalaries.length === 0) {
        enqueueSnackbar('No pending salaries found for selected department', { variant: 'warning' });
        return;
      }

      await Promise.all(
        pendingSalaries.map(id =>
          api.patch(`/salaries/${id}`, {
            status: 'paid',
            paymentDate: new Date().toISOString()
          })
        )
      );
      enqueueSnackbar(`Marked ${pendingSalaries.length} salaries as paid`, { variant: 'success' });
      setSelectedDepartment('');
      await fetchData();
    } catch (error: any) {
      console.error('Error marking department salaries as paid:', error);
      enqueueSnackbar(error.response?.data?.message || 'Failed to mark department salaries as paid', {
        variant: 'error',
        autoHideDuration: 3000
      });
    }
  };

  const handleEditSubmit = async () => {
    try {
      if (!selectedRecord) {
        enqueueSnackbar('No record selected for editing', { variant: 'warning' });
        return;
      }

      const employee = employees.find(emp => emp._id === selectedRecord.employeeId);
      if (!employee) {
        enqueueSnackbar('Employee not found', { variant: 'error' });
        return;
      }

      const basicSalary = Number(employee.basicSalary) || 0;
      const allowances = Number(salaryForm.allowances) || 0;
      const deductions = Number(salaryForm.deductions) || 0;
      const bonuses = Number(salaryForm.bonuses) || 0;
      const netSalary = basicSalary + allowances - deductions + bonuses;

      await api.patch(`/salaries/${selectedRecord._id}`, {
        month: salaryForm.month,
        year: salaryForm.year,
        basicSalary,
        allowances,
        deductions,
        bonuses,
        netSalary,
        department: employee.department || '',
        employeeName: employee.name,
        employeePosition: employee.position
      });
      enqueueSnackbar('Salary record updated successfully', { variant: 'success' });
      resetEditForm();
      await fetchData();
    } catch (error: any) {
      console.error('Error updating salary:', error);
      enqueueSnackbar(error.response?.data?.message || 'Failed to update salary record', {
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

  const resetDepartmentForm = () => {
    setOpenDepartmentDialog(false);
    setSelectedDepartment('');
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

  const resetEditForm = () => {
    setOpenEditDialog(false);
    setSelectedRecord(null);
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

  const handleEditRecord = (record: SalaryRecord) => {
    setSelectedRecord(record);
    setSalaryForm({
      month: record.month,
      year: record.year,
      allowances: record.allowances || 0,
      deductions: record.deductions || 0,
      bonuses: record.bonuses || 0,
      employeeName: record.employeeName || '',
      employeePosition: record.employeePosition || '',
      department: record.department || ''
    });
    setOpenEditDialog(true);
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
    <Box sx={{ 
      // p: { xs: 1, sm: 2, md: 3 }, 
      maxWidth: '100vw', 
      overflowX: 'auto',
      boxSizing: 'border-box'
    }}>
      {/* Summary Cards */}
      <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 1, sm: 2 } }}>
        {[
          { title: 'Total Records', value: salaryRecords.length, color: '#1976d2' },
          { title: 'Paid', value: summaryStats.totalPaid, color: '#2e7d32' },
          { title: 'Pending', value: summaryStats.totalPending, color: '#ed6c02' },
          { title: 'Total Amount', value: `$${summaryStats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#0288d1' }
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper sx={{ 
              p: { xs: 1, sm: 2 }, 
              textAlign: 'center', 
              bgcolor: stat.color, 
              color: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <Typography variant={isMobile ? "body1" : "h6"}>{stat.title}</Typography>
              <Typography variant={isMobile ? "h6" : "h4"}>{stat.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filters and Actions */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' }, 
          mb: { xs: 1, sm: 2 }, 
          gap: 1,
          flexWrap: 'wrap'
        }}
      >
        <Box sx={{ display: 'flex', width: { xs: '100%', sm: 'auto' }, flex: 1 }}>
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
            sx={{ width: { xs: '100%', sm: '250px' } }}
          />
        </Box>

        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          flexWrap: 'wrap', 
          width: { xs: '100%', sm: 'auto' },
          justifyContent: { xs: 'space-between', sm: 'flex-end' }
        }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Month"
              type="number"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
              inputProps={{ min: 1, max: 12 }}
              size="small"
              sx={{ width: { xs: '48%', sm: 100 } }}
            />
            <TextField
              label="Year"
              type="number"
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value) || new Date().getFullYear())}
              size="small"
              sx={{ width: { xs: '48%', sm: 100 } }}
            />
          </Box>

          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={() => handleExport('salaries')}
            sx={{ 
              whiteSpace: 'nowrap', 
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 2 }
            }}
          >
            {isMobile ? 'Export' : 'Export Data'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => setOpenSalaryDialog(true)}
            sx={{ 
              whiteSpace: 'nowrap', 
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 2 }
            }}
          >
            {isMobile ? 'Add' : 'Add Salary'}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Group />}
            onClick={() => setOpenDepartmentDialog(true)}
            sx={{ 
              whiteSpace: 'nowrap', 
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 2 }
            }}
          >
            {isMobile ? 'Dept' : 'Department Salaries'}
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '200px' 
        }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ 
            borderRadius: 2, 
            boxShadow: { xs: 1, sm: 3 }, 
            maxWidth: '100%',
            overflowX: 'auto'
          }}>
            <Table sx={{ minWidth: { xs: 'auto', sm: 650 } }}>
              <TableHead sx={{ bgcolor: theme.palette.grey[100] }}>
                <TableRow>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>Employee</TableCell>
                  {!isMobile && <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>Position</TableCell>}
                  {!isMobile && <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>Department</TableCell>}
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>Period</TableCell>
                  {!isMobile && <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>Basic</TableCell>}
                  {!isMobile && <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>Allowances</TableCell>}
                  {!isMobile && <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>Deductions</TableCell>}
                  {!isMobile && <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>Bonuses</TableCell>}
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>Net Salary</TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((record: SalaryRecord) => (
                    <TableRow key={record._id} hover>
                      <TableCell sx={{ py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={record.employeeAvatar} sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                            {record.employeeName?.charAt(0) || '?'}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              {record.employeeName || 'Unknown'}
                            </Typography>
                            {isMobile && (
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                {record.employeePosition || '-'}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      {!isMobile && <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>{record.employeePosition || '-'}</TableCell>}
                      {!isMobile && <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>{record.department || '-'}</TableCell>}
                      <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>
                        {format(new Date(record.year, record.month - 1, 1), 'MMM yyyy')}
                      </TableCell>
                      {!isMobile && <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>${record.basicSalary?.toFixed(2) || '0.00'}</TableCell>}
                      {!isMobile && <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>${record.allowances?.toFixed(2) || '0.00'}</TableCell>}
                      {!isMobile && <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>${record.deductions?.toFixed(2) || '0.00'}</TableCell>}
                      {!isMobile && <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1 }}>${record.bonuses?.toFixed(2) || '0.00'}</TableCell>}
                      <TableCell sx={{ py: 1 }}>
                        <Typography sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          ${record.netSalary?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip
                          label={record.status?.toUpperCase() || 'UNKNOWN'}
                          color={
                            record.status === 'paid' ? 'success' :
                              record.status === 'pending' ? 'warning' :
                                'error'
                          }
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1 }}>
                        <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, justifyContent: 'center' }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewRecord(record)}
                              color="info"
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Record">
                            <IconButton
                              size="small"
                              onClick={() => handleEditRecord(record)}
                              color="primary"
                            >
                              <Edit fontSize="small" />
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
                      <Typography variant="body1" color="text.secondary" sx={{ py: 2, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
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
            sx={{ mt: 1, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
          />
        </>
      )}

      {/* Add Salary Dialog */}
      <Dialog
        open={openSalaryDialog}
        onClose={resetSalaryForm}
        maxWidth={isMobile ? 'xs' : 'sm'}
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoney color="primary" />
            <Typography variant={isMobile ? 'body1' : 'h6'}>Add Salary Record</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1, sm: 2 } }}>
          {selectedEmployees.length > 0 ? (
            <Alert severity="info" sx={{ mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Adding salary records for {selectedEmployees.length} selected employees
            </Alert>
          ) : (
            <>
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => `${option.name} (${option.position})`}
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
                    sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                  />
                )}
              />

              {selectedEmployeeDetails && (
                <Box sx={{ mt: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant={isMobile ? 'body2' : 'subtitle1'} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Info color="info" /> Employee Details
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Department:</Typography>
                      <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{selectedEmployeeDetails.department || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Basic Salary:</Typography>
                      <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>${selectedEmployeeDetails.basicSalary?.toFixed(2) || '0.00'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Email:</Typography>
                      <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{selectedEmployeeDetails.email || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Contact:</Typography>
                      <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{selectedEmployeeDetails.contact || '-'}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </>
          )}

          <Grid container spacing={1} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
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
                sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                fullWidth
                label="Year"
                type="number"
                value={salaryForm.year}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  year: parseInt(e.target.value) || new Date().getFullYear()
                })}
                required
                sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75 pur: 0.75rem' } }}}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
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
                sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
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
                sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
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
                sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
          <Button onClick={resetSalaryForm} color="inherit" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Cancel</Button>
          <Button
            onClick={handleSalarySubmit}
            variant="contained"
            color="primary"
            disabled={!selectedEmployee && selectedEmployees.length === 0}
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department Salary Dialog */}
      <Dialog
        open={openDepartmentDialog}
        onClose={resetDepartmentForm}
        maxWidth={isMobile ? 'xs' : 'sm'}
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Group color="primary" />
            <Typography variant={isMobile ? 'body1' : 'h6'}>Department Salary Management</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1, sm: 2 } }}>
          <FormControl fullWidth margin="dense">
            <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Department</InputLabel>
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value as string)}
              label="Department"
              sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
            >
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Grid container spacing={1} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
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
                sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                fullWidth
                label="Year"
                type="number"
                value={salaryForm.year}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  year: parseInt(e.target.value) || new Date().getFullYear()
                })}
                required
                sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
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
                sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
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
                sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
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
                sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
              />
            </Grid>
          </Grid>

          {selectedDepartment && (
            <Box sx={{ mt: 1 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<Paid />}
                onClick={handleMarkDepartmentPaid}
                fullWidth
                sx={{ mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Mark Department as Paid
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={handleDepartmentSalarySubmit}
                fullWidth
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Create Department Salaries
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
          <Button onClick={resetDepartmentForm} color="inherit" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Salary Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={resetEditForm}
        maxWidth={isMobile ? 'xs' : 'sm'}
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit color="primary" />
            <Typography variant={isMobile ? 'body1' : 'h6'}>Edit Salary Record</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1, sm: 2 } }}>
          {selectedRecord && (
            <>
              <Box sx={{ mt: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant={isMobile ? 'body2' : 'subtitle1'} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Info color="info" /> Employee Details
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Name:</Typography>
                    <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{selectedRecord.employeeName || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Department:</Typography>
                    <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{selectedRecord.department || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Position:</Typography>
                    <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{selectedRecord.employeePosition || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Basic Salary:</Typography>
                    <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>${selectedRecord.basicSalary?.toFixed(2) || '0.00'}</Typography>
                  </Grid>
                </Grid>
              </Box>

              <Grid container spacing={1} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    margin="dense"
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
                    sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    margin="dense"
                    fullWidth
                    label="Year"
                    type="number"
                    value={salaryForm.year}
                    onChange={(e) => setSalaryForm({
                      ...salaryForm,
                      year: parseInt(e.target.value) || new Date().getFullYear()
                    })}
                    required
                    sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    margin="dense"
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
                    sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    margin="dense"
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
                    sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    margin="dense"
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
                    sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
          <Button onClick={resetEditForm} color="inherit" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Cancel</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            color="primary"
            disabled={!selectedRecord}
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Salary Details Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth={isMobile ? 'xs' : 'sm'}
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Paid color="primary" />
            <Typography variant={isMobile ? 'body1' : 'h6'}>Salary Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1, sm: 2 } }}>
          {selectedRecord && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar src={selectedRecord.employeeAvatar} sx={{ width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
                  {selectedRecord.employeeName?.charAt(0) || '?'}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    {selectedRecord.employeeName || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    {selectedRecord.employeePosition || '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    {selectedRecord.department || '-'}
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Period</Typography>
                  <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    {format(new Date(selectedRecord.year, selectedRecord.month - 1, 1), 'MMMM yyyy')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Status</Typography>
                  <Chip
                    label={selectedRecord.status?.toUpperCase() || 'UNKNOWN'}
                    color={
                      selectedRecord.status === 'paid' ? 'success' :
                        selectedRecord.status === 'pending' ? 'warning' :
                          'error'
                    }
                    size="small"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  />
                </Grid>

                {selectedRecord.employeeContact && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Contact</Typography>
                    <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{selectedRecord.employeeContact}</Typography>
                  </Grid>
                )}

                {selectedRecord.employeeEmail && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Email</Typography>
                    <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{selectedRecord.employeeEmail}</Typography>
                  </Grid>
                )}

                <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Basic Salary</Typography>
                  <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>${selectedRecord.basicSalary?.toFixed(2) || '0.00'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Allowances</Typography>
                  <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>${selectedRecord.allowances?.toFixed(2) || '0.00'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Deductions</Typography>
                  <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>${selectedRecord.deductions?.toFixed(2) || '0.00'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Bonuses</Typography>
                  <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>${selectedRecord.bonuses?.toFixed(2) || '0.00'}</Typography>
                </Grid>

                <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Net Salary</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    ${selectedRecord.netSalary?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </Typography>
                </Grid>

                {selectedRecord.status === 'paid' && selectedRecord.paymentDate && (
                  <>
                    <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Payment Date</Typography>
                      <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                        {format(new Date(selectedRecord.paymentDate), 'PPPp')}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
          <Button onClick={() => setOpenViewDialog(false)} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalaryRecordTab;