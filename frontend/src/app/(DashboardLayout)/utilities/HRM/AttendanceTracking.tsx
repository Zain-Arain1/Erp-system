"use client";
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  IconButton, Chip, Avatar, FormControlLabel, Checkbox, Grid, Tooltip,
  Autocomplete, useMediaQuery, useTheme, TablePagination, TableSortLabel,
  Card, CardContent, Stack, Collapse, Divider
} from '@mui/material';
import {
  CalendarToday, CloudDownload, Add, GroupAdd, Edit, Delete, CheckCircle,
  Clear, ArrowDropDown, ArrowDropUp, EventAvailable, EventBusy, Schedule,
  AccessTime, HourglassTop, HistoryToggleOff, Summarize, ExpandMore
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { Attendance, AttendanceStatus } from './HRMTypes';
import { useDepartments } from '@/app/hooks/useDepartments';

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
  headers: { 'Content-Type': 'application/json' }
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
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isLg = useMediaQuery(theme.breakpoints.up('lg'));

  const [openAttendanceDialog, setOpenAttendanceDialog] = useState(false);
  const [openBulkAttendanceDialog, setOpenBulkAttendanceDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
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
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(5);
  const [historySortField, setHistorySortField] = useState<keyof Attendance>('date');
  const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc'>('desc');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<AttendanceStatus | 'all'>('all');
  const { enqueueSnackbar } = useSnackbar();
  const { departments } = useDepartments();

  const filteredEmployees = useMemo(() => {
    return selectedDepartment
      ? employees.filter(emp => emp.department === selectedDepartment && emp.status === 'active')
      : employees.filter(emp => emp.status === 'active');
  }, [employees, selectedDepartment]);

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

  const renderAttendanceCell = (employeeId: string, dateKey: string, attendance: { status: AttendanceStatus | 'none'; _id: string | null }) => {
    const cellStyles = {
      cursor: 'pointer',
      p: isXs ? 0.5 : 0.75,
      minWidth: isXs ? 32 : 40,
      maxWidth: isXs ? 32 : 40,
      width: isXs ? 32 : 40,
      textAlign: 'center',
      borderRadius: 1,
      bgcolor: attendance?.status === 'present' ? 'success.light' : 'transparent',
      '&:hover': {
        bgcolor: theme.palette.action.hover,
        transform: 'scale(1.05)',
        transition: 'all 0.2s ease-in-out'
      }
    };

    const statusIcons = {
      present: <CheckCircle color="success" fontSize={isXs ? 'small' : 'medium'} />,
      absent: <Clear color="error" fontSize={isXs ? 'small' : 'medium'} />,
      late: <Chip label="L" color="warning" size="small" sx={{ width: isXs ? 20 : 24, height: isXs ? 20 : 24 }} />,
      'half-day': <Chip label="H" color="info" size="small" sx={{ width: isXs ? 20 : 24, height: isXs ? 20 : 24 }} />,
      leave: <Chip label="LV" color="secondary" size="small" sx={{ width: isXs ? 20 : 24, height: isXs ? 20 : 24 }} />,
      none: null
    };

    return (
      <Box
        key={`${employeeId}-${dateKey}`}
        onClick={() => handleDateClick(employeeId, dateKey, attendance)}
        sx={cellStyles}
      >
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
          {attendance?.status && statusIcons[attendance.status]}
        </motion.div>
      </Box>
    );
  };

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
          : bValue.localeCompare(bValue);
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

      await api[method](url, {
        employeeId: selectedEmployee,
        ...attendanceForm
      });

      enqueueSnackbar(`Attendance record ${editingAttendanceId ? 'updated' : 'added'} successfully`, {
        variant: 'success'
      });

      resetAttendanceForm();
      await fetchData();
    } catch (error: any) {
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

  const renderEmployeeCard = (employee: any) => {
    const days = eachDayOfInterval({
      start: startOfMonth(new Date(currentYear, currentMonth - 1)),
      end: endOfMonth(new Date(currentYear, currentMonth - 1))
    });

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        key={employee._id}
      >
        <Card sx={{
          mb: 1.5,
          borderRadius: 2,
          boxShadow: 2,
          '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
          transition: 'all 0.2s ease-in-out'
        }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Box display="flex" alignItems="center" mb={1}>
              <Avatar src={employee.avatar} sx={{ width: isXs ? 32 : 40, height: isXs ? 32 : 40, mr: 2 }}>
                {employee.name?.charAt(0)}
              </Avatar>
              <Box flex={1}>
                <Typography variant={isXs ? 'body2' : 'h6'} fontWeight="bold">
                  {employee.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {employee.department}
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={0.5} wrap="wrap">
              {days.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const attendance = attendanceCalendar[dateKey]?.[employee._id];
                return (
                  <Grid item key={dateKey} xs={isXs ? 2 : 1.5} sm={1} md={0.75}>
                    <Tooltip title={format(day, 'MMMM d, yyyy')}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" fontSize={isXs ? 10 : 12}>
                          {format(day, 'd')}
                        </Typography>
                        {renderAttendanceCell(employee._id, dateKey, attendance)}
                      </Box>
                    </Tooltip>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <Box sx={{
      width: '100%',
      maxWidth: '100%',
      px: { xs: 1, sm: 2, md: 3 },
      py: { xs: 2, sm: 3 },
      bgcolor: 'background.default',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: 2,
          gap: 1.5
        }}>
          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            width: { xs: '100%', sm: 'auto' }
          }}>
            <TextField
              label="Month"
              type="number"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
              inputProps={{ min: 1, max: 12 }}
              size="small"
              sx={{ width: { xs: '48%', sm: 100 }, borderRadius: 2 }}
              variant="outlined"
            />
            <TextField
              label="Year"
              type="number"
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value) || new Date().getFullYear())}
              size="small"
              sx={{ width: { xs: '48%', sm: 100 }, borderRadius: 2 }}
              variant="outlined"
            />
            <FormControl size="small" sx={{ width: { xs: '100%', sm: 200 }, borderRadius: 2 }}>
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

          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            width: { xs: '100%', sm: 'auto' }
          }}>
            <Button
              variant="outlined"
              startIcon={<CloudDownload />}
              onClick={() => handleExport('attendances')}
              size="small"
              sx={{ flex: { xs: '1 0 100%', sm: '0 0 auto' }, minWidth: 44, height: 44, borderRadius: 2 }}
            >
              {isXs ? 'Export' : 'Export Data'}
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetAttendanceForm();
                setOpenAttendanceDialog(true);
              }}
              size="small"
              sx={{ flex: { xs: '1 0 100%', sm: '0 0 auto' }, minWidth: 44, height: 44, borderRadius: 2 }}
            >
              {isXs ? 'Add' : 'Add Single'}
            </Button>
            <Button
              variant="contained"
              startIcon={<GroupAdd />}
              onClick={() => setOpenBulkAttendanceDialog(true)}
              size="small"
              sx={{ flex: { xs: '1 0 100%', sm: '0 0 auto' }, minWidth: 44, height: 44, borderRadius: 2 }}
            >
              {isXs ? 'Bulk' : 'Bulk Attendance'}
            </Button>
          </Box>
        </Box>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Grid container spacing={1} mb={2}>
          {[
            { icon: EventAvailable, label: 'Present', value: summary.present, color: 'success.main' },
            { icon: EventBusy, label: 'Absent', value: summary.absent, color: 'error.main' },
            { icon: Schedule, label: 'Late', value: summary.late, color: 'warning.main' },
            { icon: AccessTime, label: 'Half Day', value: summary['half-day'], color: 'info.main' },
            { icon: HourglassTop, label: 'Leave', value: summary.leave, color: 'secondary.main' },
            { icon: Summarize, label: 'Total', value: summary.total, color: 'primary.main' }
          ].map((item, index) => (
            <Grid item xs={4} sm={2} key={item.label}>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Paper sx={{
                  p: 1,
                  borderRadius: 2,
                  boxShadow: 2,
                  bgcolor: 'background.paper',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: 'center'
                }}>
                  <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                    <item.icon sx={{ color: item.color, fontSize: isXs ? 16 : 20 }} />
                    <Typography variant="caption" fontSize={isXs ? 10 : 12}>{item.label}</Typography>
                  </Box>
                  <Typography variant={isXs ? 'body2' : 'h6'} color={item.color} fontWeight="bold">
                    {item.value}
                  </Typography>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </motion.div>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1}>
          <CircularProgress />
        </Box>
      ) : (
        <Box flexGrow={1} display="flex" flexDirection="column">
          {/* Attendance Cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ maxHeight: { xs: '60vh', sm: '50vh', md: '40vh' }, overflowY: 'auto', mb: 2 }}>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.slice(0, isXs ? 5 : isSm ? 8 : 10).map(employee => renderEmployeeCard(employee))
              ) : (
                <Typography variant="body1" textAlign="center" py={4}>
                  {selectedDepartment
                    ? `No active employees found in ${selectedDepartment} department`
                    : 'No active employees found'}
                </Typography>
              )}
            </Box>
          </motion.div>

          {/* Attendance History Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Paper sx={{ borderRadius: 2, boxShadow: 2, mb: 2 }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1.5,
                cursor: 'pointer'
              }}
              onClick={() => setShowHistory(!showHistory)}
              >
                <Typography variant={isXs ? 'h6' : 'h5'} display="flex" alignItems="center" gap={1}>
                  <HistoryToggleOff />
                  Attendance History
                </Typography>
                <ExpandMore sx={{ transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </Box>
              <Collapse in={showHistory}>
                <Divider />
                <Box sx={{ p: 1.5 }}>
                  <FormControl size="small" sx={{ minWidth: { xs: 100, sm: 150 }, mb: 1 }}>
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
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <TableSortLabel
                            active={historySortField === 'employeeName'}
                            direction={historySortDirection}
                            onClick={() => handleHistorySort('employeeName')}
                          >
                            Employee
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={historySortField === 'date'}
                            direction={historySortDirection}
                            onClick={() => handleHistorySort('date')}
                          >
                            Date
                          </TableSortLabel>
                        </TableCell>
                        {!isXs && (
                          <>
                            <TableCell>Status</TableCell>
                            <TableCell>Check In</TableCell>
                            <TableCell>Check Out</TableCell>
                          </>
                        )}
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredHistory
                        .slice(historyPage * historyRowsPerPage, historyPage * historyRowsPerPage + historyRowsPerPage)
                        .map((attendance: Attendance) => (
                          <TableRow key={attendance._id} hover>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ width: isXs ? 24 : 32, height: isXs ? 24 : 32 }}>
                                  {attendance.employeeName?.charAt(0) || '?'}
                                </Avatar>
                                <Typography variant={isXs ? 'caption' : 'body2'} fontWeight="bold">
                                  {attendance.employeeName || 'Unknown'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant={isXs ? 'caption' : 'body2'}>
                                {format(new Date(attendance.date), 'MM/dd/yy')}
                              </Typography>
                            </TableCell>
                            {!isXs && (
                              <>
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
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {attendance.checkIn ? format(new Date(attendance.checkIn), 'HH:mm') : '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {attendance.checkOut ? format(new Date(attendance.checkOut), 'HH:mm') : '-'}
                                  </Typography>
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              <Box display="flex" gap={0.5}>
                                <IconButton
                                  onClick={() => editAttendance(attendance)}
                                  color="primary"
                                  size="small"
                                  sx={{ minWidth: 44, minHeight: 44 }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                  onClick={() => deleteAttendance(attendance._id)}
                                  color="error"
                                  size="small"
                                  sx={{ minWidth: 44, minHeight: 44 }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    rowsPerPageOptions={[5, 10]}
                    component="div"
                    count={filteredHistory.length}
                    rowsPerPage={historyRowsPerPage}
                    page={historyPage}
                    onPageChange={handleChangeHistoryPage}
                    onRowsPerPageChange={handleChangeHistoryRowsPerPage}
                    sx={{ borderTop: '1px solid rgba(224, 224, 224, 1)' }}
                  />
                </Box>
              </Collapse>
            </Paper>
          </motion.div>
        </Box>
      )}

      {/* Single Attendance Dialog */}
      <Dialog
        open={openAttendanceDialog}
        onClose={resetAttendanceForm}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, boxShadow: 6 }
        }}
        // TransitionComponent={motion.div}
        transitionDuration={300}
      >
        <DialogTitle sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <CalendarToday />
          {editingAttendanceId ? 'Edit Attendance' : 'Add Attendance'} Record
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
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
                    margin="dense"
                    label="Employee"
                    required
                    fullWidth
                    variant="outlined"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                fullWidth
                label="Date"
                type="date"
                value={attendanceForm.date}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
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
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                fullWidth
                label="Check In"
                type="time"
                value={attendanceForm.checkIn}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, checkIn: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required={attendanceForm.status === 'present' || attendanceForm.status === 'late'}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                fullWidth
                label="Check Out"
                type="time"
                value={attendanceForm.checkOut}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, checkOut: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required={attendanceForm.status === 'present' || attendanceForm.status === 'half-day'}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                fullWidth
                label="Notes"
                value={attendanceForm.notes}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={2}
                variant="outlined"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 1.5, bgcolor: 'background.paper' }}>
          <Button
            onClick={resetAttendanceForm}
            variant="outlined"
            sx={{ minWidth: 100, height: 44, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAttendanceSubmit}
            variant="contained"
            disabled={!selectedEmployee}
            sx={{ minWidth: 100, height: 44, borderRadius: 2 }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Attendance Dialog */}
      <Dialog
        open={openBulkAttendanceDialog}
        onClose={resetBulkAttendanceForm}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, boxShadow: 6 }
        }}
        // TransitionComponent={motion.div}
        transitionDuration={300}
      >
        <DialogTitle sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <GroupAdd />
          Bulk Attendance Recording
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Grid container spacing={1.5}>
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
                      margin="dense"
                      label="Select Employees"
                      placeholder="Search employees..."
                      fullWidth
                      variant="outlined"
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option._id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar src={option.avatar} sx={{ width: isXs ? 24 : 32, height: isXs ? 24 : 32 }}>
                          {option.name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant={isXs ? 'caption' : 'body2'}>{option.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.position} • {option.department}
                          </Typography>
                        </Box>
                      </Box>
                    </li>
                  )}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
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
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
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
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
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
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
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
                variant="outlined"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 1.5, bgcolor: 'background.paper' }}>
          <Button
            onClick={resetBulkAttendanceForm}
            variant="outlined"
            sx={{ minWidth: 100, height: 44, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBulkAttendanceSubmit}
            variant="contained"
            disabled={!bulkAttendanceForm.applyToAll && selectedEmployees.length === 0}
            sx={{ minWidth: 100, height: 44, borderRadius: 2 }}
          >
            Save Bulk Records
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceTrackingTab;