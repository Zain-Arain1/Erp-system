'use client';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow, 
  TableContainer, 
  Paper, 
  IconButton 
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { LocalExpense } from './expense';

interface ExpenseTableProps {
  expenses: LocalExpense[];
  onEdit: (expense: LocalExpense) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseTable({ expenses, onEdit, onDelete }: ExpenseTableProps) {
  return (
    <TableContainer component={Paper} elevation={3}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: (theme) => theme.palette.grey[100] }}>
            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Amount</TableCell>
            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Receipt</TableCell>
            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {expenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                No expenses found
              </TableCell>
            </TableRow>
          ) : (
            expenses.map((expense) => (
              <TableRow key={expense._id} hover>
                <TableCell>{expense.name}</TableCell>
                <TableCell>{(expense.date instanceof Date ? expense.date : new Date(expense.date)).toLocaleDateString()}</TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell>{expense.description || '-'}</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>{Math.round(expense.amount)}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>{expense.receipt ? 'Yes' : 'No'}</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <IconButton onClick={() => onEdit(expense)} color="primary">
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => onDelete(expense._id)} color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}