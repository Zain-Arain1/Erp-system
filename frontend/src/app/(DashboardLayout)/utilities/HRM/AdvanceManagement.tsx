"use client";
import React, { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Chip, Avatar, CircularProgress,
  Tooltip, Autocomplete, Grid, InputAdornment, Divider, Card, CardHeader,
  CardContent, TableContainer, TablePagination, useTheme
} from '@mui/material';
import {
  PersonSearch, CloudDownload, Add, CheckCircle, Cancel,
  AttachMoney, History, Paid, PendingActions, MoneyOff, FilterList
} from '@mui/icons-material';
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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { enqueueSnackbar } = useSnackbar();

  const getRemainingAdvance = (advance: Advance) => {
    const totalRepaid = advance.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
    return advance.amount - totalRepaid;
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter advances based on status
  const filteredAdvances = advances.filter(adv => {
    if (statusFilter === 'all') return true;
    return adv.status === statusFilter;
  });

  const paginatedAdvances = filteredAdvances.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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

      await api.post('/advances', {
        employeeId: selectedEmployee,
        ...advanceForm,
        status: 'pending'
      });

      enqueueSnackbar('Advance request submitted successfully', { variant: 'success' });
      resetAdvanceForm();
      await fetchData();
    } catch (error: any) {
      console.error('Error submitting advance:', error);
      enqueueSnackbar(error.response?.data?.message || 'Failed to submit advance request', {
        variant: 'error',
        autoHideDuration: 3000
      });
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

      enqueueSnackbar('Repayment recorded successfully', { variant: 'success' });
      setOpenRepaymentDialog(false);
      setRepaymentForm({ amount: 0, date: new Date().toISOString().split('T')[0], advanceId: '' });
      await fetchData();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to record repayment', {
        variant: 'error'
      });
    }
  };

  const approveAdvance = async (id: string) => {
    try {
      await api.patch(`/advances/${id}`, { status: 'approved' });
      enqueueSnackbar('Advance approved successfully', { variant: 'success' });
      await fetchData();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to approve advance', {
        variant: 'error'
      });
    }
  };

  const rejectAdvance = async (id: string) => {
    try {
      await api.patch(`/advances/${id}`, { status: 'rejected' });
      enqueueSnackbar('Advance rejected successfully', { variant: 'success' });
      await fetchData();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to reject advance', {
        variant: 'error'
      });
    }
  };

  // Calculate summary statistics
  const totalAdvances = advances.reduce((sum, advance) => sum + advance.amount, 0);
  const totalRepaid = advances.reduce((sum, advance) =>
    sum + (advance.repayments?.reduce((repSum, repayment) => repSum + repayment.amount, 0) || 0), 0);
  const pendingAdvances = advances.filter(a => a.status === 'pending').length;
  const rejectedAdvances = advances.filter(a => a.status === 'rejected').length;

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardHeader
              title="Total Advances"
              avatar={<Paid color="primary" />}
            />
            <CardContent>
              <Typography variant="h4" color="primary">
                ${totalAdvances.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All approved advances
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardHeader
              title="Total Repaid"
              avatar={<MoneyOff color="success" />}
            />
            <CardContent>
              <Typography variant="h4" color="success.main">
                ${totalRepaid.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Amount repaid by employees
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardHeader
              title="Pending Requests"
              avatar={<PendingActions color="warning" />}
            />
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {pendingAdvances}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Advances awaiting approval
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardHeader
              title="Rejected Requests"
              avatar={<Cancel color="error" />}
            />
            <CardContent>
              <Typography variant="h4" color="error.main">
                {rejectedAdvances}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rejected advance requests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Advance Management
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setStatusFilter(statusFilter === 'all' ? 'pending' : statusFilter === 'pending' ? 'approved' : statusFilter === 'approved' ? 'rejected' : 'all')}
            sx={{ textTransform: 'none' }}
          >
            {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={() => handleExport('advances')}
            sx={{ textTransform: 'none' }}
          >
            Export Data
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenAdvanceDialog(true)}
            sx={{ textTransform: 'none' }}
          >
            New Advance Request
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Paper sx={{ mb: 4, borderRadius: 2, boxShadow: theme.shadows[1] }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: theme.palette.grey[100] }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Remaining</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedAdvances.map((advance: Advance) => {
                    const remaining = getRemainingAdvance(advance);
                    return (
                      <TableRow key={advance._id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar src={advance.employeeAvatar || undefined}>
                              {advance.employeeName?.charAt(0) || '?'}
                            </Avatar>
                            <Box>
                              <Typography fontWeight="medium">
                                {advance.employeeName || 'Unknown Employee'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {advance.employeePosition || '-'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography>{advance.department || '-'}</Typography>
                        </TableCell>

                        <TableCell>${advance.amount.toFixed(2)}</TableCell>
                        <TableCell>{format(new Date(advance.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Tooltip title={advance.reason}>
                            <Typography noWrap>
                              {advance.reason}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={advance.status}
                            color={
                              advance.status === 'approved' ? 'success' :
                                advance.status === 'pending' ? 'warning' :
                                  'error'
                            }
                            size="small"
                            variant={advance.status === 'approved' ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell>
                          {remaining > 0 ? (
                            <Typography color="error" fontWeight="medium">
                              ${remaining.toFixed(2)}
                            </Typography>
                          ) : (
                            <Chip label="Paid" color="success" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            {advance.status === 'pending' && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton
                                    onClick={() => approveAdvance(advance._id)}
                                    color="success"
                                    size="small"
                                  >
                                    <CheckCircle fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton
                                    onClick={() => rejectAdvance(advance._id)}
                                    color="error"
                                    size="small"
                                  >
                                    <Cancel fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {advance.status === 'approved' && remaining > 0 && (
                              <Tooltip title="Add Repayment">
                                <IconButton
                                  onClick={() => {
                                    setRepaymentForm(prev => ({
                                      ...prev,
                                      advanceId: advance._id,
                                      amount: remaining
                                    }));
                                    setOpenRepaymentDialog(true);
                                  }}
                                  size="small"
                                >
                                  <AttachMoney fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="View History">
                              <IconButton
                                onClick={() => {
                                  const employeeId = typeof advance.employeeId === 'string'
                                    ? advance.employeeId
                                    : advance.employeeId._id;
                                  setSelectedHistoryEmployee(employeeId);
                                  setOpenHistoryDialog(true);
                                }}
                                size="small"
                              >
                                <History fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
            />
          </Paper>

          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Repayment History
          </Typography>
          <Paper sx={{ borderRadius: 2, boxShadow: theme.shadows[1] }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: theme.palette.grey[100] }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Advance Amount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Repayment Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Repayment Amount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Remaining</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {advances.flatMap(advance =>
                    (advance.repayments || []).map((repayment, index) => {
                      const repaidUpToNow = (advance.repayments || [])
                        .slice(0, index + 1)
                        .reduce((sum, r) => sum + r.amount, 0);
                      const remainingAfterThis = advance.amount - repaidUpToNow;

                      return (
                        <TableRow key={`${advance._id}-${repayment._id || index}`}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar src={advance.employeeAvatar || undefined}>
                                {advance.employeeName?.charAt(0) || '?'}
                              </Avatar>
                              <Typography>
                                {advance.employeeName || 'Unknown'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{advance.department || '-'}</TableCell>
                          <TableCell>${advance.amount.toFixed(2)}</TableCell>
                          <TableCell>{format(new Date(repayment.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>${repayment.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            {remainingAfterThis > 0 ? (
                              <Typography color="error">
                                ${remainingAfterThis.toFixed(2)}
                              </Typography>
                            ) : (
                              <Chip label="Paid" color="success" size="small" variant="outlined" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* Advance Dialog */}
      <Dialog
        open={openAdvanceDialog}
        onClose={resetAdvanceForm}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white' }}>
          New Advance Request
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
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
                margin="normal"
                label="Select Employee"
                required
                fullWidth
                placeholder="Search employee..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonSearch />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Amount"
                type="number"
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm({
                  ...advanceForm,
                  amount: parseFloat(e.target.value) || 0
                })}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                error={advanceForm.amount <= 0}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Date"
                type="date"
                value={advanceForm.date}
                onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="normal"
                fullWidth
                label="Reason"
                value={advanceForm.reason}
                onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                multiline
                rows={3}
                required
                error={!advanceForm.reason}
                placeholder="Enter the reason for advance..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={resetAdvanceForm}
            variant="outlined"
            sx={{ borderRadius: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdvanceSubmit}
            variant="contained"
            disabled={!selectedEmployee || advanceForm.amount <= 0 || !advanceForm.reason}
            sx={{ borderRadius: 1 }}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Repayment Dialog */}
      <Dialog
        open={openRepaymentDialog}
        onClose={() => setOpenRepaymentDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white' }}>
          Record Repayment
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Amount"
                type="number"
                value={repaymentForm.amount}
                onChange={(e) => setRepaymentForm({
                  ...repaymentForm,
                  amount: parseFloat(e.target.value) || 0
                })}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                error={repaymentForm.amount <= 0}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="normal"
                fullWidth
                label="Date"
                type="date"
                value={repaymentForm.date}
                onChange={(e) => setRepaymentForm({ ...repaymentForm, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setOpenRepaymentDialog(false)}
            variant="outlined"
            sx={{ borderRadius: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRepaymentSubmit}
            variant="contained"
            disabled={repaymentForm.amount <= 0}
            sx={{ borderRadius: 1 }}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={openHistoryDialog}
        onClose={() => setOpenHistoryDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white' }}>
          Advance History for Employee
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
            History for employee ID: {selectedHistoryEmployee}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: theme.palette.grey[100] }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Remaining</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Repayments</TableCell>
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
                        <TableRow hover>
                          <TableCell>{format(new Date(advance.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>${advance.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip
                              label={advance.status}
                              color={
                                advance.status === 'approved' ? 'success' :
                                  advance.status === 'pending' ? 'warning' :
                                    'error'
                              }
                              size="small"
                              variant={advance.status === 'approved' ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell>
                            {remaining > 0 ? (
                              <Typography color="error">
                                ${remaining.toFixed(2)}
                              </Typography>
                            ) : (
                              <Chip label="Paid" color="success" size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>
                            {advance.repayments?.length || 0} payment(s)
                          </TableCell>
                        </TableRow>
                        {advance.repayments?.map((repayment, index) => (
                          <TableRow key={`${advance._id}-repayment-${index}`} sx={{ bgcolor: theme.palette.grey[50] }}>
                            <TableCell colSpan={1} sx={{ pl: 4, fontStyle: 'italic' }}>
                              Repayment #{index + 1}
                            </TableCell>
                            <TableCell colSpan={4}>
                              {format(new Date(repayment.date), 'MMM dd, yyyy')} -
                              ${repayment.amount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenHistoryDialog(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvanceManagementTab;