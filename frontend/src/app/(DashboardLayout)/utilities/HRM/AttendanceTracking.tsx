"use client";
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  IconButton, Chip, Avatar, FormControlLabel, Checkbox, Grid, Tooltip, Autocomplete,
  useMediaQuery, useTheme, TablePagination, TableSortLabel, Badge
} from '@mui/material';
import {
  CalendarToday, CloudDownload, Add, GroupAdd, Edit, Delete, CheckCircle, Clear,
  ArrowDropDown, ArrowDropUp, EventAvailable, EventBusy, Schedule, AccessTime, 
  HourglassTop, HistoryToggleOff, Summarize, ViewWeek, FilterAlt
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { Attendance, AttendanceStatus } from './HRMTypes';
import { useDepartments } from '@/app/hooks/useDepartments'; // Updated import path

interface AttendanceTrackingTabProps {
  attendances: Attendance[];
  loading: boolean;
  fetchData: () => Promise<void>;
  currentMonth: number;
  setCurrentMonth: (month: number) => void;
  currentYear: number;
  setCurrentYear: (year: number) => void;
  employees: any[];
  selectedEmployees: string[];
  setSelectedEmployees: (ids: string[]) => void;
  handleExport: (type: 'employees' | 'salaries' | 'advances' | 'attendances') => Promise<void>;
}

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/hrm`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

const AttendanceTrackingTab: React.FC<AttendanceTrackingTabProps> = ({
  attendances,
  loading,
  fetchData,
  currentMonth,
  setCurrentMonth,
  currentYear,
  setCurrentYear,
  employees,
  selectedEmployees,
  setSelectedEmployees,
  handleExport
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isXSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [openAttendanceDialog, setOpenAttendanceDialog] = useState(false);
  const [openBulkAttendanceDialog, setOpenBulkAttendanceDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [attendanceForm, setAttendanceForm] = useState<{
    date: string;
    status: AttendanceStatus;
    checkIn: string;
    checkOut: string;
    notes: string;
    employeeName: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkIn: '09:00',
    checkOut: '17:00',
    notes: '',
    employeeName: ''
  });
  const [bulkAttendanceForm, setBulkAttendanceForm] = useState<{
    date: string;
    status: AttendanceStatus;
    checkIn: string;
    checkOut: string;
    applyToAll: boolean;
  }>({
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkIn: '09:00',
    checkOut: '17:00',
    applyToAll: false
  });
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
  const [historySortField, setHistorySortField] = useState<keyof Attendance>('date');
  const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc'>('desc');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<AttendanceStatus | 'all'>('all');
  const { enqueueSnackbar } = useSnackbar();

  const {departments} = useDepartments(); 

  const filteredEmployees = useMemo(() => {
    return selectedDepartment
      ? employees.filter(emp => emp.department === selectedDepartment && emp.status === 'active')
      : employees.filter(emp => emp.status === 'active');
  }, [employees, selectedDepartment]);

  // Create attendance calendar data structure
  const attendanceCalendar = useMemo(() => {
    const start = startOfMonth(new Date(currentYear, currentMonth - 1));
    const end = endOfMonth(new Date(currentYear, currentMonth - 1));
    const days = eachDayOfInterval({ start, end });

    return days.reduce((acc, day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      acc[dateKey] = filteredEmployees.reduce((empAcc, emp) => {
        const att = attendances.find(a => 
          a.employeeId === emp._id &&
          isSameDay(parseISO(a.date), day)
        );
        empAcc[emp._id] = att || { status: 'none', _id: null };
        return empAcc;
      }, {} as Record<string, { status: AttendanceStatus | 'none'; _id: string | null }>);
      return acc;
    }, {} as Record<string, Record<string, { status: AttendanceStatus | 'none'; _id: string | null }>>);
  }, [attendances, filteredEmployees, currentMonth, currentYear]);

  // Enhanced table cell rendering with green tick for present employees
  const renderAttendanceCell = (employeeId: string, dateKey: string, attendance: { status: AttendanceStatus | 'none'; _id: string | null }) => {
    const cellStyles = {
      cursor: 'pointer',
      backgroundColor: attendance?.status === 'present' ? 'rgba(76, 175, 80, 0.1)' : 'inherit',
      px: isXSmallScreen ? 0.5 : 1,
      py: 1,
      minWidth: 40,
      maxWidth: 40,
      width: 40,
      textAlign: 'center',
      position: 'relative',
      borderRight: '1px solid rgba(224, 224, 224, 0.3)',
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
      }
    };

    const statusIcons = {
      present: (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CheckCircle 
            color="success" 
            fontSize={isXSmallScreen ? 'small' : 'medium'} 
            sx={{ 
              position: 'relative',
              '&:before': {
                content: '""',
                position: 'absolute',
                top: -2,
                left: -2,
                right: -2,
                bottom: -2,
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                borderRadius: '50%',
                zIndex: 0
              }
            }}
          />
        </Box>
      ),
      absent: <Clear color="error" fontSize={isXSmallScreen ? 'small' : 'medium'} />,
      late: (
        <Tooltip title="Late" arrow>
          <Chip 
            label="L" 
            color="warning" 
            size={isXSmallScreen ? 'small' : 'medium'} 
            sx={{ width: 24, height: 24, fontSize: '0.75rem' }} 
          />
        </Tooltip>
      ),
      'half-day': (
        <Tooltip title="Half Day" arrow>
          <Chip 
            label="H" 
            color="info" 
            size={isXSmallScreen ? 'small' : 'medium'} 
            sx={{ width: 24, height: 24, fontSize: '0.75rem' }} 
          />
        </Tooltip>
      ),
      leave: (
        <Tooltip title="Leave" arrow>
          <Chip 
            label="LV" 
            color="secondary" 
            size={isXSmallScreen ? 'small' : 'medium'} 
            sx={{ width: 24, height: 24, fontSize: '0.75rem' }} 
          />
        </Tooltip>
      ),
      none: null
    };

    return (
      <TableCell
        key={`${employeeId}-${dateKey}`}
        align="center"
        onClick={() => handleDateClick(employeeId, dateKey, attendance)}
        sx={cellStyles}
      >
        {attendance?.status && statusIcons[attendance.status]}
      </TableCell>
    );
  };

  // Enhanced attendance history handling
  const filteredHistory = useMemo(() => {
    let history = attendances.filter(att => 
      filteredEmployees.some(emp => emp._id === att.employeeId)
    );

    if (historyFilterStatus !== 'all') {
      history = history.filter(att => att.status === historyFilterStatus);
    }

    return history.sort((a, b) => {
      const aValue = a[historySortField];
      const bValue = b[historySortField];
      
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return historySortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return historySortDirection === 'asc' ? -1 : 1;
      
      if (['date', 'checkIn', 'checkOut'].includes(historySortField)) {
        const aDate = new Date(aValue as string);
        const bDate = new Date(bValue as string);
        return historySortDirection === 'asc' 
          ? aDate.getTime() - bDate.getTime() 
          : bDate.getTime() - aDate.getTime();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return historySortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
  }, [attendances, filteredEmployees, historyFilterStatus, historySortField, historySortDirection]);

  const handleHistorySort = (field: keyof Attendance) => {
    const isAsc = historySortField === field && historySortDirection === 'asc';
    setHistorySortDirection(isAsc ? 'desc' : 'asc');
    setHistorySortField(field);
  };

  const handleChangeHistoryPage = (event: unknown, newPage: number) => {
    setHistoryPage(newPage);
  };

  const handleChangeHistoryRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHistoryRowsPerPage(parseInt(event.target.value, 10));
    setHistoryPage(0);
  };

  const handleAttendanceSubmit = async () => {
    try {
      if (!selectedEmployee) {
        enqueueSnackbar('Please select an employee', { variant: 'warning' });
        return;
      }

      const method = editingAttendanceId ? 'put' : 'post';
      const url = editingAttendanceId
        ? `/attendances/${editingAttendanceId}`
        : '/attendances';

      const response = await api[method](url, {
        employeeId: selectedEmployee,
        ...attendanceForm
      });

      enqueueSnackbar(`Attendance record ${editingAttendanceId ? 'updated' : 'added'} successfully`, {
        variant: 'success'
      });

      resetAttendanceForm();
      await fetchData();
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      enqueueSnackbar(error.response?.data?.message || 'Failed to add attendance record', {
        variant: 'error',
        autoHideDuration: 3000
      });
    }
  };

  const resetAttendanceForm = () => {
    setOpenAttendanceDialog(false);
    setSelectedEmployee('');
    setAttendanceForm({
      date: new Date().toISOString().split('T')[0],
      status: 'present',
      checkIn: '09:00',
      checkOut: '17:00',
      notes: '',
      employeeName: ''
    });
    setEditingAttendanceId(null);
  };

  const handleBulkAttendanceSubmit = async () => {
    try {
      const employeesToProcess = bulkAttendanceForm.applyToAll
        ? filteredEmployees
        : filteredEmployees.filter(emp => selectedEmployees.includes(emp._id));

      if (employeesToProcess.length === 0) {
        enqueueSnackbar('Please select employees or choose apply to all', { variant: 'warning' });
        return;
      }

      const response = await api.post('/attendances/bulk', {
        employees: employeesToProcess.map(emp => emp._id),
        ...bulkAttendanceForm
      });

      enqueueSnackbar(`Successfully recorded ${response.data.createdCount} attendance records`, {
        variant: 'success'
      });
      resetBulkAttendanceForm();
      await fetchData();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to record bulk attendance', {
        variant: 'error'
      });
    }
  };

  const resetBulkAttendanceForm = () => {
    setOpenBulkAttendanceDialog(false);
    setSelectedEmployees([]);
    setBulkAttendanceForm({
      date: new Date().toISOString().split('T')[0],
      status: 'present',
      checkIn: '09:00',
      checkOut: '17:00',
      applyToAll: false
    });
  };

  const deleteAttendance = async (id: string) => {
    try {
      await api.delete(`/attendances/${id}`);
      enqueueSnackbar('Attendance record deleted successfully', { variant: 'success' });
      await fetchData();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to delete attendance record', {
        variant: 'error'
      });
    }
  };

  const editAttendance = (attendance: Attendance) => {
    setSelectedEmployee(attendance.employeeId);
    setAttendanceForm({
      date: format(new Date(attendance.date), 'yyyy-MM-dd'),
      status: attendance.status,
      checkIn: attendance.checkIn ? format(new Date(attendance.checkIn), 'HH:mm') : '09:00',
      checkOut: attendance.checkOut ? format(new Date(attendance.checkOut), 'HH:mm') : '17:00',
      notes: attendance.notes || '',
      employeeName: attendance.employeeName || ''
    });
    setEditingAttendanceId(attendance._id);
    setOpenAttendanceDialog(true);
  };

  const handleDateClick = (employeeId: string, dateKey: string, attendance: { status: AttendanceStatus | 'none'; _id: string | null }) => {
    if (attendance?._id) {
      const foundAttendance = attendances.find(a => a._id === attendance._id);
      if (foundAttendance) {
        editAttendance(foundAttendance);
      }
    } else {
      const employee = employees.find(emp => emp._id === employeeId);
      if (employee) {
        setSelectedEmployee(employeeId);
        setAttendanceForm(prev => ({
          ...prev,
          date: dateKey,
          employeeName: employee.name || '',
          status: 'present'
        }));
        setOpenAttendanceDialog(true);
      }
    }
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      'half-day': 0,
      leave: 0,
      total: filteredEmployees.length
    };

    Object.values(attendanceCalendar).forEach(dayAttendances => {
      Object.values(dayAttendances).forEach(att => {
        if (att.status !== 'none') {
          summary[att.status]++;
        }
      });
    });

    return summary;
  };

  const summary = calculateSummary();

  return (
    <Box sx={{
      width: '100%',
      overflow: 'hidden',
      px: isXSmallScreen ? 1 : 2,
      py: 2
    }}>
      {/* Header Section */}
      <Box display="flex" flexDirection={isXSmallScreen ? 'column' : 'row'}
        justifyContent="space-between" alignItems={isXSmallScreen ? 'flex-start' : 'center'}
        mb={3} gap={2}>

        <Box display="flex" gap={2} flexWrap="wrap" width={isXSmallScreen ? '100%' : 'auto'}>
          <TextField
            label="Month"
            type="number"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 12 }}
            size="small"
            sx={{ minWidth: isXSmallScreen ? '30%' : 100 }}
          />
          <TextField
            label="Year"
            type="number"
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value) || new Date().getFullYear())}
            size="small"
            sx={{ minWidth: isXSmallScreen ? '30%' : 100 }}
          />
          <FormControl size="small" sx={{ minWidth: isXSmallScreen ? '35%' : 200 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              label="Department"
            >
              <MenuItem value="">
                <em>All Departments</em>
              </MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box display="flex" gap={1} flexWrap="wrap" width={isXSmallScreen ? '100%' : 'auto'}>
          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={() => handleExport('attendances')}
            sx={{ whiteSpace: 'nowrap' }}
            size={isXSmallScreen ? 'small' : 'medium'}
            fullWidth={isXSmallScreen}
          >
            {isXSmallScreen ? 'Export' : 'Export Data'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetAttendanceForm();
              setOpenAttendanceDialog(true);
            }}
            sx={{ whiteSpace: 'nowrap' }}
            size={isXSmallScreen ? 'small' : 'medium'}
            fullWidth={isXSmallScreen}
          >
            {isXSmallScreen ? 'Add' : 'Add Single'}
          </Button>
          <Button
            variant="contained"
            startIcon={<GroupAdd />}
            onClick={() => setOpenBulkAttendanceDialog(true)}
            sx={{ whiteSpace: 'nowrap' }}
            size={isXSmallScreen ? 'small' : 'medium'}
            fullWidth={isXSmallScreen}
          >
            {isXSmallScreen ? 'Bulk' : 'Bulk Attendance'}
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
        <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <EventAvailable color="success" />
            <Typography variant="body1">Present</Typography>
          </Box>
          <Typography variant="h6" color="success.main">
            {summary.present}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <EventBusy color="error" />
            <Typography variant="body1">Absent</Typography>
          </Box>
          <Typography variant="h6" color="error.main">
            {summary.absent}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Schedule color="warning" />
            <Typography variant="body1">Late</Typography>
          </Box>
          <Typography variant="h6" color="warning.main">
            {summary.late}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <AccessTime color="info" />
            <Typography variant="body1">Half Day</Typography>
          </Box>
          <Typography variant="h6" color="info.main">
            {summary['half-day']}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <HourglassTop color="secondary" />
            <Typography variant="body1">Leave</Typography>
          </Box>
          <Typography variant="h6" color="secondary.main">
            {summary.leave}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Summarize color="primary" />
            <Typography variant="body1">Total</Typography>
          </Box>
          <Typography variant="h6" color="primary.main">
            {summary.total}
          </Typography>
        </Paper>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Attendance Calendar */}
          <Paper sx={{
            borderRadius: 2,
            mb: 4,
            width: '100%',
            overflow: 'hidden',
            boxShadow: 3
          }}>
            <Box sx={{
              width: '100%',
              overflowX: 'auto',
              position: 'relative',
              maxHeight: '60vh',
              overflowY: 'auto'
            }}>
              <Table sx={{ minWidth: 'max-content' }}>
                <TableHead sx={{ 
                  position: 'sticky', 
                  top: 0, 
                  zIndex: 1, 
                  bgcolor: 'background.paper',
                  borderBottom: '2px solid',
                  borderColor: 'divider'
                }}>
                  <TableRow>
                    <TableCell sx={{
                      minWidth: 180,
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      bgcolor: 'background.paper',
                      borderRight: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Typography fontWeight="bold">Employee</Typography>
                    </TableCell>
                    {eachDayOfInterval({
                      start: startOfMonth(new Date(currentYear, currentMonth - 1)),
                      end: endOfMonth(new Date(currentYear, currentMonth - 1))
                    }).map(day => (
                      <TableCell
                        key={format(day, 'yyyy-MM-dd')}
                        align="center"
                        sx={{
                          minWidth: 40,
                          maxWidth: 40,
                          width: 40,
                          px: 0.5,
                          py: 1,
                          borderRight: '1px solid rgba(224, 224, 224, 0.5)',
                          bgcolor: day.getDay() === 0 || day.getDay() === 6 ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
                        }}
                      >
                        <Box display="flex" flexDirection="column" alignItems="center">
                          <Typography variant="caption" fontSize={10} color="text.secondary">
                            {format(day, 'EEE')}
                          </Typography>
                          <Typography variant="body2" fontSize={12} fontWeight={isSameDay(day, new Date()) ? 'bold' : 'normal'}>
                            {format(day, 'd')}
                          </Typography>
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map(employee => (
                      <TableRow key={employee._id} hover>
                        <TableCell sx={{
                          position: 'sticky',
                          left: 0,
                          bgcolor: 'background.paper',
                          zIndex: 1,
                          minWidth: 180,
                          borderRight: '1px solid',
                          borderColor: 'divider'
                        }}>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar src={employee.avatar} sx={{ width: 32, height: 32 }}>
                              {employee.name?.charAt(0)}
                            </Avatar>
                            <Box sx={{ overflow: 'hidden' }}>
                              <Typography
                                fontWeight="bold"
                                fontSize={14}
                                noWrap
                              >
                                {employee.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                fontSize={12}
                                noWrap
                              >
                                {employee.department}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        {eachDayOfInterval({
                          start: startOfMonth(new Date(currentYear, currentMonth - 1)),
                          end: endOfMonth(new Date(currentYear, currentMonth - 1))
                        }).map(day => {
                          const dateKey = format(day, 'yyyy-MM-dd');
                          const attendance = attendanceCalendar[dateKey]?.[employee._id];
                          return renderAttendanceCell(employee._id, dateKey, attendance);
                        })}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={32} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1">
                          {selectedDepartment
                            ? `No active employees found in ${selectedDepartment} department`
                            : 'No active employees found'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>

          {/* Attendance History Section */}
          <Box sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" gutterBottom>
                <Box display="flex" alignItems="center" gap={1}>
                  <HistoryToggleOff />
                  Attendance History
                </Box>
              </Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Filter Status</InputLabel>
                <Select
                  value={historyFilterStatus}
                  onChange={(e) => setHistoryFilterStatus(e.target.value as AttendanceStatus | 'all')}
                  label="Filter Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="present">Present</MenuItem>
                  <MenuItem value="absent">Absent</MenuItem>
                  <MenuItem value="late">Late</MenuItem>
                  <MenuItem value="half-day">Half Day</MenuItem>
                  <MenuItem value="leave">Leave</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Paper sx={{ overflow: 'auto', borderRadius: 2, boxShadow: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={historySortField === 'employeeName'}
                        direction={historySortDirection}
                        onClick={() => handleHistorySort('employeeName')}
                      >
                        Employee
                        {historySortField === 'employeeName' && (
                          historySortDirection === 'asc' ? <ArrowDropUp /> : <ArrowDropDown />
                        )}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={historySortField === 'date'}
                        direction={historySortDirection}
                        onClick={() => handleHistorySort('date')}
                      >
                        Date
                        {historySortField === 'date' && (
                          historySortDirection === 'asc' ? <ArrowDropUp /> : <ArrowDropDown />
                        )}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={historySortField === 'checkIn'}
                        direction={historySortDirection}
                        onClick={() => handleHistorySort('checkIn')}
                      >
                        Check In
                        {historySortField === 'checkIn' && (
                          historySortDirection === 'asc' ? <ArrowDropUp /> : <ArrowDropDown />
                        )}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={historySortField === 'checkOut'}
                        direction={historySortDirection}
                        onClick={() => handleHistorySort('checkOut')}
                      >
                        Check Out
                        {historySortField === 'checkOut' && (
                          historySortDirection === 'asc' ? <ArrowDropUp /> : <ArrowDropDown />
                        )}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHistory
                    .slice(historyPage * historyRowsPerPage, historyPage * historyRowsPerPage + historyRowsPerPage)
                    .map((attendance: Attendance) => (
                      <TableRow key={attendance._id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar>
                              {attendance.employeeName?.charAt(0) || '?'}
                            </Avatar>
                            <Typography fontWeight="bold">
                              {attendance.employeeName || 'Unknown'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={format(new Date(attendance.date), 'EEEE, MMMM d, yyyy')} arrow>
                            <span>{format(new Date(attendance.date), 'MM/dd/yyyy')}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={attendance.status}
                            color={
                              attendance.status === 'present' ? 'success' :
                              attendance.status === 'absent' ? 'error' :
                              attendance.status === 'late' ? 'warning' :
                              attendance.status === 'half-day' ? 'info' :
                              'secondary'
                            }
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell>
                          {attendance.checkIn ? (
                            <Tooltip title={`Recorded at ${format(new Date(attendance.checkIn), 'h:mm a')}`} arrow>
                              <span>{format(new Date(attendance.checkIn), 'HH:mm')}</span>
                            </Tooltip>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {attendance.checkOut ? (
                            <Tooltip title={`Recorded at ${format(new Date(attendance.checkOut), 'h:mm a')}`} arrow>
                              <span>{format(new Date(attendance.checkOut), 'HH:mm')}</span>
                            </Tooltip>
                          ) : '-'}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Tooltip title={attendance.notes || 'No notes'} arrow>
                            <Typography noWrap sx={{ maxWidth: '100%' }}>
                              {attendance.notes || '-'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Edit" arrow>
                              <IconButton
                                onClick={() => editAttendance(attendance)}
                                color="primary"
                                size="small"
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete" arrow>
                              <IconButton
                                onClick={() => deleteAttendance(attendance._id)}
                                color="error"
                                size="small"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredHistory.length}
                rowsPerPage={historyRowsPerPage}
                page={historyPage}
                onPageChange={handleChangeHistoryPage}
                onRowsPerPageChange={handleChangeHistoryRowsPerPage}
                sx={{ borderTop: '1px solid rgba(224, 224, 224, 1)' }}
              />
            </Paper>
          </Box>
        </>
      )}

      {/* Single Attendance Dialog */}
      <Dialog
        open={openAttendanceDialog}
        onClose={resetAttendanceForm}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          {editingAttendanceId ? 'Edit Attendance' : 'Add Attendance'} Record
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Autocomplete
            options={filteredEmployees}
            getOptionLabel={(option) => `${option.name} (${option.position})`}
            onChange={(e, value) => {
              setSelectedEmployee(value?._id || '');
              setAttendanceForm(prev => ({
                ...prev,
                employeeName: value?.name || ''
              }));
            }}
            value={filteredEmployees.find(emp => emp._id === selectedEmployee) || null}
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
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Date"
                type="date"
                value={attendanceForm.date}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  value={attendanceForm.status}
                  onChange={(e) => setAttendanceForm(prev => ({
                    ...prev,
                    status: e.target.value as AttendanceStatus
                  }))}
                  label="Status"
                  required
                >
                  <MenuItem value="present">Present</MenuItem>
                  <MenuItem value="absent">Absent</MenuItem>
                  <MenuItem value="late">Late</MenuItem>
                  <MenuItem value="half-day">Half Day</MenuItem>
                  <MenuItem value="leave">Leave</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Check In"
                type="time"
                value={attendanceForm.checkIn}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, checkIn: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required={attendanceForm.status === 'present' || attendanceForm.status === 'late'}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Check Out"
                type="time"
                value={attendanceForm.checkOut}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, checkOut: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required={attendanceForm.status === 'present' || attendanceForm.status === 'half-day'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="normal"
                fullWidth
                label="Notes"
                value={attendanceForm.notes}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={resetAttendanceForm} variant="outlined">Cancel</Button>
          <Button
            onClick={handleAttendanceSubmit}
            variant="contained"
            disabled={!selectedEmployee}
            sx={{ ml: 1 }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Attendance Dialog */}
      <Dialog
        open={openBulkAttendanceDialog}
        onClose={resetBulkAttendanceForm}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          Bulk Attendance Recording
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={bulkAttendanceForm.applyToAll}
                    onChange={(e) => setBulkAttendanceForm(prev => ({
                      ...prev,
                      applyToAll: e.target.checked
                    }))}
                  />
                }
                label="Apply to all active employees"
              />
            </Grid>
            {!bulkAttendanceForm.applyToAll && (
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={filteredEmployees}
                  getOptionLabel={(option) => `${option.name} (${option.position})`}
                  onChange={(e, value) => setSelectedEmployees(value.map(emp => emp._id))}
                  value={filteredEmployees.filter(emp => selectedEmployees.includes(emp._id))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      margin="normal"
                      label="Select Employees"
                      placeholder="Search employees..."
                      fullWidth
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option._id}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar src={option.avatar} sx={{ width: 32, height: 32 }}>
                          {option.name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography>{option.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.position} • {option.department}
                          </Typography>
                        </Box>
                      </Box>
                    </li>
                  )}
                />
              </Grid>
            )}
            <Grid item xs={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Date"
                type="date"
                value={bulkAttendanceForm.date}
                onChange={(e) => setBulkAttendanceForm(prev => ({
                  ...prev,
                  date: e.target.value
                }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  value={bulkAttendanceForm.status}
                  onChange={(e) => setBulkAttendanceForm(prev => ({
                    ...prev,
                    status: e.target.value as AttendanceStatus
                  }))}
                  label="Status"
                  required
                >
                  <MenuItem value="present">Present</MenuItem>
                  <MenuItem value="absent">Absent</MenuItem>
                  <MenuItem value="late">Late</MenuItem>
                  <MenuItem value="half-day">Half Day</MenuItem>
                  <MenuItem value="leave">Leave</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Check In"
                type="time"
                value={bulkAttendanceForm.checkIn}
                onChange={(e) => setBulkAttendanceForm(prev => ({
                  ...prev,
                  checkIn: e.target.value
                }))}
                InputLabelProps={{ shrink: true }}
                required={bulkAttendanceForm.status === 'present' || bulkAttendanceForm.status === 'late'}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Check Out"
                type="time"
                value={bulkAttendanceForm.checkOut}
                onChange={(e) => setBulkAttendanceForm(prev => ({
                  ...prev,
                  checkOut: e.target.value
                }))}
                InputLabelProps={{ shrink: true }}
                required={bulkAttendanceForm.status === 'present' || bulkAttendanceForm.status === 'half-day'}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={resetBulkAttendanceForm} variant="outlined">Cancel</Button>
          <Button
            onClick={handleBulkAttendanceSubmit}
            variant="contained"
            disabled={!bulkAttendanceForm.applyToAll && selectedEmployees.length === 0}
            sx={{ ml: 1 }}
          >
            Save Bulk Records
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceTrackingTab;