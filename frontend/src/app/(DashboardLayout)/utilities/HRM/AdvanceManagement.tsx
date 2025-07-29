"use client";
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Chip, CircularProgress, Tooltip, Alert,
  Grid, InputAdornment, TableContainer, TablePagination, useMediaQuery,
  useTheme, Divider, FormControl, Select, MenuItem, Stack, Avatar, Badge
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import {
  PersonSearch, CloudDownload, Add, CheckCircle, Cancel,
  AttachMoney, History, Paid, PendingActions, MoneyOff, FilterList
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { format } from 'date-fns';
import { Advance } from './HRMTypes';

interface AdvanceManagementTabProps {
  advances: Advance[];
  loading: boolean;
  fetchData: () => Promise<void>;
  employees: any[];
  handleExport: (type: 'employees' | 'salaries' | 'advances' | 'attendances') => Promise<void>;
  openHistoryDialog: boolean;
  setOpenHistoryDialog: React.Dispatch<React.SetStateAction<boolean>>;
  selectedHistoryEmployee: string;
  setSelectedHistoryEmployee: React.Dispatch<React.SetStateAction<string>>;
}

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/hrm`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

const AdvanceManagementTab: React.FC<AdvanceManagementTabProps> = ({
  advances,
  loading,
  fetchData,
  employees,
  handleExport,
  openHistoryDialog,
  setOpenHistoryDialog,
  selectedHistoryEmployee,
  setSelectedHistoryEmployee
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { enqueueSnackbar } = useSnackbar();

  // State management
  const [openAdvanceDialog, setOpenAdvanceDialog] = useState(false);
  const [openRepaymentDialog, setOpenRepaymentDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [advanceForm, setAdvanceForm] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    reason: '',
    employeeName: ''
  });
  const [repaymentForm, setRepaymentForm] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    advanceId: ''
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 5 : isTablet ? 8 : 10);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    hover: { scale: 1.02, boxShadow: theme.shadows[8], transition: { duration: 0.2 } }
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 }
  };

  // Calculate remaining advance
  const getRemainingAdvance = (advance: Advance) => {
    const totalRepaid = advance.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
    return advance.amount - totalRepaid;
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalAdvances = advances.reduce((sum, advance) => sum + advance.amount, 0);
    const totalRepaid = advances.reduce((sum, advance) =>
      sum + (advance.repayments?.reduce((repSum, repayment) => repSum + repayment.amount, 0) || 0), 0);
    const pendingAdvances = advances.filter(a => a.status === 'pending').length;
    const approvedAdvances = advances.filter(a => a.status === 'approved').length;
    const rejectedAdvances = advances.filter(a => a.status === 'rejected').length;

    return {
      totalAdvances,
      totalRepaid,
      pendingAdvances,
      approvedAdvances,
      rejectedAdvances
    };
  }, [advances]);

  // Filter and paginate advances
  const filteredAdvances = useMemo(() => {
    return statusFilter === 'all' ? advances : advances.filter(adv => adv.status === statusFilter);
  }, [advances, statusFilter]);

  const paginatedAdvances = useMemo(() => {
    return filteredAdvances.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredAdvances, page, rowsPerPage]);

  // Responsive table columns
  const mobileColumns = [
    { id: 'employee', label: 'Employee' },
    { id: 'amount', label: 'Amount' },
    { id: 'status', label: 'Status' }
  ];

  const tabletColumns = [
    { id: 'employee', label: 'Employee' },
    { id: 'department', label: 'Department' },
    { id: 'amount', label: 'Amount' },
    { id: 'date', label: 'Date' },
    { id: 'status', label: 'Status' }
  ];

  const desktopColumns = [
    { id: 'employee', label: 'Employee' },
    { id: 'department', label: 'Department' },
    { id: 'amount', label: 'Amount' },
    { id: 'date', label: 'Date' },
    { id: 'reason', label: 'Reason' },
    { id: 'status', label: 'Status' },
    { id: 'remaining', label: 'Remaining' }
  ];

  const columns = isMobile ? mobileColumns : isTablet ? tabletColumns : desktopColumns;

  // API operations
  const handleApiError = (error: any, defaultMessage: string) => {
    const message = error.response?.data?.message || defaultMessage;
    enqueueSnackbar(message, { variant: 'error' });
  };

  const handleAdvanceSubmit = async () => {
    try {
      if (!selectedEmployee) {
        enqueueSnackbar('Please select an employee', { variant: 'warning' });
        return;
      }
      if (advanceForm.amount <= 0) {
        enqueueSnackbar('Advance amount must be greater than 0', { variant: 'warning' });
        return;
      }
      if (!advanceForm.reason) {
        enqueueSnackbar('Please provide a reason for the advance', { variant: 'warning' });
        return;
      }

      await api.post('/advances', {
        employeeId: selectedEmployee,
        ...advanceForm,
        status: 'pending'
      });

      enqueueSnackbar('Advance request submitted', { variant: 'success' });
      resetAdvanceForm();
      await fetchData();
    } catch (error: any) {
      handleApiError(error, 'Failed to submit advance');
    }
  };

  const resetAdvanceForm = () => {
    setOpenAdvanceDialog(false);
    setSelectedEmployee('');
    setAdvanceForm({
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      reason: '',
      employeeName: ''
    });
  };

  const handleRepaymentSubmit = async () => {
    try {
      if (repaymentForm.amount <= 0) {
        enqueueSnackbar('Repayment amount must be greater than 0', { variant: 'warning' });
        return;
      }

      await api.post('/advances/repay', {
        advanceId: repaymentForm.advanceId,
        amount: repaymentForm.amount,
        date: repaymentForm.date
      });

      enqueueSnackbar('Repayment recorded', { variant: 'success' });
      setOpenRepaymentDialog(false);
      setRepaymentForm({ amount: 0, date: new Date().toISOString().split('T')[0], advanceId: '' });
      await fetchData();
    } catch (error: any) {
      handleApiError(error, 'Failed to record repayment');
    }
  };

  const approveAdvance = async (id: string) => {
    try {
      await api.patch(`/advances/${id}`, { status: 'approved' });
      enqueueSnackbar('Advance approved', { variant: 'success' });
      await fetchData();
    } catch (error: any) {
      handleApiError(error, 'Failed to approve advance');
    }
  };

  const rejectAdvance = async (id: string) => {
    try {
      await api.patch(`/advances/${id}`, { status: 'rejected' });
      enqueueSnackbar('Advance rejected', { variant: 'success' });
      await fetchData();
    } catch (error: any) {
      handleApiError(error, 'Failed to reject advance');
    }
  };

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Mobile card view for advances
  const renderMobileCard = (advance: Advance) => {
    const remaining = getRemainingAdvance(advance);
    return (
      <motion.div 
        key={advance._id}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
      >
        <Paper sx={{
          p: 1.5,
          borderRadius: 2,
          boxShadow: theme.shadows[2],
          transition: 'all 0.3s ease'
        }}>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {advance.employeeName || 'Unknown'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {advance.department || '-'}
                </Typography>
              </Box>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                badgeContent={
                  <Box sx={{ 
                    bgcolor: advance.status === 'approved' ? theme.palette.success.main :
                            advance.status === 'pending' ? theme.palette.warning.main :
                            theme.palette.error.main,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: `2px solid ${theme.palette.background.paper}`
                  }} />
                }
              >
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32,
                    bgcolor: theme.palette.primary.main,
                    color: '#fff'
                  }}
                >
                  {advance.employeeName?.charAt(0) || '?'}
                </Avatar>
              </Badge>
            </Box>
            <Divider />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Amount</Typography>
                <Typography>${advance.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Date</Typography>
                <Typography>{format(new Date(advance.date), 'MMM dd, yyyy')}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Chip
                  label={advance.status?.toUpperCase() || 'UNKNOWN'}
                  color={
                    advance.status === 'approved' ? 'success' :
                    advance.status === 'pending' ? 'warning' : 'error'
                  }
                  size="small"
                  sx={{ fontSize: '0.75rem', height: 24 }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Remaining</Typography>
                {remaining > 0 ? (
                  <Typography color="error">${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
                ) : (
                  <Chip 
                    label="PAID" 
                    color="success" 
                    size="small" 
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
              {advance.status === 'pending' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle fontSize="small" />}
                    onClick={() => approveAdvance(advance._id)}
                    size="small"
                    sx={{ 
                      flex: 1,
                      fontSize: '0.7rem',
                      py: 0.5
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Cancel fontSize="small" />}
                    onClick={() => rejectAdvance(advance._id)}
                    size="small"
                    sx={{ 
                      flex: 1,
                      fontSize: '0.7rem',
                      py: 0.5
                    }}
                  >
                    Reject
                  </Button>
                </>
              )}
              {advance.status === 'approved' && remaining > 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AttachMoney fontSize="small" />}
                  onClick={() => {
                    setRepaymentForm(prev => ({
                      ...prev,
                      advanceId: advance._id,
                      amount: remaining
                    }));
                    setOpenRepaymentDialog(true);
                  }}
                  size="small"
                  sx={{ 
                    flex: 1,
                    fontSize: '0.7rem',
                    py: 0.5
                  }}
                >
                  Repay
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<History fontSize="small" />}
                onClick={() => {
                  const employeeId = typeof advance.employeeId === 'string'
                    ? advance.employeeId
                    : advance.employeeId._id;
                  setSelectedHistoryEmployee(employeeId);
                  setOpenHistoryDialog(true);
                }}
                size="small"
                sx={{ 
                  flex: 1,
                  fontSize: '0.7rem',
                  py: 0.5
                }}
              >
                History
              </Button>
            </Box>
          </Stack>
        </Paper>
      </motion.div>
    );
  };

  return (
    <Box sx={{ 
      p: { xs: 1, sm: 2, md: 3 },
      maxWidth: '100%',
      bgcolor: 'background.default',
      borderRadius: 2
    }}>
      {/* Summary Cards */}
      <Grid container spacing={{ xs: 1, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
        {[
          { 
            title: 'Total Advances', 
            value: `$${summaryStats.totalAdvances.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
            icon: <Paid fontSize={isMobile ? 'small' : 'medium'} />, 
            color: theme.palette.primary.main 
          },
          { 
            title: 'Total Repaid', 
            value: `$${summaryStats.totalRepaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
            icon: <MoneyOff fontSize={isMobile ? 'small' : 'medium'} />, 
            color: theme.palette.success.main 
          },
          { 
            title: 'Pending', 
            value: summaryStats.pendingAdvances, 
            icon: <PendingActions fontSize={isMobile ? 'small' : 'medium'} />, 
            color: theme.palette.warning.main 
          },
          { 
            title: 'Rejected', 
            value: summaryStats.rejectedAdvances, 
            icon: <Cancel fontSize={isMobile ? 'small' : 'medium'} />, 
            color: theme.palette.error.main 
          }
        ].map((stat, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <motion.div variants={cardVariants} initial="hidden" animate="visible" whileHover="hover">
              <Paper sx={{ 
                p: { xs: 1, sm: 2 },
                borderRadius: 2,
                bgcolor: stat.color,
                color: '#fff',
                textAlign: 'center',
                boxShadow: theme.shadows[4],
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 1
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                  {stat.icon}
                  <Typography 
                    variant={isMobile ? 'body2' : isTablet ? 'body1' : 'h6'} 
                    sx={{ fontWeight: 600 }}
                  >
                    {stat.title}
                  </Typography>
                </Box>
                <Typography 
                  variant={isMobile ? 'h6' : isTablet ? 'h5' : 'h4'} 
                  sx={{ fontWeight: 700 }}
                >
                  {stat.value}
                </Typography>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Filters and Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Paper sx={{ 
          p: { xs: 1, sm: 2 },
          mb: { xs: 2, sm: 3 },
          borderRadius: 2,
          boxShadow: theme.shadows[2]
        }}>
          <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ 
                    borderRadius: 1,
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    '& .MuiSelect-icon': { fontSize: { xs: '1rem', sm: '1.25rem' } }
                  }}
                  startAdornment={
                    <InputAdornment position="start">
                      <FilterList fontSize={isMobile ? 'small' : 'medium'} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="all" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>All</MenuItem>
                  <MenuItem value="pending" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Pending</MenuItem>
                  <MenuItem value="approved" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Approved</MenuItem>
                  <MenuItem value="rejected" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={8}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={{ xs: 1, sm: 2 }} 
                sx={{ 
                  flexWrap: 'wrap',
                  '& > *': { flexGrow: 1, minWidth: { xs: '100%', sm: 'auto' } }
                }}
              >
                <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                  <Button
                    variant="outlined"
                    startIcon={<CloudDownload fontSize={isMobile ? 'small' : 'medium'} />}
                    onClick={() => handleExport('advances')}
                    fullWidth
                    sx={{ 
                      borderRadius: 1,
                      py: { xs: 0.5, sm: 1 },
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      minHeight: 44
                    }}
                  >
                    {isMobile ? 'Export' : 'Export Data'}
                  </Button>
                </motion.div>
                <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add fontSize={isMobile ? 'small' : 'medium'} />}
                    onClick={() => setOpenAdvanceDialog(true)}
                    fullWidth
                    sx={{ 
                      borderRadius: 1,
                      py: { xs: 0.5, sm: 1 },
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      minHeight: 44
                    }}
                  >
                    {isMobile ? 'Add' : 'New Advance'}
                  </Button>
                </motion.div>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </motion.div>

      {/* Advances Display */}
      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 200,
          bgcolor: 'background.paper',
          borderRadius: 2
        }}>
          <CircularProgress size={isMobile ? 24 : isTablet ? 32 : 40} />
          <Typography variant="body2" sx={{ ml: 2, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Loading...
          </Typography>
        </Box>
      ) : isMobile ? (
        <Stack spacing={1}>
          {paginatedAdvances.length > 0 ? (
            paginatedAdvances.map(advance => renderMobileCard(advance))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No advances found
            </Typography>
          )}
        </Stack>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ 
            borderRadius: 2, 
            boxShadow: theme.shadows[3],
            maxWidth: '100%',
            overflowX: 'auto'
          }}>
            <Table size={isTablet ? 'small' : 'medium'}>
              <TableHead sx={{ bgcolor: theme.palette.grey[100] }}>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column.id} sx={{ 
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                      py: { xs: 1, sm: 1.5 },
                      px: { xs: 1, sm: 2 },
                      fontWeight: 'bold',
                      minWidth: { 
                        employee: 150, 
                        department: 100, 
                        amount: 100, 
                        date: 100, 
                        reason: 150, 
                        status: 100, 
                        remaining: 100 
                      }[column.id] || 80
                    }}>
                      {column.label}
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ 
                    fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                    py: { xs: 1, sm: 1.5 },
                    px: { xs: 1, sm: 2 },
                    fontWeight: 'bold',
                    minWidth: 120
                  }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedAdvances.length > 0 ? (
                  paginatedAdvances.map((advance) => {
                    const remaining = getRemainingAdvance(advance);
                    return (
                      <TableRow 
                        key={advance._id} 
                        hover 
                        sx={{ 
                          '&:hover': { bgcolor: theme.palette.action.hover },
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <TableCell sx={{ 
                          py: { xs: 1, sm: 1.5 }, 
                          px: { xs: 1, sm: 2 }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Badge
                              overlap="circular"
                              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                              badgeContent={
                                <Box sx={{ 
                                  bgcolor: advance.status === 'approved' ? theme.palette.success.main :
                                          advance.status === 'pending' ? theme.palette.warning.main :
                                          theme.palette.error.main,
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  border: `2px solid ${theme.palette.background.paper}`
                                }} />
                              }
                            >
                              <Avatar 
                                sx={{ 
                                  width: { xs: 24, sm: 32 }, 
                                  height: { xs: 24, sm: 32 },
                                  bgcolor: theme.palette.primary.main,
                                  color: '#fff'
                                }}
                              >
                                {advance.employeeName?.charAt(0) || '?'}
                              </Avatar>
                            </Badge>
                            <Box>
                              <Typography sx={{ 
                                fontWeight: 'medium',
                                fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                              }}>
                                {advance.employeeName || 'Unknown'}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="text.secondary" 
                                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                              >
                                {advance.employeePosition || '-'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        {!isMobile && (
                          <TableCell sx={{ 
                            py: { xs: 1, sm: 1.5 }, 
                            fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                          }}>
                            {advance.department || '-'}
                          </TableCell>
                        )}
                        <TableCell sx={{ 
                          py: { xs: 1, sm: 1.5 }, 
                          fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                        }}>
                          <Typography fontWeight="bold">
                            ${advance.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        {!isMobile && (
                          <TableCell sx={{ 
                            py: { xs: 1, sm: 1.5 }, 
                            fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                          }}>
                            {format(new Date(advance.date), 'MMM dd, yyyy')}
                          </TableCell>
                        )}
                        {!isMobile && !isTablet && (
                          <TableCell sx={{ 
                            py: { xs: 1, sm: 1.5 }, 
                            maxWidth: 150,
                            fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                          }}>
                            <Tooltip title={advance.reason}>
                              <Typography noWrap>
                                {advance.reason || '-'}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                        )}
                        <TableCell sx={{ 
                          py: { xs: 1, sm: 1.5 }, 
                          px: { xs: 1, sm: 2 }
                        }}>
                          <Chip
                            label={advance.status?.toUpperCase() || 'UNKNOWN'}
                            color={
                              advance.status === 'approved' ? 'success' :
                              advance.status === 'pending' ? 'warning' : 'error'
                            }
                            size={isTablet ? 'small' : 'medium'}
                            sx={{ 
                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                              height: { xs: 24, sm: 28 }
                            }}
                          />
                        </TableCell>
                        {!isMobile && !isTablet && (
                          <TableCell sx={{ 
                            py: { xs: 1, sm: 1.5 }, 
                            fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                          }}>
                            {remaining > 0 ? (
                              <Typography color="error" fontWeight="bold">
                                ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </Typography>
                            ) : (
                              <Chip 
                                label="PAID" 
                                color="success" 
                                size="medium" 
                                sx={{ fontSize: '0.875rem' }}
                              />
                            )}
                          </TableCell>
                        )}
                        <TableCell align="center" sx={{ 
                          py: { xs: 1, sm: 1.5 }, 
                          px: { xs: 1, sm: 2 }
                        }}>
                          <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} justifyContent="center">
                            {advance.status === 'pending' && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton
                                    size={isTablet ? 'small' : 'medium'}
                                    onClick={() => approveAdvance(advance._id)}
                                    sx={{ 
                                      bgcolor: theme.palette.success.light,
                                      '&:hover': { bgcolor: theme.palette.success.main, color: '#fff' }
                                    }}
                                  >
                                    <CheckCircle fontSize={isTablet ? 'small' : 'medium'} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton
                                    size={isTablet ? 'small' : 'medium'}
                                    onClick={() => rejectAdvance(advance._id)}
                                    sx={{ 
                                      bgcolor: theme.palette.error.light,
                                      '&:hover': { bgcolor: theme.palette.error.main, color: '#fff' }
                                    }}
                                  >
                                    <Cancel fontSize={isTablet ? 'small' : 'medium'} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {advance.status === 'approved' && remaining > 0 && (
                              <Tooltip title="Add Repayment">
                                <IconButton
                                  size={isTablet ? 'small' : 'medium'}
                                  onClick={() => {
                                    setRepaymentForm(prev => ({
                                      ...prev,
                                      advanceId: advance._id,
                                      amount: remaining
                                    }));
                                    setOpenRepaymentDialog(true);
                                  }}
                                  sx={{ 
                                    bgcolor: theme.palette.primary.light,
                                    '&:hover': { bgcolor: theme.palette.primary.main, color: '#fff' }
                                  }}
                                >
                                  <AttachMoney fontSize={isTablet ? 'small' : 'medium'} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="View History">
                              <IconButton
                                size={isTablet ? 'small' : 'medium'}
                                onClick={() => {
                                  const employeeId = typeof advance.employeeId === 'string'
                                    ? advance.employeeId
                                    : advance.employeeId._id;
                                  setSelectedHistoryEmployee(employeeId);
                                  setOpenHistoryDialog(true);
                                }}
                                sx={{ 
                                  bgcolor: theme.palette.info.light,
                                  '&:hover': { bgcolor: theme.palette.info.main, color: '#fff' }
                                }}
                              >
                                <History fontSize={isTablet ? 'small' : 'medium'} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell 
                      colSpan={columns.length + 1} 
                      align="center" 
                      sx={{ py: { xs: 2, sm: 3 }, fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                      No advances found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredAdvances.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ 
              mt: 1,
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
              }
            }}
          />
        </>
      )}

      {/* Repayment History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <Typography 
          variant={isMobile ? 'h6' : isTablet ? 'h5' : 'h4'} 
          fontWeight="bold" 
          sx={{ mt: { xs: 2, sm: 3 }, mb: { xs: 1, sm: 2 } }}
        >
          Repayment History
        </Typography>
        <TableContainer component={Paper} sx={{ 
          borderRadius: 2, 
          boxShadow: theme.shadows[3],
          maxWidth: '100%',
          overflowX: 'auto'
        }}>
          <Table size={isTablet ? 'small' : 'medium'}>
            <TableHead sx={{ bgcolor: theme.palette.grey[100] }}>
              <TableRow>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 1, sm: 2 }
                }}>
                  Employee
                </TableCell>
                {!isMobile && (
                  <TableCell sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                    py: { xs: 1, sm: 1.5 }
                  }}>
                    Department
                  </TableCell>
                )}
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                  py: { xs: 1, sm: 1.5 }
                }}>
                  Amount
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                  py: { xs: 1, sm: 1.5 }
                }}>
                  Date
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                  py: { xs: 1, sm: 1.5 }
                }}>
                  Repaid
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {advances.flatMap(advance =>
                (advance.repayments || []).map((repayment, index) => (
                  <TableRow 
                    key={`${advance._id}-${repayment._id || index}`} 
                    hover
                    sx={{ '&:hover': { bgcolor: theme.palette.action.hover } }}
                  >
                    <TableCell sx={{ 
                      py: { xs: 1, sm: 1.5 }, 
                      px: { xs: 1, sm: 2 }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          sx={{ 
                            width: { xs: 24, sm: 32 }, 
                            height: { xs: 24, sm: 32 },
                            bgcolor: theme.palette.primary.main,
                            color: '#fff'
                          }}
                        >
                          {advance.employeeName?.charAt(0) || '?'}
                        </Avatar>
                        <Box>
                          <Typography sx={{ 
                            fontWeight: 'medium',
                            fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                          }}>
                            {advance.employeeName || 'Unknown'}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                          >
                            {advance.employeePosition || '-'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    {!isMobile && (
                      <TableCell sx={{ 
                        py: { xs: 1, sm: 1.5 }, 
                        fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                      }}>
                        {advance.department || '-'}
                      </TableCell>
                    )}
                    <TableCell sx={{ 
                      py: { xs: 1, sm: 1.5 }, 
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                    }}>
                      ${advance.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell sx={{ 
                      py: { xs: 1, sm: 1.5 }, 
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                    }}>
                      {format(new Date(repayment.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell sx={{ 
                      py: { xs: 1, sm: 1.5 }, 
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                    }}>
                      <Typography fontWeight="bold" color="success.main">
                        ${repayment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {advances.every(advance => !advance.repayments || advance.repayments.length === 0) && (
                <TableRow>
                  <TableCell 
                    colSpan={isMobile ? 3 : 5} 
                    align="center" 
                    sx={{ py: { xs: 2, sm: 3 }, fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    No repayments recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </motion.div>

      {/* Advance Dialog */}
      <Dialog
        open={openAdvanceDialog}
        onClose={resetAdvanceForm}
        fullScreen={isMobile}
        fullWidth
        maxWidth={isTablet ? 'sm' : 'xs'}
        sx={{ '& .MuiDialog-paper': { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ 
          py: 1, 
          bgcolor: theme.palette.primary.main, 
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <AttachMoney fontSize={isMobile ? 'small' : 'medium'} />
          <Typography variant={isMobile ? 'body1' : 'h6'}>New Advance Request</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Autocomplete
              options={employees}
              getOptionLabel={(option) => `${option.name} (${option.position})`}
              getOptionKey={(option) => option._id}
              onChange={(e, value) => {
                setSelectedEmployee(value?._id || '');
                setAdvanceForm({
                  ...advanceForm,
                  employeeName: value?.name || ''
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  margin="dense"
                  label="Select Employee"
                  required
                  fullWidth
                  size={isMobile ? 'small' : 'medium'}
                  placeholder="Search employee..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonSearch fontSize={isMobile ? 'small' : 'medium'} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': { 
                      borderRadius: 1,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }
                  }}
                />
              )}
            />
            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <TextField
                  margin="dense"
                  fullWidth
                  label="Amount"
                  type="number"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({
                    ...advanceForm,
                    amount: parseFloat(e.target.value) || 0
                  })}
                  required
                  size={isMobile ? 'small' : 'medium'}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  error={advanceForm.amount <= 0}
                  sx={{ 
                    '& .MuiInputBase-root': { 
                      borderRadius: 1,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  margin="dense"
                  fullWidth
                  label="Date"
                  type="date"
                  value={advanceForm.date}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ 
                    '& .MuiInputBase-root': { 
                      borderRadius: 1,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  fullWidth
                  label="Reason"
                  value={advanceForm.reason}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                  multiline
                  rows={isMobile ? 2 : 3}
                  required
                  error={!advanceForm.reason}
                  size={isMobile ? 'small' : 'medium'}
                  placeholder="Enter the reason for advance..."
                  sx={{ 
                    '& .MuiInputBase-root': { 
                      borderRadius: 1,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }
                  }}
                />
              </Grid>
            </Grid>
          </motion.div>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button 
              onClick={resetAdvanceForm} 
              color="inherit" 
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: 80,
                borderRadius: 1
              }}
            >
              Cancel
            </Button>
          </motion.div>
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button
              onClick={handleAdvanceSubmit}
              variant="contained"
              color="primary"
              disabled={!selectedEmployee || advanceForm.amount <= 0 || !advanceForm.reason}
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: 80,
                borderRadius: 1
              }}
            >
              Submit
            </Button>
          </motion.div>
        </DialogActions>
      </Dialog>

      {/* Repayment Dialog */}
      <Dialog
        open={openRepaymentDialog}
        onClose={() => setOpenRepaymentDialog(false)}
        fullScreen={isMobile}
        fullWidth
        maxWidth={isTablet ? 'sm' : 'xs'}
        sx={{ '& .MuiDialog-paper': { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ 
          py: 1, 
          bgcolor: theme.palette.primary.main, 
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <AttachMoney fontSize={isMobile ? 'small' : 'medium'} />
          <Typography variant={isMobile ? 'body1' : 'h6'}>Record Repayment</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Grid container spacing={{ xs: 1, sm: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  fullWidth
                  label="Amount"
                  type="number"
                  value={repaymentForm.amount}
                  onChange={(e) => setRepaymentForm({
                    ...repaymentForm,
                    amount: parseFloat(e.target.value) || 0
                  })}
                  required
                  size={isMobile ? 'small' : 'medium'}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  error={repaymentForm.amount <= 0}
                  sx={{ 
                    '& .MuiInputBase-root': { 
                      borderRadius: 1,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  fullWidth
                  label="Date"
                  type="date"
                  value={repaymentForm.date}
                  onChange={(e) => setRepaymentForm({ ...repaymentForm, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ 
                    '& .MuiInputBase-root': { 
                      borderRadius: 1,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }
                  }}
                />
              </Grid>
            </Grid>
          </motion.div>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button 
              onClick={() => setOpenRepaymentDialog(false)} 
              color="inherit" 
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: 80,
                borderRadius: 1
              }}
            >
              Cancel
            </Button>
          </motion.div>
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button
              onClick={handleRepaymentSubmit}
              variant="contained"
              color="primary"
              disabled={repaymentForm.amount <= 0}
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: 80,
                borderRadius: 1
              }}
            >
              Record
            </Button>
          </motion.div>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={openHistoryDialog}
        onClose={() => setOpenHistoryDialog(false)}
        fullScreen={isMobile}
        fullWidth
        maxWidth={isTablet ? 'sm' : 'md'}
        sx={{ '& .MuiDialog-paper': { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ 
          py: 1, 
          bgcolor: theme.palette.info.main, 
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <History fontSize={isMobile ? 'small' : 'medium'} />
          <Typography variant={isMobile ? 'body1' : 'h6'}>Advance History</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Typography 
              variant={isMobile ? 'subtitle1' : isTablet ? 'h6' : 'h5'} 
              sx={{ mt: 1, mb: 2 }}
            >
              Employee ID: {selectedHistoryEmployee}
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: theme.shadows[3] }}>
              <Table size={isTablet ? 'small' : 'medium'}>
                <TableHead sx={{ bgcolor: theme.palette.grey[100] }}>
                  <TableRow>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                      py: { xs: 1, sm: 1.5 }
                    }}>
                      Date
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                      py: { xs: 1, sm: 1.5 }
                    }}>
                      Amount
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                      py: { xs: 1, sm: 1.5 }
                    }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                      py: { xs: 1, sm: 1.5 }
                    }}>
                      Repayments
                    </TableCell>
                    {!isMobile && !isTablet && (
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                        py: { xs: 1, sm: 1.5 }
                      }}>
                        Remaining
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {advances
                    .filter(adv =>
                      typeof adv.employeeId === 'string'
                        ? adv.employeeId === selectedHistoryEmployee
                        : adv.employeeId._id === selectedHistoryEmployee
                    )
                    .map(advance => {
                      const remaining = getRemainingAdvance(advance);
                      return (
                        <React.Fragment key={advance._id}>
                          <TableRow 
                            hover 
                            sx={{ '&:hover': { bgcolor: theme.palette.action.hover } }}
                          >
                            <TableCell sx={{ 
                              py: { xs: 1, sm: 1.5 }, 
                              fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                            }}>
                              {format(new Date(advance.date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell sx={{ 
                              py: { xs: 1, sm: 1.5 }, 
                              fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                            }}>
                              ${advance.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell sx={{ 
                              py: { xs: 1, sm: 1.5 }, 
                              px: { xs: 1, sm: 2 }
                            }}>
                              <Chip
                                label={advance.status?.toUpperCase() || 'UNKNOWN'}
                                color={
                                  advance.status === 'approved' ? 'success' :
                                  advance.status === 'pending' ? 'warning' : 'error'
                                }
                                size={isTablet ? 'small' : 'medium'}
                                sx={{ 
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                  height: { xs: 24, sm: 28 }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ 
                              py: { xs: 1, sm: 1.5 }, 
                              fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                            }}>
                              {advance.repayments?.length || 0} payment(s)
                            </TableCell>
                            {!isMobile && !isTablet && (
                              <TableCell sx={{ 
                                py: { xs: 1, sm: 1.5 }, 
                                fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }
                              }}>
                                {remaining > 0 ? (
                                  <Typography color="error" fontWeight="bold">
                                    ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </Typography>
                                ) : (
                                  <Chip 
                                    label="PAID" 
                                    color="success" 
                                    size="medium" 
                                    sx={{ fontSize: '0.875rem' }}
                                  />
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                          {advance.repayments?.map((repayment, index) => (
                            <TableRow 
                              key={`${advance._id}-repayment-${index}`} 
                              sx={{ bgcolor: theme.palette.grey[50] }}
                            >
                              <TableCell 
                                colSpan={1} 
                                sx={{ 
                                  pl: { xs: 2, sm: 4 }, 
                                  fontStyle: 'italic',
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }}
                              >
                                Repayment #{index + 1}
                              </TableCell>
                              <TableCell 
                                colSpan={isMobile || isTablet ? 3 : 4} 
                                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                              >
                                {format(new Date(repayment.date), 'MMM dd, yyyy')} - 
                                ${repayment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  {advances.filter(adv =>
                    typeof adv.employeeId === 'string'
                      ? adv.employeeId === selectedHistoryEmployee
                      : adv.employeeId._id === selectedHistoryEmployee
                  ).length === 0 && (
                    <TableRow>
                      <TableCell 
                        colSpan={isMobile || isTablet ? 4 : 5} 
                        align="center" 
                        sx={{ py: { xs: 2, sm: 3 }, fontSize: { xs: '0.875rem', sm: '1rem' } }}
                      >
                        No advance history found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </motion.div>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button 
              onClick={() => setOpenHistoryDialog(false)} 
              color="inherit"
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: 80,
                borderRadius: 1
              }}
            >
              Close
            </Button>
          </motion.div>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvanceManagementTab;