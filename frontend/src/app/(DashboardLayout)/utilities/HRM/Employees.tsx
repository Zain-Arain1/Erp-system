"use client";
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  IconButton, Tooltip, Chip, Pagination, InputAdornment,
  TableSortLabel, Grid, Stack, Menu, useTheme, useMediaQuery, Card, CardContent, Avatar, Badge
} from '@mui/material';
import { Autocomplete } from '@mui/material';
import {
  Add, Edit, Delete, Email, Phone, Search, CloudDownload, Info, Person, MoreVert
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { format, isValid } from 'date-fns';
import { Employee } from './HRMTypes';
import useDebounce from '@/app/hooks/useDebounce';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ConfirmDialog } from './ConfirmDialog';
import { useDepartments } from '@/app/hooks/useDepartments';
import { styled, alpha } from '@mui/material/styles';

const ROWS_PER_PAGE = 5;
const initialValidationErrors = {
  name: '',
  position: '',
  department: '',
  basicSalary: '',
  email: '',
  contact: ''
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/hrm` : '/api/hrm',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  fontSize: '0.875rem',
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    transition: 'background-color 0.3s ease',
  },
  '&:last-child td': {
    borderBottom: 0,
  },
}));

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'visible',
  '&:hover': {
    boxShadow: theme.shadows[6],
    transform: 'translateY(-4px)',
  },
}));

interface Filters {
  department?: string;
  status?: 'active' | 'inactive';
  [key: string]: any;
}

interface EmployeesTabProps {
  employees: Employee[];
  loading: boolean;
  fetchData: () => Promise<void>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  handleSort: (column: string) => void;
  selectedEmployees: string[];
  setSelectedEmployees: (ids: string[]) => void;
  page: number;
  setPage: (page: number) => void;
  filteredData: Employee[];
  rowsPerPage?: number;
  handleExport: (type: "employees" | "salaries" | "advances" | "attendances") => Promise<void>;
  onNotify: (message: string, severity: 'error' | 'warning' | 'info' | 'success') => void;
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
  onNotify
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
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
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState<null | HTMLElement>(null);

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
      setEmployeeForm(prev => ({
        ...prev,
        department: newDepartment
      }));
    } catch (error) {
      onNotify('Failed to add department', 'error');
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
      onNotify('Failed to check department usage', 'error');
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
      onNotify('Failed to delete department', 'error');
    } finally {
      setDepartmentOperation(null);
    }
  };

  // Validation
  const validateField = useCallback(async (field: keyof typeof validationErrors, value: any) => {
    let error = '';
    switch (field) {
      case 'name':
        error = value.trim() ? '' : 'Name is required';
        break;
      case 'position':
        error = value.trim() ? '' : 'Position is required';
        break;
      case 'department':
        error = departments.includes(value) ? '' : 'Valid department is required';
        break;
      case 'basicSalary':
        if (!value || value <= 0) {
          error = 'Salary must be a positive number';
        }
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
            error = 'Error validating contact number';
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
      name: employee.name || '',
      position: employee.position || '',
      department: employee.department || (departments.length > 0 ? departments[0] : ''),
      basicSalary: employee.basicSalary || 0,
      email: employee.email || undefined,
      contact: employee.contact || '',
      status: employee.status || 'active',
      joinDate: employee.joinDate
        ? (employee.joinDate instanceof Date
          ? employee.joinDate.toISOString()
          : employee.joinDate)
        : new Date().toISOString()
    });
    setEditingEmployeeId(employee._id);
  }, [departments]);

  // API operations
  const handleEmployeeSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true);
      const validationResults = await Promise.all([
        validateField('name', employeeForm.name),
        validateField('position', employeeForm.position),
        validateField('department', employeeForm.department),
        validateField('basicSalary', employeeForm.basicSalary),
        validateField('contact', employeeForm.contact),
        validateField('email', employeeForm.email)
      ]);

      if (validationResults.some(error => error)) {
        onNotify('Please fix all validation errors', 'error');
        return;
      }

      const payload = {
        name: employeeForm.name.trim(),
        position: employeeForm.position.trim(),
        department: employeeForm.department,
        basicSalary: Number(employeeForm.basicSalary),
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
      onNotify(error.response?.data?.message || 'Failed to save employee', 'error');
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
      onNotify('Failed to prepare employee deletion', 'error');
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
    } catch (error: any) {
      onNotify(error.response?.data?.message || 'Failed to deactivate employee', 'error');
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

  const handleMobileMenuClick = (event: React.MouseEvent<HTMLElement>, employee: Employee) => {
    setSelectedEmployee(employee);
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null);
    setSelectedEmployee(null);
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

  const handleInfoClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setInfoDialogOpen(true);
  };

  // Responsive table columns
  const mobileColumns = [
    { id: 'name', label: 'Employee', sortable: true },
    { id: 'department', label: 'Department', sortable: true },
    { id: 'basicSalary', label: 'Salary', sortable: true }
  ];

  const tabletColumns = [
    { id: 'name', label: 'Employee', sortable: true },
    { id: 'position', label: 'Position', sortable: true },
    { id: 'department', label: 'Department', sortable: true },
    { id: 'basicSalary', label: 'Salary', sortable: true }
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

  const columns = isMobile ? mobileColumns : isTablet ? tabletColumns : desktopColumns;

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
    hover: { scale: 1.02, transition: { duration: 0.2 } }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{
        p: { xs: 1, sm: 2, md: 3 },
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: theme.shadows[2]
      }}>
        {/* Header Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            mb: 2
          }}
        >
          <Typography
            variant={isMobile ? 'h6' : isTablet ? 'h5' : 'h4'}
            sx={{ fontWeight: 600, color: 'primary.main' }}
          >
            Employee Management
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outlined"
                startIcon={<CloudDownload />}
                onClick={handleExportClick}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  px: { xs: 1, sm: 2 },
                  py: 0.5,
                  minWidth: { xs: '100%', sm: 120 }
                }}
                aria-label="Export data"
              >
                Export
              </Button>
            </motion.div>
            <Menu
              anchorEl={exportAnchorEl}
              open={Boolean(exportAnchorEl)}
              onClose={handleExportClose}
              PaperProps={{
                sx: { borderRadius: 2, boxShadow: theme.shadows[4] }
              }}
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
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => { resetEmployeeForm(); setOpenEmployeeDialog(true); }}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  px: { xs: 1, sm: 2 },
                  py: 0.5,
                  minWidth: { xs: '100%', sm: 120 },
                  boxShadow: theme.shadows[2]
                }}
                aria-label="Add new employee"
              >
                Add Employee
              </Button>
            </motion.div>
          </Stack>
        </Box>

        {/* Stats and Search */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 3,
            alignItems: { xs: 'stretch', sm: 'center' }
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: 'wrap', mb: { xs: 1, sm: 0 } }}
          >
            <motion.div whileHover={{ scale: 1.05 }}>
              <Chip
                label={`Total: ${employeeStats.total}`}
                color="default"
                variant="outlined"
                size={isMobile ? 'small' : 'medium'}
                sx={{ borderRadius: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                aria-label="Total employees"
              />
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Chip
                label={`Active: ${employeeStats.active}`}
                color="success"
                variant="outlined"
                size={isMobile ? 'small' : 'medium'}
                sx={{ borderRadius: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                aria-label="Active employees"
              />
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Chip
                label={`Inactive: ${employeeStats.inactive}`}
                color="error"
                variant="outlined"
                size={isMobile ? 'small' : 'medium'}
                sx={{ borderRadius: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                aria-label="Inactive employees"
              />
            </motion.div>
          </Stack>
          <motion.div whileFocus={{ scale: 1.02 }}>
            <TextField
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize={isMobile ? 'small' : 'medium'} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: { xs: '100%', sm: '300px' },
                '& .MuiInputBase-root': {
                  borderRadius: 1,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  height: { xs: 36, sm: 40 },
                  bgcolor: alpha(theme.palette.background.paper, 0.9)
                }
              }}
              aria-label="Search employees"
            />
          </motion.div>
        </Box>

        {/* Employee List */}
        <AnimatePresence>
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight={200}
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CircularProgress size={isMobile ? 24 : 32} />
              <Typography
                variant="body2"
                sx={{ ml: 2, fontSize: { xs: '0.8rem', sm: '1rem' } }}
              >
                Loading...
              </Typography>
            </Box>
          ) : paginatedData.length === 0 ? (
            <Box
              textAlign="center"
              py={4}
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Typography
                variant={isMobile ? 'h6' : 'h5'}
                color="text.secondary"
                sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
              >
                No employees found
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                mt={1}
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                {searchTerm ? 'Try adjusting your search' : 'Add a new employee to get started'}
              </Typography>
              {!searchTerm && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => setOpenEmployeeDialog(true)}
                    sx={{ mt: 2, borderRadius: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                    aria-label="Add employee"
                  >
                    Add Employee
                  </Button>
                </motion.div>
              )}
            </Box>
          ) : isMobile ? (
            // Mobile: Enhanced Card-based layout with employee count
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <StyledCard sx={{ background: `linear-gradient(45deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})` }}>
                  <CardContent sx={{ p: 2, color: 'white' }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                      Total Employees: {employeeStats.total}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, opacity: 0.9 }}
                    >
                      Active: {employeeStats.active} | Inactive: {employeeStats.inactive}
                    </Typography>
                  </CardContent>
                </StyledCard>
              </motion.div>
              {paginatedData.map((employee, index) => (
                <motion.div
                  key={employee._id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileHover="hover"
                >
                  <StyledCard>
                    <Badge
                      badgeContent={index + 1 + (page - 1) * rowsPerPage}
                      color="primary"
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                      }}
                      sx={{
                        '& .MuiBadge-badge': {
                          left: 8,
                          top: 8,
                          fontSize: '0.7rem',
                          minWidth: 20,
                          height: 20,
                          borderRadius: '50%',
                          fontWeight: 'bold'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2.5, position: 'relative' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Avatar sx={{ 
                              width: 48, 
                              height: 48, 
                              bgcolor: employee.status === 'active' ? 'success.main' : 'error.main',
                              fontSize: '1.25rem'
                            }}>
                              {employee.name.charAt(0) || '?'}
                            </Avatar>
                            <Box>
                              <Typography fontWeight="bold" sx={{ fontSize: '0.95rem' }}>
                                {employee.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                {employee.position}
                              </Typography>
                            </Box>
                          </Box>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Chip
                              label={employee.status === 'active' ? 'Active' : 'Inactive'}
                              color={employee.status === 'active' ? 'success' : 'error'}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                fontSize: '0.7rem',
                                height: 20,
                                '& .MuiChip-label': { px: 1 }
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={(e) => handleMobileMenuClick(e, employee)}
                              aria-label={`More options for ${employee.name}`}
                            >
                              <MoreVert fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        <Grid container spacing={1.5}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Department
                            </Typography>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                              {employee.department}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} textAlign="right">
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Salary
                            </Typography>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                              ${employee.basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Contact
                            </Typography>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                              {employee.contact || 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} textAlign="right">
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Join Date
                            </Typography>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                              {employee.joinDate
                                ? format(new Date(employee.joinDate), 'MMM dd, yyyy')
                                : 'N/A'}
                            </Typography>
                          </Grid>
                        </Grid>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 1, 
                          mt: 2,
                          justifyContent: 'flex-end'
                        }}>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleInfoClick(employee)}
                              aria-label={`View details for ${employee.name}`}
                              sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                            >
                              <Info fontSize="small" color="primary" />
                            </IconButton>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <IconButton
                              size="small"
                              onClick={() => { setEmployeeFromData(employee); setOpenEmployeeDialog(true); }}
                              aria-label={`Edit employee ${employee.name}`}
                              sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                            >
                              <Edit fontSize="small" color="primary" />
                            </IconButton>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteEmployee(employee._id)}
                              aria-label={`Delete employee ${employee.name}`}
                              sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}
                            >
                              <Delete fontSize="small" color="error" />
                            </IconButton>
                          </motion.div>
                        </Box>
                      </CardContent>
                    </Badge>
                  </StyledCard>
                </motion.div>
              ))}
            </Box>
          ) : (
            // Tablet/Desktop: Table layout
            <Paper
              sx={{
                overflowX: 'auto',
                borderRadius: 1,
                boxShadow: theme.shadows[2],
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
              }}
            >
              <Table size={isTablet ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                    {columns.map((column) => (
                      <StyledTableCell key={column.id}>
                        {column.sortable ? (
                          <TableSortLabel
                            active={sortBy === column.id}
                            direction={sortBy === column.id ? sortDirection : 'asc'}
                            onClick={() => handleSort(column.id)}
                          >
                            <Typography variant="subtitle2" fontWeight={600}>
                              {column.label}
                            </Typography>
                          </TableSortLabel>
                        ) : (
                          <Typography variant="subtitle2" fontWeight={600}>
                            {column.label}
                          </Typography>
                        )}
                      </StyledTableCell>
                    ))}
                    <StyledTableCell align="right">
                      <Typography variant="subtitle2" fontWeight={600}>
                        Actions
                      </Typography>
                    </StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((employee) => (
                    <StyledTableRow key={employee._id} hover>
                      <StyledTableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: employee.status === 'active' ? 'success.main' : 'error.main'
                          }}>
                            <Person fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
                              {employee.name}
                            </Typography>
                            {!isMobile && !isTablet && employee.email && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="flex"
                                alignItems="center"
                              >
                                <Email fontSize="inherit" sx={{ mr: 0.5 }} />
                                {employee.email}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Typography sx={{ fontSize: '0.875rem' }}>
                          {employee.position}
                        </Typography>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Chip
                          label={employee.department}
                          variant="outlined"
                          size="small"
                          sx={{ borderRadius: 1, fontSize: '0.75rem' }}
                        />
                      </StyledTableCell>
                      {!isMobile && !isTablet && (
                        <>
                          <StyledTableCell>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Phone fontSize="small" color="action" />
                              <Typography sx={{ fontSize: '0.875rem' }}>
                                {employee.contact || 'N/A'}
                              </Typography>
                            </Box>
                          </StyledTableCell>
                          <StyledTableCell>
                            <Typography sx={{ fontSize: '0.875rem' }}>
                              ${employee.basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Typography>
                          </StyledTableCell>
                          <StyledTableCell>
                            <Typography sx={{ fontSize: '0.875rem' }}>
                              {employee.joinDate
                                ? format(new Date(employee.joinDate), 'MMM dd, yyyy')
                                : 'N/A'}
                            </Typography>
                          </StyledTableCell>
                          <StyledTableCell>
                            <Chip
                              label={employee.status === 'active' ? 'Active' : 'Inactive'}
                              color={employee.status === 'active' ? 'success' : 'error'}
                              size="small"
                              variant="outlined"
                              sx={{ borderRadius: 1, fontSize: '0.75rem' }}
                            />
                          </StyledTableCell>
                        </>
                      )}
                      {isTablet && (
                        <StyledTableCell>
                          <Typography sx={{ fontSize: '0.875rem' }}>
                            ${employee.basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Typography>
                        </StyledTableCell>
                      )}
                      <StyledTableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="View Details">
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <IconButton
                                onClick={() => handleInfoClick(employee)}
                                size={isTablet ? 'small' : 'medium'}
                                aria-label={`View details for ${employee.name}`}
                                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                              >
                                <Info fontSize={isTablet ? 'small' : 'medium'} color="primary" />
                              </IconButton>
                            </motion.div>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <IconButton
                                onClick={() => { setEmployeeFromData(employee); setOpenEmployeeDialog(true); }}
                                size={isTablet ? 'small' : 'medium'}
                                aria-label={`Edit employee ${employee.name}`}
                                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                              >
                                <Edit fontSize={isTablet ? 'small' : 'medium'} color="primary" />
                              </IconButton>
                            </motion.div>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <IconButton
                                onClick={() => handleDeleteEmployee(employee._id)}
                                size={isTablet ? 'small' : 'medium'}
                                aria-label={`Delete employee ${employee.name}`}
                                sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}
                              >
                                <Delete fontSize={isTablet ? 'small' : 'medium'} color="error" />
                              </IconButton>
                            </motion.div>
                          </Tooltip>
                        </Stack>
                      </StyledTableCell>
                    </StyledTableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {paginatedData.length > 0 && (
          <Box
            display="flex"
            justifyContent="center"
            mt={3}
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Pagination
              count={Math.ceil(filteredData.length / rowsPerPage)}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
              size={isMobile ? 'small' : 'medium'}
              sx={{
                '& .MuiPaginationItem-root': {
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  minWidth: { xs: 30, sm: 34 },
                  height: { xs: 30, sm: 34 }
                }
              }}
              aria-label="Pagination"
            />
          </Box>
        )}

        {/* Mobile Menu */}
        <Menu
          anchorEl={mobileMenuAnchorEl}
          open={Boolean(mobileMenuAnchorEl)}
          onClose={handleMobileMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem
            onClick={() => {
              if (selectedEmployee) handleInfoClick(selectedEmployee);
              handleMobileMenuClose();
            }}
            sx={{ fontSize: '0.875rem' }}
          >
            <Info fontSize="small" sx={{ mr: 1 }} /> View Details
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedEmployee) {
                setEmployeeFromData(selectedEmployee);
                setOpenEmployeeDialog(true);
              }
              handleMobileMenuClose();
            }}
            sx={{ fontSize: '0.875rem' }}
          >
            <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedEmployee) handleDeleteEmployee(selectedEmployee._id);
              handleMobileMenuClose();
            }}
            sx={{ fontSize: '0.875rem', color: theme.palette.error.main }}
          >
            <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>

        {/* Employee Dialog */}
        <Dialog
          open={openEmployeeDialog}
          onClose={() => setOpenEmployeeDialog(false)}
          fullScreen={isMobile}
          fullWidth
          maxWidth="sm"
          aria-labelledby="employee-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <DialogTitle
              id="employee-dialog-title"
              sx={{
                bgcolor: 'primary.main',
                color: 'common.white',
                py: { xs: 1.5, sm: 2 },
                px: 2
              }}
            >
              <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={600}>
                {editingEmployeeId ? 'Edit Employee' : 'Add Employee'}
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ py: { xs: 2, sm: 3 }, px: 2 }}>
              <Grid container spacing={isMobile ? 1.5 : 2}>
                <Grid item xs={12} sm={6}>
                  <motion.div whileFocus={{ scale: 1.02 }}>
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
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ '& .MuiInputBase-root': { borderRadius: 1 } }}
                      aria-label="Employee full name"
                    />
                  </motion.div>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <motion.div whileFocus={{ scale: 1.02 }}>
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
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ '& .MuiInputBase-root': { borderRadius: 1 } }}
                      aria-label="Employee position"
                    />
                  </motion.div>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={departments}
                    value={employeeForm.department || null}
                    onChange={(event, newValue) => {
                      setEmployeeForm({ ...employeeForm, department: newValue || '' });
                      validateField('department', newValue);
                    }}
                    renderInput={(params) => (
                      <motion.div whileFocus={{ scale: 1.02 }}>
                        <TextField
                          {...params}
                          label="Department"
                          required
                          error={!!validationErrors.department}
                          helperText={validationErrors.department}
                          size={isMobile ? 'small' : 'medium'}
                          sx={{ '& .MuiInputBase-root': { borderRadius: 1 } }}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {params.InputProps.endAdornment}
                                <IconButton
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); setDepartmentDialogOpen(true); }}
                                  aria-label="Add new department"
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                              </>
                            ),
                          }}
                        />
                      </motion.div>
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option}>
                        <Box display="flex" justifyContent="space-between" width="100%">
                          <Typography sx={{ fontSize: '0.875rem' }}>{option}</Typography>
                          {!['HR', 'Finance'].includes(option) && (
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); handleDeleteDepartment(option); }}
                              aria-label={`Delete department ${option}`}
                            >
                              <Delete fontSize="small" color="error" />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    )}
                    sx={{ '& .MuiAutocomplete-inputRoot': { borderRadius: 1 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <TextField
                      fullWidth
                      label="Basic Salary"
                      type="number"
                      value={employeeForm.basicSalary}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setEmployeeForm({ ...employeeForm, basicSalary: value });
                        validateField('basicSalary', value);
                      }}
                      required
                      error={!!validationErrors.basicSalary}
                      helperText={validationErrors.basicSalary}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ '& .MuiInputBase-root': { borderRadius: 1 } }}
                      aria-label="Employee salary"
                    />
                  </motion.div>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <motion.div whileFocus={{ scale: 1.02 }}>
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
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ '& .MuiInputBase-root': { borderRadius: 1 } }}
                      aria-label="Employee email"
                    />
                  </motion.div>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <motion.div whileFocus={{ scale: 1.02 }}>
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
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ '& .MuiInputBase-root': { borderRadius: 1 } }}
                      aria-label="Employee phone"
                    />
                  </motion.div>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <DatePicker
                      label="Join Date"
                      value={employeeForm.joinDate ? new Date(employeeForm.joinDate) : null}
                      onChange={(date) => {
                        if (date && isValid(date)) {
                          setEmployeeForm({ ...employeeForm, joinDate: date.toISOString() });
                        }
                      }}
                      slotProps={{
                        textField: {
                          size: isMobile ? 'small' : 'medium',
                          fullWidth: true,
                          sx: { '& .MuiInputBase-root': { borderRadius: 1 } }
                        }
                      }}
                    />
                  </motion.div>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                    <InputLabel id="status-label">Status</InputLabel>
                    <motion.div whileFocus={{ scale: 1.02 }}>
                      <Select
                        labelId="status-label"
                        value={employeeForm.status}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value as 'active' | 'inactive' })}
                        label="Status"
                        sx={{ borderRadius: 1 }}
                        aria-label="Employee status"
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </Select>
                    </motion.div>
                  </FormControl>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'background.default' }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => setOpenEmployeeDialog(false)}
                  variant="outlined"
                  sx={{ borderRadius: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' }, px: 2, py: 0.5 }}
                  aria-label="Cancel employee form"
                >
                  Cancel
                </Button>
              </motion.div>
              {editingEmployeeId && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleResetForm}
                    variant="outlined"
                    color="secondary"
                    sx={{ borderRadius: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' }, px: 2, py: 0.5 }}
                    aria-label="Reset employee form"
                  >
                    Reset
                  </Button>
                </motion.div>
              )}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleEmployeeSubmit}
                  variant="contained"
                  disabled={
                    isSubmitting ||
                    !!validationErrors.name ||
                    !!validationErrors.position ||
                    !!validationErrors.department ||
                    !!validationErrors.basicSalary ||
                    !!validationErrors.contact ||
                    !!validationErrors.email
                  }
                  startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
                  sx={{ borderRadius: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' }, px: 2, py: 0.5 }}
                  aria-label={editingEmployeeId ? 'Update employee' : 'Add employee'}
                >
                  {editingEmployeeId ? 'Update' : 'Add'}
                </Button>
              </motion.div>
            </DialogActions>
          </motion.div>
        </Dialog>

        {/* Info Dialog */}
        <Dialog
          open={infoDialogOpen}
          onClose={() => setInfoDialogOpen(false)}
          fullScreen={isMobile}
          fullWidth
          maxWidth="xs"
          aria-labelledby="info-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <DialogTitle
              id="info-dialog-title"
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                py: { xs: 1.5, sm: 2 },
                px: 2
              }}
            >
              <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={600}>
                Employee Details
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ py: { xs: 2, sm: 3 }, px: 2 }}>
              {selectedEmployee && (
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: selectedEmployee.status === 'active' ? 'success.main' : 'error.main',
                        fontSize: '2rem'
                      }}
                    >
                      {selectedEmployee.name.charAt(0) || '?'}
                    </Avatar>
                  </Box>
                  <Typography variant="body2" fontWeight="600" color="text.secondary">Name:</Typography>
                  <Typography sx={{ fontSize: '0.875rem' }}>{selectedEmployee.name || 'N/A'}</Typography>
                  <Typography variant="body2" fontWeight="600" color="text.secondary">Position:</Typography>
                  <Typography sx={{ fontSize: '0.875rem' }}>{selectedEmployee.position || 'N/A'}</Typography>
                  <Typography variant="body2" fontWeight="600" color="text.secondary">Department:</Typography>
                  <Typography sx={{ fontSize: '0.875rem' }}>{selectedEmployee.department || 'N/A'}</Typography>
                  <Typography variant="body2" fontWeight="600" color="text.secondary">Salary:</Typography>
                  <Typography sx={{ fontSize: '0.875rem' }}>
                    ${selectedEmployee.basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="body2" fontWeight="600" color="text.secondary">Email:</Typography>
                  <Typography sx={{ fontSize: '0.875rem' }}>{selectedEmployee.email || 'N/A'}</Typography>
                  <Typography variant="body2" fontWeight="600" color="text.secondary">Contact:</Typography>
                  <Typography sx={{ fontSize: '0.875rem' }}>{selectedEmployee.contact || 'N/A'}</Typography>
                  <Typography variant="body2" fontWeight="600" color="text.secondary">Join Date:</Typography>
                  <Typography sx={{ fontSize: '0.875rem' }}>
                    {selectedEmployee.joinDate
                      ? format(new Date(selectedEmployee.joinDate), 'MMM dd, yyyy')
                      : 'N/A'}
                  </Typography>
                  <Typography variant="body2" fontWeight="600" color="text.secondary">Status:</Typography>
                  <Chip
                    label={selectedEmployee.status === 'active' ? 'Active' : 'Inactive'}
                    color={selectedEmployee.status === 'active' ? 'success' : 'error'}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 1, fontSize: '0.75rem' }}
                  />
                </Stack>
              )}
            </DialogContent>
            <DialogActions sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'background.default' }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  fullWidth={isMobile}
                  onClick={() => setInfoDialogOpen(false)}
                  variant="contained"
                  sx={{ borderRadius: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' }, px: 2, py: 0.5 }}
                  aria-label="Close employee details"
                >
                  Close
                </Button>
              </motion.div>
            </DialogActions>
          </motion.div>
        </Dialog>

        {/* Department Dialog */}
        <Dialog
          open={departmentDialogOpen}
          onClose={() => setDepartmentDialogOpen(false)}
          maxWidth="xs"
          fullWidth
          aria-labelledby="department-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <DialogTitle
              id="department-dialog-title"
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
            >
              Add Department
            </DialogTitle>
            <DialogContent>
              <motion.div whileFocus={{ scale: 1.02 }}>
                <TextField
                  autoFocus
                  fullWidth
                  margin="dense"
                  label="Department Name"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ '& .MuiInputBase-root': { borderRadius: 1 } }}
                  aria-label="New department name"
                />
              </motion.div>
            </DialogContent>
            <DialogActions sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'background.default' }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => setDepartmentDialogOpen(false)}
                  fullWidth={isMobile}
                  sx={{ borderRadius: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' }, px: 2, py: 0.5 }}
                  aria-label="Cancel department form"
                >
                  Cancel
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleAddDepartment}
                  fullWidth={isMobile}
                  variant="contained"
                  sx={{ borderRadius: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' }, px: 2, py: 0.5 }}
                  aria-label="Add department"
                >
                  Add
                </Button>
              </motion.div>
            </DialogActions>
          </motion.div>
        </Dialog>

        {/* Confirmation Dialogs */}
        <ConfirmDialog
          open={!!departmentOperation}
          onClose={() => setDepartmentOperation(null)}
          onConfirm={confirmDeleteDepartment}
          title="Confirm Delete Department"
          content={`Are you sure you want to delete the "${departmentOperation?.department}" department?`}
          confirmText="Delete"
          confirmColor="error"
          aria-label="Confirm department deletion"
        />
        <ConfirmDialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={confirmDeleteEmployee}
          title="Confirm Deactivate Employee"
          content="Are you sure you want to deactivate this employee? Their records will be preserved."
          confirmText="Deactivate"
          confirmColor="error"
          aria-label="Confirm employee deactivation"
        />
      </Box>
    </LocalizationProvider>
  );
};