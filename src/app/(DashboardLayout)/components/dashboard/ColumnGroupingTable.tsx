"use client";
import React, { useState } from 'react';

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Button,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  Box,
  Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import InvoiceForm from './InvoiceForm'; // Import the InvoiceForm component

interface Column {
  id: 'invoice' | 'customer' | 'total' | 'due' | 'paidamount' | 'action';
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: number) => string;
  hideOnSmall?: boolean; // Add this property to hide columns on small screens
}

interface Data {
  invoice: number;
  customer: string;
  total: number;
  due: number;
  paidamount: number;
}

const columns: Column[] = [
  { id: 'invoice', label: 'Invoice no', minWidth: 100, hideOnSmall: true },
  { id: 'customer', label: 'Customer', minWidth: 140 },
  {
    id: 'total',
    label: 'Total',
    minWidth: 120,
    align: 'left',
    format: (value: number) => value.toLocaleString('en-US'),
    hideOnSmall: true,
  },
  {
    id: 'due',
    label: 'Due',
    minWidth: 100,
    align: 'left',
    format: (value: number) => value.toLocaleString('en-US'),
    hideOnSmall: true,
  },
  {
    id: 'paidamount',
    label: 'Paid',
    minWidth: 140,
    align: 'left',
    format: (value: number) => value.toFixed(2),
  },
  {
    id: 'action',
    label: 'Action',
    minWidth: 100,
    align: 'center',
  },
];

const initialRows: Data[] = [
  { invoice: 3, customer: 'IN', total: 1324171354, due: 3287263, paidamount: 1324171354 - 3287263 },
  { invoice: 2, customer: 'CN', total: 1403500365, due: 9596961, paidamount: 1403500365 - 9596961 },
  { invoice: 1, customer: 'IT', total: 60483973, due: 301340, paidamount: 60483973 - 301340 },
];

export default function ColumnGroupingTable() {
  const [rows, setRows] = useState<Data[]>(initialRows);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<Data | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<Data | null>(null);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleFormSubmit = (customer: string, total: number, due: number, paid: number) => {
    if (editRow) {
      // Update existing row
      const updatedRows = rows.map((row) =>
        row.invoice === editRow.invoice
          ? { ...row, customer, total, due, paidamount: paid }
          : row
      );
      setRows(updatedRows);
    } else {
      // Add new row
      const newRow: Data = {
        invoice: rows.length + 1,
        customer,
        total,
        due,
        paidamount: paid,
      };
      setRows([newRow, ...rows]);
    }
    setShowForm(false);
    setEditRow(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditRow(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, row: Data) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleEdit = () => {
    if (selectedRow) {
      setEditRow(selectedRow);
      setShowForm(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedRow) {
      const updatedRows = rows.filter((row) => row.invoice !== selectedRow.invoice);
      setRows(updatedRows);
    }
    handleMenuClose();
  };

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      {showForm && (
        <InvoiceForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          initialData={editRow}
        />
      )}

      <Paper sx={{ width: '100%', overflowX: 'auto' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography variant="h3">Recent Invoices</Typography>
                </TableCell>
                <TableCell colSpan={3} align="center">
                  <Button variant="contained" onClick={() => setShowForm(true)}>
                    Create New
                  </Button>
                </TableCell>
              </TableRow>

              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{
                      top: 57,
                      minWidth: column.minWidth,
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.common.white,
                      display: isSmallScreen && column.hideOnSmall ? 'none' : 'table-cell',
                    }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {rows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.invoice}>
                    {columns.map((column) => {
                      const value = row[column.id as keyof Data];
                      return (
                        <TableCell
                          key={column.id}
                          align={column.align}
                          style={{
                            display: isSmallScreen && column.hideOnSmall ? 'none' : 'table-cell',
                          }}
                        >
                          {column.id === 'action' ? (
                            <IconButton onClick={(e) => handleMenuClick(e, row)}>
                              <MoreVertIcon />
                            </IconButton>
                          ) : column.format && typeof value === 'number' ? (
                            column.format(value)
                          ) : (
                            value
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 100]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleDelete}>Delete</MenuItem>
      </Menu>
    </Box>
  );
}