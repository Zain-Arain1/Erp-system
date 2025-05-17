
'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
} from '@mui/material';
import DailyExpenses from './DailyExpenses';
import MonthlyExpenses from './MonthlyExpenses';
import YearlyExpenses from './YearlyExpenses';

export default function ExpensesPage() {
  const [view, setView] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '1200px', margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom color="primary" sx={{ fontWeight: 'bold', mb: 4 }}>
        Expense Tracker
      </Typography>

      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={view}
          onChange={(e, newValue) => setView(newValue)}
          variant="fullWidth"
          sx={{
            bgcolor: 'background.paper',
            '& .MuiTab-root': { 
              py: 2,
              fontWeight: 'bold',
              color: 'text.secondary',
              '&.Mui-selected': { 
                color: 'primary.main',
                bgcolor: 'primary.light',
              },
              transition: 'all 0.3s ease',
            },
            '& .MuiTabs-indicator': {
              height: 4,
              backgroundColor: 'primary.main',
            },
          }}
        >
          <Tab label="Daily Expenses" value="daily" />
          <Tab label="Monthly Expenses" value="monthly" />
          <Tab label="Yearly Expenses" value="yearly" />
        </Tabs>
      </Paper>

      {view === 'daily' && <DailyExpenses />}
      {view === 'monthly' && <MonthlyExpenses />}
      {view === 'yearly' && <YearlyExpenses />}
    </Box>
  );
}