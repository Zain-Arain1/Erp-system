"use client";
import React, { useState } from "react";
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
  Chip,
  Menu,
  MenuItem,
  useMediaQuery,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Product from "./product"; // Import the product component

interface Column {
  id: "invoice" | "customer" | "units" | "quantity" | "purchaseprice" | "total" | "date" | "status" | "vendor" | "action";
  label: string;
  minWidth?: number;
  align?: "right" | "left" | "center";
  format?: (value: number) => string;
}

interface Data {
  invoice: number;
  customer: string;
  total: number;
  units: string;
  quantity: number;
  purchaseprice: number;
  paymentStatus: "Paid" | "Overdue" | "Pending";
  date: string; // Added date field
  vendor: string; // Added from field
}

const columns: Column[] = [
  { id: "invoice", label: "#", minWidth: 40, align: "left" },
  { id: "customer", label: "Item", minWidth: 100, align: "left" },
  { id: "units", label: "Units", minWidth: 70, align: "left" },
  {
    id: "quantity",
    label: "Quantity",
    minWidth: 100,
    align: "left",
    format: (value: number) => value.toLocaleString("en-US"),
  },
  {
    id: "purchaseprice",
    label: "Purchase Price",
    minWidth: 100,
    align: "left",
    format: (value: number) => value.toFixed(2),
  },
  {
    id: "total",
    label: "Total",
    minWidth: 120,
    align: "left",
    format: (value: number) => value.toLocaleString("en-US"),
  },
  { id: "date", label: "Date", minWidth: 120, align: "left" },
  { id: "vendor", label: "Vendors", minWidth: 120, align: "left" }, // New column
  { id: "status", label: "status", minWidth: 100, align: "left" },
  { id: "action", label: "Action", minWidth: 100, align: "center" }, // New Action column
];

const initialRows: Data[] = [
  { invoice: 3, customer: "item 1", total: 2500, units: "1kg", quantity: 25, purchaseprice: 100, paymentStatus: "Paid", date: "2023-10-01", vendor: "Company A" },
  { invoice: 2, customer: "item 2", total: 1250, units: "500g", quantity: 25, purchaseprice: 50, paymentStatus: "Overdue", date: "2023-10-02", vendor: "Company B" },
  { invoice: 1, customer: "item 3", total: 625, units: "250g", quantity: 25, purchaseprice: 25, paymentStatus: "Pending", date: "2023-10-03", vendor: "Company C" },
];

const Page = () => {
  const [rows, setRows] = useState<Data[]>(initialRows);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<Data | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<Data | null>(null);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleFormSubmit = (
    customer: string,
    total: number,
    units: string,
    quantity: number,
    purchaseprice: number,
    paymentStatus: "Paid" | "Overdue" | "Pending",
    date: string, // Added date parameter
    vendor: string // Added from parameter
  ) => {
    if (editRow) {
      // Update existing row
      const updatedRows = rows.map((row) =>
        row.invoice === editRow.invoice
          ? { ...row, customer, total, units, quantity, purchaseprice, paymentStatus, date, vendor }
          : row
      );
      setRows(updatedRows);
    } else {
      // Add new row
      const newInvoice = Math.max(...rows.map((row) => row.invoice)) + 1; // Ensure unique invoice number
      const newRow: Data = {
        invoice: newInvoice,
        customer,
        total,
        units,
        quantity,
        purchaseprice,
        paymentStatus,
        date, // Add date to new row
        vendor, // Add from to new row
      };
      setRows([newRow, ...rows]); // Add new row at the start
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
    <div>
      {showForm && (
        <Product
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          initialData={editRow}
        />
      )}

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 440, overflowX: "auto" }}>
          <Table stickyHeader aria-label="sticky table" sx={{ minWidth: isSmallScreen ? 600 : 800 }}>
            <TableHead>
              <TableRow>
                <TableCell colSpan={isSmallScreen ? 2 : 3} align="center">
                  <Typography variant={isSmallScreen ? "h5" : "h3"}>Raw Material</Typography>
                </TableCell>
                <TableCell colSpan={isSmallScreen ? 2 : 3} align="center">
                  <Button variant="contained" size={isSmallScreen ? "small" : "medium"} onClick={() => setShowForm(true)}>
                    Add new 
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
                      display: isSmallScreen && (column.id === "units" || column.id === "purchaseprice") ? "none" : "table-cell",
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
                            display: isSmallScreen && (column.id === "units" || column.id === "purchaseprice") ? "none" : "table-cell",
                          }}
                        >
                          {column.id === "status" ? (
                            <Chip
                              label={row.paymentStatus}
                              color={
                                row.paymentStatus === "Paid"
                                  ? "success"
                                  : row.paymentStatus === "Pending"
                                  ? "warning"
                                  : "error"
                              }
                              size="small"
                            />
                          ) : column.id === "action" ? (
                            <IconButton onClick={(event) => handleMenuClick(event, row)}>
                              <MoreVertIcon />
                            </IconButton>
                          ) : column.format && typeof value === "number" ? (
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
    </div>
  );
};

export default Page;