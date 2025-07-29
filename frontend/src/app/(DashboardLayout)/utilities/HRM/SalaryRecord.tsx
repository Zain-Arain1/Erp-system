"use client";
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Chip, CircularProgress,
  Tooltip, Alert, Grid, InputAdornment, TableContainer, TablePagination,
  useMediaQuery, useTheme, Divider, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent, Avatar, List, ListItem, ListItemText, ListItemAvatar, Badge
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import {
  AttachMoney, CloudDownload, Add, Paid, Edit,
  Search, Clear, Info, Group, CheckCircle, PendingActions
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { SalaryRecord } from './HRMTypes';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

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
  handleExport,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { enqueueSnackbar } = useSnackbar();

  // State management
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
  const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 5 : 10);
  const [searchTerm, setSearchTerm] = useState('');

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(emp => emp.department && depts.add(emp.department));
    return Array.from(depts);
  }, [employees]);

  // Filter and paginate records
  const filteredRecords = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return salaryRecords.filter(record => (
      (record.employeeName?.toLowerCase().includes(searchLower) ?? false) ||
      (record.employeePosition?.toLowerCase().includes(searchLower) ?? false) ||
      (record.department?.toLowerCase().includes(searchLower) ?? false) ||
      (record.status?.toLowerCase().includes(searchLower) ?? false) ||
      (record.employeeContact?.includes(searchTerm) ?? false) ||
      (record.employeeEmail?.includes(searchTerm) ?? false) ||
      (record.netSalary?.toString().includes(searchTerm) ?? false)
    ));
  }, [salaryRecords, searchTerm]);

  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const paidRecords = salaryRecords.filter(r => r.status === 'paid');
    const pendingRecords = salaryRecords.filter(r => r.status === 'pending');

    return {
      totalPaid: paidRecords.length,
      totalPending: pendingRecords.length,
      totalAmount: salaryRecords.reduce((sum, record) => sum + (record.netSalary || 0), 0)
    };
  }, [salaryRecords]);

  // Mobile table columns
  const mobileColumns = [
    { id: 'employee', label: 'Employee' },
    { id: 'period', label: 'Period' },
    { id: 'netSalary', label: 'Salary' }
  ];

  const tabletColumns = [
    { id: 'employee', label: 'Employee' },
    { id: 'department', label: 'Dept' },
    { id: 'period', label: 'Period' },
    { id: 'netSalary', label: 'Salary' },
    { id: 'status', label: 'Status' }
  ];

  const desktopColumns = [
    { id: 'employee', label: 'Employee' },
    { id: 'position', label: 'Position' },
    { id: 'department', label: 'Department' },
    { id: 'period', label: 'Period' },
    { id: 'basicSalary', label: 'Basic' },
    { id: 'allowances', label: 'Allowances' },
    { id: 'deductions', label: 'Deductions' },
    { id: 'bonuses', label: 'Bonuses' },
    { id: 'netSalary', label: 'Net Salary' },
    { id: 'status', label: 'Status' }
  ];

  const columns = isMobile ? mobileColumns : isTablet ? tabletColumns : desktopColumns;

  // API operations
  const handleApiError = (error: any, defaultMessage: string) => {
    const message = error.response?.data?.message || defaultMessage;
    enqueueSnackbar(message, { variant: 'error' });
  };

  const handleSalarySubmit = async () => {
    try {
      if (!selectedEmployee && selectedEmployees.length === 0) {
        enqueueSnackbar('Please select an employee', { variant: 'warning' });
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
        enqueueSnackbar('Bulk salary records added', { variant: 'success' });
      } else {
        const employee = employees.find(emp => emp._id === selectedEmployee);
        if (!employee) {
          enqueueSnackbar('Employee not found', { variant: 'error' });
          return;
        }

        const netSalary = (employee.basicSalary || 0) + 
                         (salaryForm.allowances || 0) - 
                         (salaryForm.deductions || 0) + 
                         (salaryForm.bonuses || 0);

        await api.post('/salaries', {
          employeeId: selectedEmployee,
          month: salaryForm.month,
          year: salaryForm.year,
          basicSalary: employee.basicSalary,
          allowances: salaryForm.allowances,
          deductions: salaryForm.deductions,
          bonuses: salaryForm.bonuses,
          netSalary,
          status: 'pending',
          department: employee.department,
          employeeName: employee.name,
          employeePosition: employee.position
        });
        enqueueSnackbar('Salary record added', { variant: 'success' });
      }

      resetSalaryForm();
      await fetchData();
    } catch (error: any) {
      handleApiError(error, 'Failed to add salary record');
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
        enqueueSnackbar('No employees in department', { variant: 'warning' });
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
      enqueueSnackbar(`Salaries added for ${departmentEmployees.length} employees`, { variant: 'success' });
      resetDepartmentForm();
      await fetchData();
    } catch (error: any) {
      handleApiError(error, 'Failed to add department salaries');
    }
  };

  const handleMarkDepartmentPaid = async () => {
    try {
      if (!selectedDepartment) {
        enqueueSnackbar('Please select a department', { variant: 'warning' });
        return;
      }

      const pendingSalaries = salaryRecords
        .filter(record => 
          record.employeeId && 
          employees.some(emp => 
            emp._id === record.employeeId && 
            emp.department === selectedDepartment
          ) &&
          record.status === 'pending' &&
          record.month === currentMonth &&
          record.year === currentYear
        )
        .map(record => record._id)
        .filter((id): id is string => id !== undefined);

      if (pendingSalaries.length === 0) {
        enqueueSnackbar('No pending salaries found', { variant: 'warning' });
        return;
      }

      await Promise.all(
        pendingSalaries.map(id =>
          api.patch(`/salaries/${id}`, { status: 'paid', paymentDate: new Date().toISOString() })
        )
      );
      enqueueSnackbar(`Marked ${pendingSalaries.length} salaries as paid`, { variant: 'success' });
      setSelectedDepartment('');
      await fetchData();
    } catch (error: any) {
      handleApiError(error, 'Failed to mark salaries as paid');
    }
  };

  const handleEditSubmit = async () => {
    try {
      if (!selectedRecord) {
        enqueueSnackbar('No record selected', { variant: 'warning' });
        return;
      }

      const employee = employees.find(emp => emp._id === selectedRecord.employeeId);
      if (!employee) {
        enqueueSnackbar('Employee not found', { variant: 'error' });
        return;
      }

      const netSalary = (employee.basicSalary || 0) + 
                       (salaryForm.allowances || 0) - 
                       (salaryForm.deductions || 0) + 
                       (salaryForm.bonuses || 0);

      await api.patch(`/salaries/${selectedRecord._id}`, {
        month: salaryForm.month,
        year: salaryForm.year,
        basicSalary: employee.basicSalary,
        allowances: salaryForm.allowances,
        deductions: salaryForm.deductions,
        bonuses: salaryForm.bonuses,
        netSalary,
        department: employee.department,
        employeeName: employee.name,
        employeePosition: employee.position
      });
      enqueueSnackbar('Salary record updated', { variant: 'success' });
      resetEditForm();
      await fetchData();
    } catch (error: any) {
      handleApiError(error, 'Failed to update salary record');
    }
  };

  // Form reset functions
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

  // Record actions
  const paySalary = async (id: string) => {
    try {
      await api.patch(`/salaries/${id}`, { 
        status: 'paid', 
        paymentDate: new Date().toISOString() 
      });
      enqueueSnackbar('Salary marked as paid', { variant: 'success' });
      await fetchData();
    } catch (error: any) {
      handleApiError(error, 'Failed to mark salary as paid');
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

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Mobile card view for salary records
  const renderMobileCard = (record: SalaryRecord) => (
    <motion.div 
      key={record._id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        sx={{ 
          mb: 1, 
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }
        }}
      >
        <CardContent sx={{ p: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {record.employeeName || 'Unknown'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {record.department || '-'}
              </Typography>
            </Box>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              badgeContent={
                <Box sx={{ 
                  bgcolor: record.status === 'paid' ? theme.palette.success.main : theme.palette.warning.main,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: `2px solid ${theme.palette.background.paper}`
                }} />
              }
            >
              <Avatar 
                sx={{ 
                  width: 40, 
                  height: 40,
                  bgcolor: theme.palette.primary.main,
                  color: '#fff'
                }}
              >
                {record.employeeName?.charAt(0) || 'U'}
              </Avatar>
            </Badge>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Period</Typography>
              <Typography variant="body2">
                {format(new Date(record.year, record.month - 1, 1), 'MMM yyyy')}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Salary</Typography>
              <Typography variant="body2" fontWeight="bold">
                ${record.netSalary?.toLocaleString('en-US', { 
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2 
                }) || '0.00'}
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            <Tooltip title="View Details">
              <IconButton
                size="small"
                onClick={() => handleViewRecord(record)}
                color="info"
                sx={{ 
                  bgcolor: theme.palette.info.light,
                  '&:hover': { bgcolor: theme.palette.info.main, color: '#fff' }
                }}
              >
                <Info fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => handleEditRecord(record)}
                color="primary"
                sx={{ 
                  bgcolor: theme.palette.primary.light,
                  '&:hover': { bgcolor: theme.palette.primary.main, color: '#fff' }
                }}
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
                  sx={{ 
                    bgcolor: theme.palette.success.light,
                    '&:hover': { bgcolor: theme.palette.success.main, color: '#fff' }
                  }}
                >
                  <Paid fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <Box sx={{ 
      p: isMobile ? 1 : 2, 
      maxWidth: '100vw', 
      overflowX: 'hidden',
      bgcolor: 'background.default'
    }}>
      {/* Summary Cards */}
      <Grid container spacing={isMobile ? 1 : 2} sx={{ mb: 2 }}>
        {[
          { 
            title: 'Total', 
            value: salaryRecords.length, 
            icon: <AttachMoney fontSize={isMobile ? "small" : "medium"} />,
            color: theme.palette.primary.main 
          },
          { 
            title: 'Paid', 
            value: summaryStats.totalPaid, 
            icon: <CheckCircle fontSize={isMobile ? "small" : "medium"} />,
            color: theme.palette.success.main 
          },
          { 
            title: 'Pending', 
            value: summaryStats.totalPending, 
            icon: <PendingActions fontSize={isMobile ? "small" : "medium"} />,
            color: theme.palette.warning.main 
          },
          { 
            title: 'Total Amount', 
            value: `$${summaryStats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
            icon: <AttachMoney fontSize={isMobile ? "small" : "medium"} />,
            color: theme.palette.info.main 
          }
        ].map((stat, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <motion.div whileHover={{ y: -2 }}>
              <Paper sx={{ 
                p: isMobile ? 1 : 2, 
                textAlign: 'center', 
                bgcolor: stat.color, 
                color: '#fff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                borderRadius: 2,
                boxShadow: 3,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)'
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  {stat.icon}
                  <Typography variant={isMobile ? "caption" : "subtitle1"} sx={{ fontWeight: 'bold' }}>
                    {stat.title}
                  </Typography>
                </Box>
                <Typography variant={isMobile ? "body2" : "h5"} sx={{ fontWeight: 'bold' }}>
                  {stat.value}
                </Typography>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Filters and Actions */}
      <Paper 
        sx={{ 
          p: isMobile ? 1 : 2, 
          mb: 2, 
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: 1
        }}
      >
        <Grid container spacing={isMobile ? 1 : 2}>
          <Grid item xs={12}>
            <TextField
              label="Search"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <IconButton 
                    size="small" 
                    onClick={() => setSearchTerm('')}
                    sx={{ p: 0.5 }}
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                )
              }}
              fullWidth
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'background.default'
                }
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, auto)',
              gap: isMobile ? 1 : 2,
              alignItems: 'center'
            }}>
              <TextField
                label="Month"
                type="number"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                inputProps={{ min: 1, max: 12 }}
                size="small"
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: 'background.default'
                  }
                }}
              />
              <TextField
                label="Year"
                type="number"
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value) || new Date().getFullYear())}
                size="small"
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: 'background.default'
                  }
                }}
              />
              <Button
                variant="contained"
                startIcon={<CloudDownload fontSize="small" />}
                onClick={() => handleExport('salaries')}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }
                }}
              >
                {isMobile ? 'Export' : 'Export Data'}
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add fontSize="small" />}
                onClick={() => setOpenSalaryDialog(true)}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }
                }}
              >
                {isMobile ? 'Add' : 'Add Salary'}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Group fontSize="small" />}
                onClick={() => setOpenDepartmentDialog(true)}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }
                }}
              >
                {isMobile ? 'Dept' : 'Department'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Salary Records Display */}
      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 150,
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 3
        }}>
          <CircularProgress size={isMobile ? 24 : 40} />
          <Typography variant="body2" sx={{ ml: 2 }}>Loading salary records...</Typography>
        </Box>
      ) : (
        <>
          {isMobile ? (
            <Box>
              {filteredRecords.length > 0 ? (
                filteredRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map(record => renderMobileCard(record))
              ) : (
                <Paper sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  bgcolor: 'background.paper',
                  borderRadius: 2
                }}>
                  <Typography variant="body1" color="text.secondary">
                    No salary records found
                  </Typography>
                </Paper>
              )}
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredRecords.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{ mt: 1 }}
              />
            </Box>
          ) : (
            <>
              <TableContainer 
                component={Paper} 
                sx={{ 
                  borderRadius: 2, 
                  boxShadow: 1,
                  maxWidth: '100%',
                  overflowX: 'auto',
                  '&::-webkit-scrollbar': {
                    height: '6px'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: '3px'
                  }
                }}
              >
                <Table size={isTablet ? "small" : "medium"}>
                  <TableHead sx={{ bgcolor: theme.palette.grey[100] }}>
                    <TableRow>
                      {columns.map((column) => (
                        <TableCell 
                          key={column.id} 
                          sx={{ 
                            fontWeight: 'bold',
                            color: theme.palette.text.primary,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {column.label}
                        </TableCell>
                      ))}
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRecords.length > 0 ? (
                      paginatedRecords.map((record) => (
                        <TableRow 
                          key={record._id} 
                          hover 
                          sx={{ 
                            '&:last-child td, &:last-child th': { border: 0 },
                            '&:hover': {
                              bgcolor: theme.palette.action.hover
                            }
                          }}
                        >
                          {/* Employee Cell */}
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar 
                                sx={{ 
                                  width: isTablet ? 32 : 40, 
                                  height: isTablet ? 32 : 40,
                                  bgcolor: theme.palette.primary.main,
                                  color: '#fff'
                                }}
                              >
                                {record.employeeName?.charAt(0) || 'U'}
                              </Avatar>
                              <Box>
                                <Typography sx={{ fontWeight: 'bold' }}>
                                  {record.employeeName || 'Unknown'}
                                </Typography>
                                {!isTablet && (
                                  <Typography variant="caption" color="text.secondary">
                                    {record.employeePosition || '-'}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>

                          {/* Department Cell (tablet only) */}
                          {isTablet && (
                            <TableCell>
                              <Typography variant="body2">
                                {record.department || '-'}
                              </Typography>
                            </TableCell>
                          )}

                          {/* Position Cell (desktop only) */}
                          {!isMobile && !isTablet && (
                            <TableCell>
                              <Typography variant="body2">
                                {record.employeePosition || '-'}
                              </Typography>
                            </TableCell>
                          )}

                          {/* Department Cell (desktop only) */}
                          {!isMobile && !isTablet && (
                            <TableCell>
                              <Typography variant="body2">
                                {record.department || '-'}
                              </Typography>
                            </TableCell>
                          )}

                          {/* Period Cell */}
                          <TableCell>
                            <Typography variant="body2">
                              {format(new Date(record.year, record.month - 1, 1), 'MMM yyyy')}
                            </Typography>
                          </TableCell>

                          {/* Basic Salary Cell (desktop only) */}
                          {!isMobile && !isTablet && (
                            <TableCell>
                              <Typography variant="body2">
                                ${record.basicSalary?.toFixed(2) || '0.00'}
                              </Typography>
                            </TableCell>
                          )}

                          {/* Allowances Cell (desktop only) */}
                          {!isMobile && !isTablet && (
                            <TableCell>
                              <Typography variant="body2">
                                ${record.allowances?.toFixed(2) || '0.00'}
                              </Typography>
                            </TableCell>
                          )}

                          {/* Deductions Cell (desktop only) */}
                          {!isMobile && !isTablet && (
                            <TableCell>
                              <Typography variant="body2">
                                ${record.deductions?.toFixed(2) || '0.00'}
                              </Typography>
                            </TableCell>
                          )}

                          {/* Bonuses Cell (desktop only) */}
                          {!isMobile && !isTablet && (
                            <TableCell>
                              <Typography variant="body2">
                                ${record.bonuses?.toFixed(2) || '0.00'}
                              </Typography>
                            </TableCell>
                          )}

                          {/* Net Salary Cell */}
                          <TableCell>
                            <Typography sx={{ fontWeight: 'bold' }}>
                              ${record.netSalary?.toLocaleString('en-US', { 
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2 
                              }) || '0.00'}
                            </Typography>
                          </TableCell>

                          {/* Status Cell (tablet and desktop) */}
                          {!isMobile && (
                            <TableCell>
                              <Chip
                                label={record.status?.toUpperCase() || 'UNKNOWN'}
                                color={
                                  record.status === 'paid' ? 'success' :
                                  record.status === 'pending' ? 'warning' : 'error'
                                }
                                size="small"
                                sx={{ 
                                  fontWeight: 'bold',
                                  minWidth: 80
                                }}
                              />
                            </TableCell>
                          )}

                          {/* Actions Cell */}
                          <TableCell align="center">
                            <Box sx={{ 
                              display: 'flex', 
                              gap: 1,
                              justifyContent: 'center'
                            }}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewRecord(record)}
                                  color="info"
                                  sx={{ 
                                    bgcolor: theme.palette.info.light,
                                    '&:hover': { bgcolor: theme.palette.info.main, color: '#fff' }
                                  }}
                                >
                                  <Info fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditRecord(record)}
                                  color="primary"
                                  sx={{ 
                                    bgcolor: theme.palette.primary.light,
                                    '&:hover': { bgcolor: theme.palette.primary.main, color: '#fff' }
                                  }}
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
                                    sx={{ 
                                      bgcolor: theme.palette.success.light,
                                      '&:hover': { bgcolor: theme.palette.success.main, color: '#fff' }
                                    }}
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
                        <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 3 }}>
                          <Typography variant="body1" color="text.secondary">
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
                sx={{ mt: 1 }}
              />
            </>
          )}
        </>
      )}

      {/* Add Salary Dialog */}
      <Dialog
        open={openSalaryDialog}
        onClose={resetSalaryForm}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2 } }}
      >
        <DialogTitle sx={{ 
          py: 1, 
          bgcolor: theme.palette.primary.main, 
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <AttachMoney fontSize="small" />
          <Typography variant="h6">Add Salary</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: isMobile ? 1 : 3, py: 2 }}>
          {selectedEmployees.length > 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Adding salaries for {selectedEmployees.length} selected employees
            </Alert>
          ) : (
            <Autocomplete
              options={employees}
              getOptionLabel={(option) => `${option.name} (${option.position})`}
              onChange={(_, value) => {
                if (value) {
                  setSelectedEmployee(value._id);
                  setSelectedEmployeeDetails(value);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Employee"
                  margin="normal"
                  fullWidth
                  size="small"
                />
              )}
              sx={{ mb: 1 }}
            />
          )}

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Month"
                type="number"
                value={salaryForm.month}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  month: Math.min(12, Math.max(1, parseInt(e.target.value) || 1))
                })}
                inputProps={{ min: 1, max: 12 }}
                fullWidth
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Year"
                type="number"
                value={salaryForm.year}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  year: parseInt(e.target.value) || new Date().getFullYear()
                })}
                fullWidth
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Allowances"
                type="number"
                value={salaryForm.allowances}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  allowances: parseFloat(e.target.value) || 0
                })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                fullWidth
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Deductions"
                type="number"
                value={salaryForm.deductions}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  deductions: parseFloat(e.target.value) || 0
                })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                fullWidth
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Bonuses"
                type="number"
                value={salaryForm.bonuses}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  bonuses: parseFloat(e.target.value) || 0
                })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                fullWidth
                margin="normal"
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 1 : 3, py: 1 }}>
          <Button 
            onClick={resetSalaryForm} 
            color="inherit"
            sx={{ borderRadius: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSalarySubmit}
            variant="contained"
            color="primary"
            disabled={!selectedEmployee && selectedEmployees.length === 0}
            sx={{ borderRadius: 1 }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department Salary Dialog */}
      <Dialog
        open={openDepartmentDialog}
        onClose={resetDepartmentForm}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2 } }}
      >
        <DialogTitle sx={{ 
          py: 1, 
          bgcolor: theme.palette.secondary.main, 
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Group fontSize="small" />
          <Typography variant="h6">Department Salaries</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: isMobile ? 1 : 3, py: 2 }}>
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Department</InputLabel>
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value as string)}
              label="Department"
            >
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={6}>
              <TextField
                label="Month"
                type="number"
                value={salaryForm.month}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  month: Math.min(12, Math.max(1, parseInt(e.target.value) || 1))
                })}
                inputProps={{ min: 1, max: 12 }}
                fullWidth
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Year"
                type="number"
                value={salaryForm.year}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  year: parseInt(e.target.value) || new Date().getFullYear()
                })}
                fullWidth
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Allowances"
                type="number"
                value={salaryForm.allowances}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  allowances: parseFloat(e.target.value) || 0
                })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                fullWidth
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Deductions"
                type="number"
                value={salaryForm.deductions}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  deductions: parseFloat(e.target.value) || 0
                })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                fullWidth
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Bonuses"
                type="number"
                value={salaryForm.bonuses}
                onChange={(e) => setSalaryForm({
                  ...salaryForm,
                  bonuses: parseFloat(e.target.value) || 0
                })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                fullWidth
                margin="normal"
                size="small"
              />
            </Grid>
          </Grid>

          {selectedDepartment && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<Paid fontSize="small" />}
                onClick={handleMarkDepartmentPaid}
                fullWidth
                sx={{ borderRadius: 1 }}
              >
                Mark Department as Paid
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add fontSize="small" />}
                onClick={handleDepartmentSalarySubmit}
                fullWidth
                sx={{ borderRadius: 1 }}
              >
                Create Department Salaries
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 1 : 3, py: 1 }}>
          <Button 
            onClick={resetDepartmentForm} 
            color="inherit"
            sx={{ borderRadius: 1 }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Salary Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={resetEditForm}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2 } }}
      >
        <DialogTitle sx={{ 
          py: 1, 
          bgcolor: theme.palette.primary.main, 
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Edit fontSize="small" />
          <Typography variant="h6">Edit Salary</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: isMobile ? 1 : 3, py: 2 }}>
          {selectedRecord && (
            <>
              <Box sx={{ 
                mb: 2, 
                p: 2, 
                border: '1px solid', 
                borderColor: 'divider', 
                borderRadius: 1,
                bgcolor: 'background.default'
              }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Info color="info" fontSize="small" /> Employee Details
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Name:</Typography>
                    <Typography>{selectedRecord.employeeName || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Department:</Typography>
                    <Typography>{selectedRecord.department || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Position:</Typography>
                    <Typography>{selectedRecord.employeePosition || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Status:</Typography>
                    <Chip
                      label={selectedRecord.status?.toUpperCase() || 'UNKNOWN'}
                      color={
                        selectedRecord.status === 'paid' ? 'success' :
                        selectedRecord.status === 'pending' ? 'warning' : 'error'
                      }
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Month"
                    type="number"
                    value={salaryForm.month}
                    onChange={(e) => setSalaryForm({
                      ...salaryForm,
                      month: Math.min(12, Math.max(1, parseInt(e.target.value) || 1))
                    })}
                    inputProps={{ min: 1, max: 12 }}
                    fullWidth
                    margin="normal"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Year"
                    type="number"
                    value={salaryForm.year}
                    onChange={(e) => setSalaryForm({
                      ...salaryForm,
                      year: parseInt(e.target.value) || new Date().getFullYear()
                    })}
                    fullWidth
                    margin="normal"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Allowances"
                    type="number"
                    value={salaryForm.allowances}
                    onChange={(e) => setSalaryForm({
                      ...salaryForm,
                      allowances: parseFloat(e.target.value) || 0
                    })}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    fullWidth
                    margin="normal"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Deductions"
                    type="number"
                    value={salaryForm.deductions}
                    onChange={(e) => setSalaryForm({
                      ...salaryForm,
                      deductions: parseFloat(e.target.value) || 0
                    })}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    fullWidth
                    margin="normal"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Bonuses"
                    type="number"
                    value={salaryForm.bonuses}
                    onChange={(e) => setSalaryForm({
                      ...salaryForm,
                      bonuses: parseFloat(e.target.value) || 0
                    })}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    fullWidth
                    margin="normal"
                    size="small"
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 1 : 3, py: 1 }}>
          <Button 
            onClick={resetEditForm} 
            color="inherit"
            sx={{ borderRadius: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            color="primary"
            disabled={!selectedRecord}
            sx={{ borderRadius: 1 }}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Salary Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2 } }}
      >
        <DialogTitle sx={{ 
          py: 1, 
          bgcolor: theme.palette.info.main, 
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Info fontSize="small" />
          <Typography variant="h6">Salary Details</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: isMobile ? 1 : 3, py: 2 }}>
          {selectedRecord && (
            <>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Avatar 
                    sx={{ 
                      width: 56, 
                      height: 56,
                      bgcolor: theme.palette.primary.main,
                      color: '#fff',
                      fontSize: '1.5rem'
                    }}
                  >
                    {selectedRecord.employeeName?.charAt(0) || 'U'}
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

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Period:</Typography>
                    <Typography>
                      {format(new Date(selectedRecord.year, selectedRecord.month - 1, 1), 'MMMM yyyy')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Status:</Typography>
                    <Chip
                      label={selectedRecord.status?.toUpperCase() || 'UNKNOWN'}
                      color={
                        selectedRecord.status === 'paid' ? 'success' :
                        selectedRecord.status === 'pending' ? 'warning' : 'error'
                      }
                      size="medium"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Salary Breakdown</Typography>
                <List dense sx={{ bgcolor: 'background.default', borderRadius: 1 }}>
                  <ListItem>
                    <ListItemText primary="Basic Salary" />
                    <Typography fontWeight="bold">
                      ${selectedRecord.basicSalary?.toFixed(2) || '0.00'}
                    </Typography>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Allowances" />
                    <Typography color="success.main">
                      + ${selectedRecord.allowances?.toFixed(2) || '0.00'}
                    </Typography>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Deductions" />
                    <Typography color="error.main">
                      - ${selectedRecord.deductions?.toFixed(2) || '0.00'}
                    </Typography>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Bonuses" />
                    <Typography color="success.main">
                      + ${selectedRecord.bonuses?.toFixed(2) || '0.00'}
                    </Typography>
                  </ListItem>
                </List>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ 
                textAlign: 'center', 
                p: 2,
                bgcolor: 'primary.light',
                borderRadius: 1,
                color: 'primary.contrastText'
              }}>
                <Typography variant="caption">Net Salary</Typography>
                <Typography variant="h4" fontWeight="bold">
                  ${selectedRecord.netSalary?.toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  }) || '0.00'}
                </Typography>
              </Box>

              {selectedRecord.status === 'paid' && selectedRecord.paymentDate && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary">
                    Paid on: {format(new Date(selectedRecord.paymentDate), 'PPPp')}
                  </Typography>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 1 : 3, py: 1 }}>
          <Button 
            onClick={() => setOpenViewDialog(false)}
            sx={{ borderRadius: 1 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalaryRecordTab;