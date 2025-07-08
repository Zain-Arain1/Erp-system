"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Stack, Accordion,
  AccordionSummary, AccordionDetails, Grid, Alert, useMediaQuery, Theme
} from '@mui/material';
import {
  People, AttachMoney, PersonSearch, CalendarToday, Search,
  FilterList, Clear, ExpandMore,
} from '@mui/icons-material';
import { CircularProgress, TextField, FormControl, InputLabel, Select, MenuItem, InputAdornment, IconButton } from '@mui/material';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { EmployeesTab } from './Employees';
import SalaryRecordTab from './SalaryRecord';
import AdvanceManagementTab from './AdvanceManagement';
import AttendanceTrackingTab from './AttendanceTracking';
import { Employee, SalaryRecord, Advance, Attendance } from './HRMTypes';


const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/hrm`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

const HRMPage = () => {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>('joinDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    dateRange: { start: null as Date | null, end: null as Date | null }
  });
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [selectedHistoryEmployee, setSelectedHistoryEmployee] = useState<string>('');
  const { enqueueSnackbar } = useSnackbar();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [empRes, salRes, advRes, attRes] = await Promise.all([
        api.get('/employees'),
        api.get(`/salaries?month=${currentMonth}&year=${currentYear}`),
        api.get('/advances'),
        api.get(`/attendances?month=${currentMonth}&year=${currentYear}`),
      ]);

      setEmployees(empRes.data);
      setSalaryRecords(salRes.data.map((record: SalaryRecord) => {
        const employee = empRes.data.find((emp: Employee) => emp._id === record.employeeId);
        return {
          ...record,
          employeeName: employee?.name || 'Unknown',
          employeePosition: employee?.position || '-',
          employeeAvatar: employee?.avatar,
          department: employee?.department || '-'
        };
      })
    );
    
      setAdvances(advRes.data);
      setAttendances(attRes.data.map((att: Attendance) => ({
        ...att,
        employeeName: empRes.data.find((emp: Employee) => emp._id === att.employeeId)?.name
      })));
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.response?.data?.message || 'Failed to fetch data');
      enqueueSnackbar(error.response?.data?.message || 'Failed to fetch data', {
        variant: 'error',
        autoHideDuration: 3000
      });
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear, enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setPage(1);
    setSearchTerm('');
    setSelectedEmployees([]);
    setFilters({
      department: '',
      status: '',
      dateRange: { start: null, end: null }
    });
  };

  const handleSort = (column: string) => {
    const isAsc = sortBy === column && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortBy(column);
  };

  const handleExport = async (type: 'employees' | 'salaries' | 'advances' | 'attendances') => {
    try {
      const params = new URLSearchParams({
        month: currentMonth.toString(),
        year: currentYear.toString(),
        ...(filters.department && { department: filters.department }),
        ...(filters.status && { status: filters.status }),
        ...(filters.dateRange.start && { startDate: filters.dateRange.start.toISOString() }),
        ...(filters.dateRange.end && { endDate: filters.dateRange.end.toISOString() })
      });

      const response = await api.get(`/${type}/export?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      enqueueSnackbar(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`, {
        variant: 'success'
      });
    } catch (error: any) {
      enqueueSnackbar(`Failed to export ${type}`, { variant: 'error' });
    }
  };

  const filteredData = useMemo(() => {
    const filterItems = <T extends Employee | SalaryRecord | Advance | Attendance>(items: T[]): T[] => {
      return items.filter((item: any) => {
        const matchesSearch = searchTerm
          ? Object.values(item).some((value: any) =>
            value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
          )
          : true;

        const matchesDepartment = filters.department
          ? 'department' in item && item.department === filters.department
          : true;

        const matchesStatus = filters.status
          ? 'status' in item && item.status === filters.status
          : true;

        const itemDate = 'date' in item ? item.date : 'createdAt' in item ? item.createdAt : null;

        const matchesDate =
          filters.dateRange.start && filters.dateRange.end && itemDate
            ? new Date(itemDate) >= filters.dateRange.start &&
            new Date(itemDate) <= filters.dateRange.end
            : true;

        return matchesSearch && matchesDepartment && matchesStatus && matchesDate;
      });
    };

    const sortItems = <T extends Employee | SalaryRecord | Advance | Attendance>(items: T[]): T[] => {
      return [...items].sort((a, b) => {
        const multiplier = sortDirection === 'asc' ? 1 : -1;
        const aValue = (a as any)[sortBy] || '';
        const bValue = (b as any)[sortBy] || '';

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return multiplier * (aValue - bValue);
        }
        return multiplier * aValue.toString().localeCompare(bValue.toString());
      });
    };

    let data: any[] = [];
    switch (activeTab) {
      case 0:
        data = filterItems<Employee>(employees);
        break;
      case 1:
        data = filterItems<SalaryRecord>(salaryRecords);
        break;
      case 2:
        data = filterItems<Advance>(advances);
        break;
      case 3:
        data = filterItems<Attendance>(attendances);
        break;
      default:
        data = [];
    }

    return sortItems(data);
  }, [activeTab, employees, salaryRecords, advances, attendances, searchTerm, filters, sortBy, sortDirection]);

  const paginatedData = filteredData.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const departments = Array.from(new Set(employees.map(emp => emp.department)));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: isMobile ? 1 : 3, bgcolor: 'background.default' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ mb: 3 }}>
          <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom color="primary">
            Human Resource Management
          </Typography>
        </Box>
        
        {/* Responsive Tabs */}
        <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : false}
            allowScrollButtonsMobile
            sx={{ 
              bgcolor: 'primary.light', 
              borderRadius: 2,
              '& .MuiTab-root': {
                minWidth: 'unset',
                padding: isMobile ? '6px 12px' : '12px 16px',
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }
            }}
          >
            <Tab label={isMobile ? "Employees" : "Employees"} icon={<People fontSize={isMobile ? "small" : "medium"} />} iconPosition={isMobile ? "top" : "start"} />
            <Tab label={isMobile ? "Salaries" : "Salary Records"} icon={<AttachMoney fontSize={isMobile ? "small" : "medium"} />} iconPosition={isMobile ? "top" : "start"} />
            <Tab label={isMobile ? "Advances" : "Advance Management"} icon={<PersonSearch fontSize={isMobile ? "small" : "medium"} />} iconPosition={isMobile ? "top" : "start"} />
            <Tab label={isMobile ? "Attendance" : "Attendance Tracking"} icon={<CalendarToday fontSize={isMobile ? "small" : "medium"} />} iconPosition={isMobile ? "top" : "start"} />
          </Tabs>
        </Paper>

        {/* Filter Section */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <FilterList fontSize="small" />
              <Typography variant="body1">Advanced Filters</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Search"
                  size={isMobile ? "small" : "medium"}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize={isMobile ? "small" : "medium"} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    label="Department"
                  >
                    <MenuItem value="">All</MenuItem>
                    {departments.map(dept => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <DatePicker
                    label="Start Date"
                    value={filters.dateRange.start}
                    onChange={(date) => setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, start: date }
                    })}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: isMobile ? "small" : "medium"
                      }
                    }}
                  />
                  <DatePicker
                    label="End Date"
                    value={filters.dateRange.end}
                    onChange={(date) => setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, end: date }
                    })}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: isMobile ? "small" : "medium"
                      }
                    }}
                  />
                  <IconButton 
                    onClick={() => setFilters({
                      department: '',
                      status: '',
                      dateRange: { start: null, end: null }
                    })}
                    size={isMobile ? "small" : "medium"}
                  >
                    <Clear fontSize={isMobile ? "small" : "medium"} />
                  </IconButton>
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>Loading data...</Typography>
          </Box>
        ) : (
          <Box sx={{ 
            width: '100%', 
            overflowX: activeTab === 3 ? 'auto' : 'visible',
            '&::-webkit-scrollbar': {
              height: '6px'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '3px'
            }
          }}>
            {activeTab === 0 && (
             <EmployeesTab
  employees={employees}
  loading={loading}
  fetchData={fetchData}
  searchTerm={searchTerm}
  setSearchTerm={setSearchTerm}
  filters={filters}
  setFilters={setFilters}
  sortBy={sortBy}
  sortDirection={sortDirection}
  handleSort={handleSort}
  selectedEmployees={selectedEmployees}
  setSelectedEmployees={setSelectedEmployees}
  page={page}
  setPage={setPage}
  rowsPerPage={rowsPerPage}
  filteredData={filteredData}
  openHistoryDialog={openHistoryDialog}
  setOpenHistoryDialog={setOpenHistoryDialog}
  setSelectedHistoryEmployee={setSelectedHistoryEmployee}
  handleExport={handleExport}
/>
            )}

            {activeTab === 1 && (
              <SalaryRecordTab
                salaryRecords={salaryRecords}
                loading={loading}
                fetchData={fetchData}
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                currentYear={currentYear}
                setCurrentYear={setCurrentYear}
                employees={employees}
                selectedEmployees={selectedEmployees}
                handleExport={handleExport}
              />
            )}

            {activeTab === 2 && (
              <AdvanceManagementTab
                advances={advances}
                loading={loading}
                fetchData={fetchData}
                employees={employees}
                handleExport={handleExport}
                openHistoryDialog={openHistoryDialog}
                setOpenHistoryDialog={setOpenHistoryDialog}
                selectedHistoryEmployee={selectedHistoryEmployee}
                setSelectedHistoryEmployee={setSelectedHistoryEmployee}
              />
            )}

            {activeTab === 3 && (
              <Box sx={{ minWidth: isMobile ? '800px' : '100%' }}>
                <AttendanceTrackingTab
                  attendances={attendances}
                  loading={loading}
                  fetchData={fetchData}
                  currentMonth={currentMonth}
                  setCurrentMonth={setCurrentMonth}
                  currentYear={currentYear}
                  setCurrentYear={setCurrentYear}
                  employees={employees}
                  selectedEmployees={selectedEmployees}
                  setSelectedEmployees={setSelectedEmployees}
                  handleExport={handleExport}
                />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default HRMPage;