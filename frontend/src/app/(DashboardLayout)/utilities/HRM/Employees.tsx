"use client";
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  IconButton, Tooltip, Chip, Avatar, Pagination, InputAdornment,
  TableSortLabel, Checkbox, Grid, Alert, Stack,
  Menu, useTheme, DialogContentText, useMediaQuery
} from '@mui/material';
import { Autocomplete } from '@mui/material';
import {
  Add, Edit, Delete, People, Email, Phone, Work,
  Search, CloudDownload, History, Cancel, CheckCircle, Undo
} from '@mui/icons-material';
import axios, { AxiosError } from 'axios';
import { format } from 'date-fns';
import { Employee } from './HRMTypes';
import useDebounce from '@/app/hooks/useDebounce';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ConfirmDialog } from './ConfirmDialog';
import { useDepartments } from '@/app/hooks/useDepartments';

const ROWS_PER_PAGE = 5; // Reduced for mobile
const initialValidationErrors = {
  name: '',
  position: '',
  department: '',
  basicSalary: '',
  email: '',
  contact: ''
};

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
  onNotify: (message: string, severity: 'error' | 'warning' | 'info' | 'success') => void;
  isMobile?: boolean;
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
  rowsPerPage = ROWS_PER_PAGE,
  handleExport,
  onNotify,
  isMobile = false
}) => {
  const theme = useTheme();
  const { departments, addDepartment, deleteDepartment } = useDepartments();
  
  // State management
  const [openEmployeeDialog, setOpenEmployeeDialog] = useState(false);
  const [employeeForm, setEmployeeForm] = useState<Omit<Employee, '_id' | 'avatar'>>({
    name: '',
    position: '',
    department: departments.length > 0 ? departments[0] : '',
    basicSalary: 0,
    email: undefined,
    contact: '',
    status: 'active',
    joinDate: new Date().toISOString()
  });
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState(initialValidationErrors);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  const [departmentOperation, setDepartmentOperation] = useState<{ type: 'delete'; department: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

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

  // Department management
  const handleAddDepartment = async () => {
    try {
      if (!newDepartment.trim()) {
        onNotify('Department name cannot be empty', 'error');
        return;
      }
      await addDepartment(newDepartment);
      onNotify('Department added successfully', 'success');
      setNewDepartment('');
      setDepartmentDialogOpen(false);
    } catch (error) {
      handleApiError(error, 'Failed to add department');
    }
  };

  const handleDeleteDepartment = async (dept: string) => {
    try {
      const employeesInDept = employees.filter(e => e.department === dept);
      if (employeesInDept.length > 0) {
        onNotify(
          `Cannot delete department with ${employeesInDept.length} employee(s). Reassign them first.`,
          'error'
        );
        return;
      }
      setDepartmentOperation({ type: 'delete', department: dept });
    } catch (error) {
      handleApiError(error, 'Failed to check department usage');
    }
  };

  const confirmDeleteDepartment = async () => {
    if (!departmentOperation) return;
    try {
      await deleteDepartment(departmentOperation.department);
      onNotify('Department deleted successfully', 'success');
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

  // Validation
  const validateField = useCallback(async (field: keyof typeof validationErrors, value: any) => {
    let error = '';
    switch (field) {
      case 'name': error = value ? '' : 'Name is required'; break;
      case 'position': error = value ? '' : 'Position is required'; break;
      case 'department': error = departments.includes(value) ? '' : 'Department is required'; break;
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
          }
        }
        break;
      default: break;
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
      basicSalary: 0,
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
    onNotify(message, 'error');
    return message;
  }, [onNotify]);

  const handleEmployeeSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true);
      const validationResults = await Promise.all([
        validateField('name', employeeForm.name),
        validateField('position', employeeForm.position),
        validateField('department', employeeForm.department),
        validateField('basicSalary', employeeForm.basicSalary),
        validateField('contact', employeeForm.contact)
      ]);

      if (validationResults.some(error => error)) {
        onNotify('Please fix all validation errors', 'error');
        return;
      }

      const payload = {
        name: employeeForm.name.trim(),
        position: employeeForm.position.trim(),
        department: employeeForm.department,
        basicSalary: employeeForm.basicSalary,
        contact: employeeForm.contact.replace(/\D/g, ''),
        status: employeeForm.status === 'active' ? 'active' : 'inactive',
        joinDate: new Date(employeeForm.joinDate).toISOString(),
        email: employeeForm.email || undefined
      };

      if (editingEmployeeId) {
        await api.put(`/employees/${editingEmployeeId}`, payload);
        onNotify('Employee updated successfully', 'success');
      } else {
        await api.post('/employees', payload);
        onNotify('Employee added successfully', 'success');
      }

      resetEmployeeForm();
      setOpenEmployeeDialog(false);
      await fetchData();
    } catch (error: any) {
      console.error('Error creating employee:', error);
      let errorMessage = 'Failed to save employee';
      if (error.response?.data?.errors) {
        const fieldErrors = error.response.data.errors;
        Object.keys(fieldErrors).forEach(field => {
          setValidationErrors(prev => ({
            ...prev,
            [field]: fieldErrors[field].message
          }));
        });
      }
      onNotify(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [employeeForm, editingEmployeeId, fetchData, validateField, onNotify, resetEmployeeForm]);

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const employee = employees.find(e => e._id === employeeId);
      if (!employee) {
        onNotify('Employee not found', 'error');
        return;
      }
      setEmployeeToDelete(employeeId);
      setDeleteConfirmOpen(true);
    } catch (error) {
      handleApiError(error, 'Failed to prepare employee deletion');
    }
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      const employee = employees.find(e => e._id === employeeToDelete);
      if (!employee) {
        onNotify('Employee not found', 'error');
        return;
      }
      await api.delete(`/employees/${employeeToDelete}`);
      onNotify(`Employee ${employee.name} deactivated successfully`, 'success');
      await fetchData();
    } catch (error) {
      handleApiError(error, 'Failed to deactivate employee');
    } finally {
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
    }
  };

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

  const handleSelectEmployee = (employeeId: string, isSelected: boolean) => {
    setSelectedEmployees(isSelected
      ? [...selectedEmployees, employeeId]
      : selectedEmployees.filter(id => id !== employeeId)
    );
  };

  const handleResetForm = () => {
    if (editingEmployeeId) {
      const employee = employees.find(e => e._id === editingEmployeeId);
      if (employee) setEmployeeFromData(employee);
    }
  };

  // Simplified mobile table columns
  const mobileColumns = [
    { id: 'name', label: 'Employee', sortable: true },
    { id: 'position', label: 'Position', sortable: true },
    { id: 'status', label: 'Status', sortable: false }
  ];

  const desktopColumns = [
    { id: 'name', label: 'Employee', sortable: true },
    { id: 'position', label: 'Position', sortable: true },
    { id: 'department', label: 'Department', sortable: true },
    { id: 'contact', label: 'Contact', sortable: false },
    { id: 'basicSalary', label: 'Salary', sortable: true },
    { id: 'joinDate', label: 'Join Date', sortable: true },
    { id: 'status', label: 'Status', sortable: false }
  ];

  const columns = isMobile ? mobileColumns : desktopColumns;

  return (
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      {/* Header Section */}
      <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2} mb={2}>
        <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
          Employees
        </Typography>
        <Box display="flex" gap={1} width={isMobile ? '100%' : 'auto'}>
          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={handleExportClick}
            size={isMobile ? "small" : "medium"}
            fullWidth={isMobile}
          >
            {isMobile ? 'Export' : 'Export Data'}
          </Button>
          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={handleExportClose}
          >
            <MenuItem onClick={async () => { await handleExport('employees'); handleExportClose(); }}>
              Export Employees
            </MenuItem>
            <MenuItem onClick={async () => { await handleExport('salaries'); handleExportClose(); }}>
              Export Salaries
            </MenuItem>
            <MenuItem onClick={async () => { await handleExport('advances'); handleExportClose(); }}>
              Export Advances
            </MenuItem>
            <MenuItem onClick={async () => { await handleExport('attendances'); handleExportClose(); }}>
              Export Attendances
            </MenuItem>
          </Menu>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { resetEmployeeForm(); setOpenEmployeeDialog(true); }}
            size={isMobile ? "small" : "medium"}
            fullWidth={isMobile}
          >
            {isMobile ? 'Add' : 'Add Employee'}
          </Button>
        </Box>
      </Box>

      {/* Stats and Search */}
      <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2} mb={2}>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip
            label={`Total: ${employeeStats.total}`}
            color="default"
            variant="outlined"
            icon={<People fontSize="small" />}
            size="small"
          />
          <Chip
            label={`Active: ${employeeStats.active}`}
            color="success"
            variant="outlined"
            icon={<CheckCircle fontSize="small" />}
            size="small"
          />
          <Chip
            label={`Inactive: ${employeeStats.inactive}`}
            color="error"
            variant="outlined"
            icon={<Cancel fontSize="small" />}
            size="small"
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
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          fullWidth={isMobile}
          sx={!isMobile ? { width: 300 } : {}}
        />
      </Box>

      {/* Employee Table */}
      <Paper sx={{ overflow: 'auto', mb: 2, borderRadius: 2 }}>
        <Table size={isMobile ? "small" : "medium"}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id}>
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">{column.label}</Typography>
                    </TableSortLabel>
                  ) : (
                    <Typography variant="subtitle2" fontWeight="bold">{column.label}</Typography>
                  )}
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography variant="subtitle2" fontWeight="bold">Actions</Typography>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" mt={1}>Loading employees...</Typography>
                </TableCell>
              </TableRow>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((employee) => (
                <TableRow key={employee._id} hover>
                  {/* Name Column */}
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar src={employee.avatar} sx={{ width: 32, height: 32 }}>
                        {employee.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography fontWeight="bold">{employee.name}</Typography>
                        {!isMobile && employee.email && (
                          <Typography variant="body2" color="text.secondary">
                            {employee.email}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Position Column */}
                  <TableCell>
                    {!isMobile ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Work fontSize="small" color="action" />
                        {employee.position}
                      </Box>
                    ) : (
                      <Typography noWrap>{employee.position}</Typography>
                    )}
                  </TableCell>

                  {/* Department Column (desktop only) */}
                  {!isMobile && (
                    <TableCell>
                      <Chip label={employee.department} variant="outlined" size="small" />
                    </TableCell>
                  )}

                  {/* Contact Column (desktop only) */}
                  {!isMobile && (
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Phone fontSize="small" color="action" />
                        {employee.contact || 'N/A'}
                      </Box>
                    </TableCell>
                  )}

                  {/* Salary Column (desktop only) */}
                  {!isMobile && (
                    <TableCell>
                      ${employee.basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                  )}

                  {/* Join Date Column (desktop only) */}
                  {!isMobile && (
                    <TableCell>
                      {employee.joinDate ? format(new Date(employee.joinDate), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                  )}

                  {/* Status Column */}
                  <TableCell>
                    <Chip
                      label={employee.status === 'active' ? 'Active' : 'Inactive'}
                      color={employee.status === 'active' ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Edit">
                        <IconButton
                          onClick={() => { setEmployeeFromData(employee); setOpenEmployeeDialog(true); }}
                          size="small"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          onClick={() => handleDeleteEmployee(employee._id)}
                          size="small"
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                  <Box textAlign="center">
                    <People sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="h6" color="text.secondary">
                      No employees found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {searchTerm ? 'Try adjusting your search' : 'Add a new employee to get started'}
                    </Typography>
                    {!searchTerm && (
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => setOpenEmployeeDialog(true)}
                        sx={{ mt: 2 }}
                        size="small"
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

      {/* Pagination */}
      <Box display="flex" justifyContent="center">
        <Pagination
          count={Math.ceil(filteredData.length / rowsPerPage)}
          page={page}
          onChange={(event, value) => setPage(value)}
          color="primary"
          size={isMobile ? "small" : "medium"}
        />
      </Box>

      {/* Employee Dialog */}
      <Dialog
        open={openEmployeeDialog}
        onClose={() => setOpenEmployeeDialog(false)}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{
          bgcolor: 'primary.main',
          color: 'common.white',
          py: 2
        }}>
          <Typography variant="h6" fontWeight="bold">
            {editingEmployeeId ? 'Edit Employee' : 'Add Employee'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
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
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={departments}
                value={employeeForm.department}
                onChange={(event, newValue) => {
                  setEmployeeForm({ ...employeeForm, department: newValue || departments[0] });
                  validateField('department', newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Department"
                    required
                    error={!!validationErrors.department}
                    helperText={validationErrors.department}
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {params.InputProps.endAdornment}
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); setDepartmentDialogOpen(true); }}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box display="flex" justifyContent="space-between" width="100%">
                      <Typography>{option}</Typography>
                      {!['HR', 'Finance'].includes(option) && (
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleDeleteDepartment(option); }}
                        >
                          <Delete fontSize="small" color="error" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Basic Salary"
                type="number"
                value={employeeForm.basicSalary}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setEmployeeForm({ ...employeeForm, basicSalary: value });
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={employeeForm.email || ''}
                onChange={(e) => {
                  const value = e.target.value || undefined;
                  setEmployeeForm({ ...employeeForm, email: value });
                  validateField('email', value);
                }}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={employeeForm.contact}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setEmployeeForm({ ...employeeForm, contact: value });
                  validateField('contact', value);
                }}
                required
                error={!!validationErrors.contact}
                helperText={validationErrors.contact}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Join Date"
                  value={new Date(employeeForm.joinDate)}
                  onChange={(date) => date && setEmployeeForm({ ...employeeForm, joinDate: date.toISOString() })}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={employeeForm.status}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value as 'active' | 'inactive' })}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEmployeeDialog(false)} variant="outlined">
            Cancel
          </Button>
          {editingEmployeeId && (
            <Button onClick={handleResetForm} variant="outlined" color="secondary">
              Reset
            </Button>
          )}
          <Button
            onClick={handleEmployeeSubmit}
            variant="contained"
            disabled={isSubmitting || !!validationErrors.name || !!validationErrors.position || 
                     !!validationErrors.department || !!validationErrors.contact}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {editingEmployeeId ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={departmentDialogOpen} onClose={() => setDepartmentDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Department</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Department Name"
            fullWidth
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepartmentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddDepartment} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={!!departmentOperation}
        onClose={() => setDepartmentOperation(null)}
        onConfirm={confirmDeleteDepartment}
        title="Delete Department"
        content={`Delete "${departmentOperation?.department}" department?`}
        confirmColor="error"
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteEmployee}
        title="Deactivate Employee"
        content="Deactivate this employee? Records will be preserved."
        confirmText="Deactivate"
        confirmColor="error"
      />
    </Box>
  );
};