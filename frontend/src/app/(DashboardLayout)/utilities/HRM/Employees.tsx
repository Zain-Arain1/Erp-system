"use client";
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  IconButton, Tooltip, Chip, Avatar, Pagination, InputAdornment,
  TableSortLabel, Checkbox, Grid, Alert, Stack,
  Menu, useTheme, DialogContentText
} from '@mui/material';
import { Autocomplete } from '@mui/material';
import {
  Add, Edit, Delete, People, Email, Phone, Work,
  Search, CloudDownload, History, Cancel, CheckCircle, Undo
} from '@mui/icons-material';
import { SnackbarProvider, useSnackbar } from 'notistack';
import axios, { AxiosError } from 'axios';
import { format } from 'date-fns';
import { Employee } from './HRMTypes';
import useDebounce from '@/app/hooks/useDebounce';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ConfirmDialog } from './ConfirmDialog';
import { useDepartments } from '@/app/hooks/useDepartments';

// Constants
const MIN_SALARY = 500;
const MAX_SALARY = 50000;
const ROWS_PER_PAGE = 10;
const initialValidationErrors = {
  name: '',
  position: '',
  department: '',
  basicSalary: '',
  email: '',
  contact: ''
};

// API Configuration
const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/hrm`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

interface EmployeesTabProps {
  employees: Employee[];
  loading: boolean;
  fetchData: () => Promise<void>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: any;
  setFilters: (filters: any) => void;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  handleSort: (column: string) => void;
  selectedEmployees: string[];
  setSelectedEmployees: (ids: string[]) => void;
  page: number;
  setPage: (page: number) => void;
  filteredData: Employee[];
  rowsPerPage: number;
  openHistoryDialog: boolean;
  setOpenHistoryDialog: (open: boolean) => void;
  setSelectedHistoryEmployee: (id: string) => void;
  handleExport: (type: "employees" | "salaries" | "advances" | "attendances") => Promise<void>;
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({
  employees,
  loading,
  fetchData,
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  sortBy,
  sortDirection,
  handleSort,
  selectedEmployees,
  setSelectedEmployees,
  page,
  setPage,
  filteredData,
  rowsPerPage = ROWS_PER_PAGE
}) => {
  const theme = useTheme();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { departments, addDepartment, deleteDepartment } = useDepartments();

  // State management
  const [openEmployeeDialog, setOpenEmployeeDialog] = useState(false);
const [employeeForm, setEmployeeForm] = useState<Omit<Employee, '_id' | 'avatar'>>({
  name: '',
  position: '',
  department: departments.length > 0 ? departments[0] : '',
  basicSalary: MIN_SALARY,
  email: undefined,
  contact: '',
  status: 'active',
  joinDate: new Date().toISOString()
});
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState(initialValidationErrors);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [deletedEmployees, setDeletedEmployees] = useState<Employee[]>([]);
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  const [departmentOperation, setDepartmentOperation] = useState<{ type: 'delete'; department: string } | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoized calculations
  const employeeStats = useMemo(() => ({
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
  }), [employees]);

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  // Department management functions
  const handleAddDepartment = async () => {
    try {
      if (!newDepartment.trim()) {
        enqueueSnackbar('Department name cannot be empty', { variant: 'error' });
        return;
      }

      await addDepartment(newDepartment);
      enqueueSnackbar('Department added successfully', { variant: 'success' });
      setNewDepartment('');
      setDepartmentDialogOpen(false);
    } catch (error) {
      handleApiError(error, 'Failed to add department');
    }
  };

  const handleDeleteDepartment = async (dept: string) => {
    try {
      // Check if any employees are in this department
      const employeesInDept = employees.filter(e => e.department === dept);
      if (employeesInDept.length > 0) {
        enqueueSnackbar(
          `Cannot delete department with ${employeesInDept.length} employee(s). Reassign them first.`,
          { variant: 'error' }
        );
        return;
      }

      setDepartmentOperation({
        type: 'delete',
        department: dept
      });
    } catch (error) {
      handleApiError(error, 'Failed to check department usage');
    }
  };

  const confirmDeleteDepartment = async () => {
    if (!departmentOperation) return;
    
    try {
      await deleteDepartment(departmentOperation.department);
      enqueueSnackbar('Department deleted successfully', { variant: 'success' });
      
      // Reset form if deleted department was selected
      if (employeeForm.department === departmentOperation.department) {
        setEmployeeForm({
          ...employeeForm,
          department: departments[0] || ''
        });
      }
    } catch (error) {
      handleApiError(error, 'Failed to delete department');
    } finally {
      setDepartmentOperation(null);
    }
  };

  // Validation functions
  const validateField = useCallback(async (field: keyof typeof validationErrors, value: any) => {
    let error = '';

    switch (field) {
      case 'name':
        error = value ? '' : 'Name is required';
        break;
      case 'position':
        error = value ? '' : 'Position is required';
        break;
      case 'department':
        error = departments.includes(value) ? '' : 'Department is required';
        break;
      case 'basicSalary':
        if (value < MIN_SALARY) error = `Salary must be at least $${MIN_SALARY}`;
        else if (value > MAX_SALARY) error = `Salary cannot exceed $${MAX_SALARY}`;
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Invalid email format';
        }
        break;
      case 'contact':
        if (!value) {
          error = 'Contact number is required';
        } else if (!/^[0-9]{10,15}$/.test(value)) {
          error = 'Must be 10-15 digits';
        } else {
          try {
            const res = await api.get(`/employees/check-contact?contact=${value}`);
            if (res.data.exists && (!editingEmployeeId || res.data.employeeId !== editingEmployeeId)) {
              error = 'Contact number already exists';
            }
          } catch (err) {
            console.error('Contact validation error:', err);
            // Don't block submission if validation fails
          }
        }
        break;
      default:
        break;
    }

    setValidationErrors(prev => ({ ...prev, [field]: error }));
    return error;
  }, [editingEmployeeId, departments]);

  // Form handling
  const resetEmployeeForm = useCallback(() => {
  setEmployeeForm({
    name: '',
    position: '',
    department: departments.length > 0 ? departments[0] : '',
    basicSalary: MIN_SALARY,
    email: undefined,
    contact: '',
    status: 'active',
    joinDate: new Date().toISOString()
  });
  setValidationErrors(initialValidationErrors);
  setEditingEmployeeId(null);
}, [departments]);

  const setEmployeeFromData = useCallback((employee: Employee) => {
    setEmployeeForm({
      name: employee.name,
      position: employee.position,
      department: employee.department,
      basicSalary: employee.basicSalary,
      email: employee.email || undefined,
      contact: employee.contact,
      status: employee.status,
      joinDate: employee.joinDate instanceof Date
        ? employee.joinDate.toISOString()
        : employee.joinDate
    });
    setEditingEmployeeId(employee._id);
  }, []);

  // API operations
  const handleApiError = useCallback((error: unknown, defaultMessage: string) => {
    let message = defaultMessage;

    if (axios.isAxiosError(error)) {
      message = error.response?.data?.message ||
        error.response?.data?.error?.message ||
        message;
      console.error('API Error:', error.response?.data);
    } else if (error instanceof Error) {
      message = error.message;
    }

    enqueueSnackbar(message, { variant: 'error' });
    return message;
  }, [enqueueSnackbar]);

  const handleEmployeeSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      const validationResults = await Promise.all([
        validateField('name', employeeForm.name),
        validateField('position', employeeForm.position),
        validateField('department', employeeForm.department),
        validateField('basicSalary', employeeForm.basicSalary),
        validateField('contact', employeeForm.contact)
      ]);

      if (validationResults.some(error => error)) {
        enqueueSnackbar('Please fix all validation errors', {
          variant: 'error',
          autoHideDuration: 3000
        });
        return;
      }

      const payload = {
        name: employeeForm.name.trim(),
        position: employeeForm.position.trim(),
        department: employeeForm.department,
        basicSalary: employeeForm.basicSalary,
        contact: employeeForm.contact.replace(/\D/g, ''), // Remove non-digit characters
        status: employeeForm.status === 'active' ? 'active' : 'inactive',
        joinDate: new Date(employeeForm.joinDate).toISOString(),
        email: employeeForm.email || undefined
      };

      if (editingEmployeeId) {
        await api.put(`/employees/${editingEmployeeId}`, payload);
        enqueueSnackbar('Employee updated successfully', {
          variant: 'success',
          autoHideDuration: 3000
        });
      } else {
        const response = await api.post('/employees', payload);
        console.log('Creation response:', response.data);
        enqueueSnackbar('Employee added successfully', {
          variant: 'success',
          autoHideDuration: 3000
        });
      }

      resetEmployeeForm();
      setOpenEmployeeDialog(false);
      await fetchData();
    } catch (error: any) {
      console.error('Error creating employee:', error);

      let errorMessage = 'Failed to save employee';
      if (error.response) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
        if (error.response.data.errors) {
          const fieldErrors = error.response.data.errors;
          Object.keys(fieldErrors).forEach(field => {
            setValidationErrors(prev => ({
              ...prev,
              [field]: fieldErrors[field].message
            }));
          });
        }
      }

      enqueueSnackbar(errorMessage, {
        variant: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [employeeForm, editingEmployeeId, fetchData, validateField, enqueueSnackbar, resetEmployeeForm]);

  const handleDeactivateEmployee = useCallback(async (employeeId: string) => {
    try {
      const employee = employees.find(e => e._id === employeeId);
      if (!employee) return;

      await api.delete(`/employees/${employeeId}`);
      setDeletedEmployees(prev => [...prev, employee]);

      enqueueSnackbar(`Employee ${employee.name} deactivated`, {
        variant: 'success',
        action: (key) => (
          <Button
            color="inherit"
            onClick={() => {
              undoDelete(employeeId);
              closeSnackbar(key);
            }}
            startIcon={<Undo />}
          >
            Undo
          </Button>
        )
      });

      await fetchData();
    } catch (error) {
      handleApiError(error, 'Failed to deactivate employee');
    }
  }, [employees, fetchData, handleApiError, enqueueSnackbar, closeSnackbar]);

  const undoDelete = useCallback(async (employeeId: string) => {
    try {
      const employee = deletedEmployees.find(e => e._id === employeeId);
      if (!employee) return;

      await api.post('/employees/restore', { employeeId });
      setDeletedEmployees(prev => prev.filter(e => e._id !== employeeId));
      enqueueSnackbar('Employee restored successfully', { variant: 'success' });
      await fetchData();
    } catch (error) {
      handleApiError(error, 'Failed to restore employee');
    }
  }, [deletedEmployees, fetchData, handleApiError, enqueueSnackbar]);

  const handleExport = useCallback(async (type: 'employees' | 'salaries' | 'advances' | 'attendances') => {
    try {
      setExportProgress(0);
      const key = enqueueSnackbar(`Preparing ${type} export...`, {
        variant: 'info',
        persist: true
      });

      const response = await api.get(`/employees/export?type=${type}`, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setExportProgress(percent);
        }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      closeSnackbar(key);
      enqueueSnackbar(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`, {
        variant: 'success',
        autoHideDuration: 3000
      });
    } catch (error) {
      closeSnackbar();
      handleApiError(error, `Failed to export ${type}`);
    } finally {
      setExportProgress(0);
    }
  }, [enqueueSnackbar, closeSnackbar, handleApiError]);

  // Effects
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setSearchTerm(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, searchTerm, setSearchTerm]);

  // Event handlers
  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedEmployees(event.target.checked
      ? paginatedData.map(emp => emp._id)
      : []);
  };

  const handleSelectEmployee = (employeeId: string, isSelected: boolean) => {
    setSelectedEmployees(isSelected
      ? [...selectedEmployees, employeeId]
      : selectedEmployees.filter(id => id !== employeeId)
    );
  };

  const handleResetForm = () => {
    if (editingEmployeeId) {
      const employee = employees.find(e => e._id === editingEmployeeId);
      if (employee) {
        setEmployeeFromData(employee);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h5" component="h2" fontWeight="bold">
          Employee Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={handleExportClick}
            sx={{ minWidth: '120px' }}
            aria-label="Export data"
          >
            Export Data
          </Button>
          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={handleExportClose}
          >
            <MenuItem onClick={() => handleExport('employees')}>Export Employees</MenuItem>
            <MenuItem onClick={() => handleExport('salaries')}>Export Salaries</MenuItem>
            <MenuItem onClick={() => handleExport('advances')}>Export Advances</MenuItem>
            <MenuItem onClick={() => handleExport('attendances')}>Export Attendances</MenuItem>
          </Menu>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetEmployeeForm();
              setOpenEmployeeDialog(true);
            }}
            sx={{ minWidth: '160px' }}
            aria-label="Add employee"
          >
            Add Employee
          </Button>
        </Box>
      </Box>

      {/* Stats and Filters Section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" gap={2}>
          <Chip
            label={`Total: ${employeeStats.total}`}
            color="default"
            variant="outlined"
            icon={<People fontSize="small" />}
          />
          <Chip
            label={`Active: ${employeeStats.active}`}
            color="success"
            variant="outlined"
            icon={<CheckCircle fontSize="small" />}
          />
          <Chip
            label={`Inactive: ${employeeStats.inactive}`}
            color="error"
            variant="outlined"
            icon={<Cancel fontSize="small" />}
          />
        </Box>

        <TextField
          variant="outlined"
          size="small"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 300 } }}
          aria-label="Search employees"
        />
      </Box>

      {/* Employee Table */}
      <Paper sx={{
        overflow: 'auto',
        mb: 3,
        borderRadius: 2,
        boxShadow: 3,
        [theme.breakpoints.down('sm')]: {
          boxShadow: 1
        }
      }}>
        <Table>
          <TableHead sx={{ backgroundColor: 'background.paper' }}>
            <TableRow>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">#</Typography>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'name'}
                  direction={sortBy === 'name' ? sortDirection : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  <Typography variant="subtitle1" fontWeight="bold">Employee</Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'position'}
                  direction={sortBy === 'position' ? sortDirection : 'asc'}
                  onClick={() => handleSort('position')}
                >
                  <Typography variant="subtitle2" fontWeight="bold">Position</Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'department'}
                  direction={sortBy === 'department' ? sortDirection : 'asc'}
                  onClick={() => handleSort('department')}
                >
                  <Typography variant="subtitle2" fontWeight="bold">Department</Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">Contact</Typography>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'basicSalary'}
                  direction={sortBy === 'basicSalary' ? sortDirection : 'asc'}
                  onClick={() => handleSort('basicSalary')}
                >
                  <Typography variant="subtitle2" fontWeight="bold">Salary</Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'joinDate'}
                  direction={sortBy === 'joinDate' ? sortDirection : 'desc'}
                  onClick={() => handleSort('joinDate')}
                >
                  <Typography variant="subtitle2" fontWeight="bold">Join Date</Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2" fontWeight="bold">Actions</Typography>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" mt={2}>Loading employees...</Typography>
                </TableCell>
              </TableRow>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((employee, index) => (
                <TableRow key={employee._id} hover>
                  <TableCell>
                    <Typography>{(page - 1) * rowsPerPage + index + 1}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar src={employee.avatar} sx={{ width: 40, height: 40 }}>
                        {employee.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography fontWeight="bold">{employee.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {employee.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Work fontSize="small" color="action" />
                      {employee.position}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={employee.department}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Phone fontSize="small" color="action" />
                      {employee.contact || 'N/A'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      ${employee.basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {employee.joinDate ? format(new Date(employee.joinDate), 'MMM dd, yyyy') : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={employee.status === 'active' ? 'Active' : 'Inactive'}
                      color={employee.status === 'active' ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Edit employee">
                        <IconButton
                          onClick={() => {
                            setEmployeeFromData(employee);
                            setOpenEmployeeDialog(true);
                          }}
                          color="primary"
                          size="small"
                          aria-label={`Edit ${employee.name}`}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={employee.status === 'active' ? 'Deactivate employee' : 'Activate employee'}>
                        <IconButton
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to ${employee.status === 'active' ? 'deactivate' : 'activate'} ${employee.name}?`)) {
                              handleDeactivateEmployee(employee._id);
                            }
                          }}
                          color={employee.status === 'active' ? 'error' : 'success'}
                          size="small"
                          aria-label={employee.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {employee.status === 'active' ? <Delete fontSize="small" /> : <CheckCircle fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Box textAlign="center">
                    <People sx={{ fontSize: 60, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="h6" color="text.secondary">
                      No employees found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {searchTerm ? 'Try adjusting your search query' : 'Add a new employee to get started'}
                    </Typography>
                    {!searchTerm && (
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => setOpenEmployeeDialog(true)}
                        sx={{ mt: 2 }}
                        aria-label="Add employee"
                      >
                        Add Employee
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Pagination and Selection Info */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {selectedEmployees.length > 0 ? (
            `${selectedEmployees.length} of ${filteredData.length} employee(s) selected`
          ) : (
            `Showing ${Math.min(filteredData.length, rowsPerPage)} of ${filteredData.length} employees`
          )}
        </Typography>
        <Pagination
          count={Math.ceil(filteredData.length / rowsPerPage)}
          page={page}
          onChange={(event, value) => setPage(value)}
          color="primary"
          shape="rounded"
          showFirstButton
          showLastButton
          sx={{ my: 2 }}
        />
      </Box>

      {/* Employee Dialog */}
      <Dialog
        open={openEmployeeDialog}
        onClose={() => setOpenEmployeeDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
        aria-labelledby="employee-dialog-title"
      >
        <DialogTitle sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 2,
          bgcolor: 'primary.main',
          color: 'common.white'
        }}>
          <Typography variant="h6" component="div" fontWeight="bold" id="employee-dialog-title">
            {editingEmployeeId ? 'Edit Employee Details' : 'Add New Employee'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={employeeForm.name}
                onChange={(e) => {
                  setEmployeeForm({ ...employeeForm, name: e.target.value });
                  validateField('name', e.target.value);
                }}
                required
                error={!!validationErrors.name}
                helperText={validationErrors.name}
                variant="outlined"
                size="small"
                inputProps={{ 'aria-label': 'Employee full name' }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Position"
                value={employeeForm.position}
                onChange={(e) => {
                  setEmployeeForm({ ...employeeForm, position: e.target.value });
                  validateField('position', e.target.value);
                }}
                required
                error={!!validationErrors.position}
                helperText={validationErrors.position}
                variant="outlined"
                size="small"
                inputProps={{ 'aria-label': 'Employee position' }}
              />
            </Grid>
            <Grid item xs={6}>
              <Autocomplete
                options={departments}
                value={employeeForm.department}
                onChange={(event, newValue) => {
                  setEmployeeForm({
                    ...employeeForm,
                    department: newValue || departments[0]
                  });
                  validateField('department', newValue);
                }}
                isOptionEqualToValue={(option, value) => option === value}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Department"
                    required
                    error={!!validationErrors.department}
                    helperText={validationErrors.department}
                    variant="outlined"
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {params.InputProps.endAdornment}
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewDepartment('');
                                setDepartmentDialogOpen(true);
                              }}
                              aria-label="Add department"
                            >
                              <Add fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  return (
                    <Box
                      component="li"
                      key={key}
                      {...rest}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <Typography>{option}</Typography>
                      {!['HR', 'Finance'].includes(option) && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDepartment(option);
                          }}
                          aria-label={`Delete ${option} department`}
                          sx={{ ml: 1 }}
                        >
                          <Delete fontSize="small" color="error" />
                        </IconButton>
                      )}
                    </Box>
                  );
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Basic Salary"
                type="number"
                value={employeeForm.basicSalary}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || MIN_SALARY;
                  setEmployeeForm({
                    ...employeeForm,
                    basicSalary: value
                  });
                  validateField('basicSalary', value);
                }}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: {
                    min: MIN_SALARY,
                    max: MAX_SALARY,
                    'aria-label': 'Employee basic salary'
                  }
                }}
                error={!!validationErrors.basicSalary}
                helperText={validationErrors.basicSalary}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={employeeForm.email || ''}
                onChange={(e) => {
                  const value = e.target.value || undefined;
                  setEmployeeForm({
                    ...employeeForm,
                    email: value
                  });
                  validateField('email', value);
                }}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
                variant="outlined"
                size="small"
                inputProps={{ 'aria-label': 'Employee email' }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={employeeForm.contact}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setEmployeeForm({ ...employeeForm, contact: value });
                  validateField('contact', value);
                }}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone fontSize="small" />
                    </InputAdornment>
                  ),
                  inputProps: {
                    maxLength: 15,
                    'aria-label': 'Employee phone number'
                  }
                }}
                error={!!validationErrors.contact}
                helperText={validationErrors.contact}
                variant="outlined"
                size="small"
              />
            </Grid>

            <Grid item xs={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Join Date"
                  value={new Date(employeeForm.joinDate)}
                  onChange={(date) => {
                    if (date) {
                      setEmployeeForm({
                        ...employeeForm,
                        joinDate: date.toISOString()
                      });
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      error: false
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={employeeForm.status}
                  onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    status: e.target.value as 'active' | 'inactive'
                  })}
                  label="Status"
                  required
                  variant="outlined"
                  inputProps={{ 'aria-label': 'Employee status' }}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 2,
          px: 3,
          justifyContent: 'space-between'
        }}>
          <Button
            onClick={() => setOpenEmployeeDialog(false)}
            variant="outlined"
            color="inherit"
            aria-label="Cancel employee edit"
          >
            Cancel
          </Button>
          <Stack direction="row" spacing={2}>
            {editingEmployeeId && (
              <Button
                onClick={handleResetForm}
                variant="outlined"
                color="secondary"
                aria-label="Reset employee form"
              >
                Reset
              </Button>
            )}
            <Button
              onClick={handleEmployeeSubmit}
              variant="contained"
              color="primary"
              disabled={
                !!validationErrors.name ||
                !!validationErrors.position ||
                !!validationErrors.department ||
                !!validationErrors.basicSalary ||
                !!validationErrors.contact ||
                isSubmitting
              }
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
              aria-label={editingEmployeeId ? 'Update employee' : 'Add employee'}
            >
              {editingEmployeeId ? 'Update Employee' : 'Add Employee'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Add Department Dialog */}
     <Dialog
        open={departmentDialogOpen}
        onClose={() => setDepartmentDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add New Department</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Department Name"
            fullWidth
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddDepartment()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepartmentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddDepartment} color="primary" variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department Delete Confirmation */}
      <ConfirmDialog
        open={!!departmentOperation}
        onClose={() => setDepartmentOperation(null)}
        onConfirm={confirmDeleteDepartment}
        title="Confirm Department Deletion"
        content={`Are you sure you want to delete the "${departmentOperation?.department}" department?`}
      />
    </Box>
  );
};

export default EmployeesTab;