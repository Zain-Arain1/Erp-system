import { LocalExpense } from "@/app/(DashboardLayout)/utilities/expenses/expense";
import {
  saveTempDailyExpense,
  getTempDailyExpenses,
  clearTempDailyExpenses,
  getAllTempExpenseDates,
} from '@/utils/localStorageUtils';

export const fetchTempDailyExpenses = async (date: string): Promise<LocalExpense[]> => {
  try {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format');
    }
    return getTempDailyExpenses(date);
  } catch (error) {
    console.error(`Error fetching temporary daily expenses for date ${date}:`, error);
    throw new Error('Failed to fetch temporary daily expenses');
  }
};

export const createExpense = async (expense: Omit<LocalExpense, '_id'>): Promise<LocalExpense> => {
  try {
    if (!expense.name || !expense.category || !expense.date || expense.amount <= 0) {
      throw new Error('Name, category, date, and positive amount are required');
    }
    if (isNaN(new Date(expense.date).getTime())) {
      throw new Error('Invalid date');
    }
    const newExpense: LocalExpense = {
      ...expense,
      amount: Math.round(Number(expense.amount)), // no decimals
      _id: Date.now().toString(),
      yearlyTotal: 0,
    };
    saveTempDailyExpense(newExpense);
    return newExpense;
  } catch (error) {
    console.error('Error creating expense:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create expense');
  }
};

export const updateExpense = async (id: string, updates: Partial<LocalExpense>): Promise<LocalExpense> => {
  try {
    if (updates.amount !== undefined && updates.amount <= 0) {
      throw new Error('Amount must be positive');
    }
    if (updates.date && isNaN(new Date(updates.date).getTime())) {
      throw new Error('Invalid date');
    }
    const dateKey = updates.date
      ? new Date(updates.date).toISOString().split('T')[0]
      : getAllTempExpenseDates().find(date => getTempDailyExpenses(date)?.some(exp => exp._id === id));
    if (!dateKey) throw new Error('Expense date not found');
    const existingExpenses = getTempDailyExpenses(dateKey);
    const updatedExpenses = existingExpenses.map(exp =>
      exp._id === id
        ? { ...exp, ...updates, amount: updates.amount !== undefined ? Math.round(Number(updates.amount)) : exp.amount }
        : exp
    );
    clearTempDailyExpenses(dateKey);
    updatedExpenses.forEach(exp => saveTempDailyExpense(exp));
    const updatedExpense = updatedExpenses.find(exp => exp._id === id);
    if (!updatedExpense) throw new Error('Updated expense not found');
    return updatedExpense;
  } catch (error) {
    console.error(`Error updating expense with ID ${id}:`, error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update expense');
  }
};

export const deleteExpense = async (id: string): Promise<void> => {
  try {
    const dateKey = getAllTempExpenseDates().find(date => getTempDailyExpenses(date)?.some(exp => exp._id === id));
    if (!dateKey) throw new Error('Expense not found');
    const existingExpenses = getTempDailyExpenses(dateKey);
    const updatedExpenses = existingExpenses.filter(exp => exp._id !== id);
    clearTempDailyExpenses(dateKey);
    updatedExpenses.forEach(exp => saveTempDailyExpense(exp));
  } catch (error) {
    console.error(`Error deleting expense with ID ${id}:`, error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete expense');
  }
};

export const fetchMonthlyExpenses = async (params?: { dateRange?: string }): Promise<LocalExpense[]> => {
  try {
    const response = await fetch(`http://localhost:5000/api/expenses/monthly${params?.dateRange ? `?dateRange=${params.dateRange}` : ''}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to fetch monthly expenses');
    }
    // Flatten the grouped monthly response
    const flat: LocalExpense[] = [];
    for (const month of result.data.expenses) {
      if (Array.isArray(month.entries)) {
        for (const entry of month.entries) {
          flat.push({
            _id: month._id + '' + (entry.date || ''), // unique id per day
            amount: Math.round(Number(entry.amount)),
            date: entry.date,
            name: '',
            category: '',
            description: '',
            receipt: false,
            yearlyTotal: 0
          });
        }
      }
    }
    return flat;
  } catch (error) {
    console.error('Error fetching monthly expenses:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch monthly expenses');
  }
};

export const transferDailyExpenses = async (date: string): Promise<{ success: boolean; message: string }> => {
  try {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format');
    }
    const dailyExpenses = getTempDailyExpenses(date);
    if (!dailyExpenses || dailyExpenses.length === 0) {
      return { success: false, message: 'No expenses found for the selected date' };
    }

    const entries = dailyExpenses.map(exp => ({
      amount: Math.round(Number(exp.amount)), // no decimals
      date: new Date(exp.date).toISOString()
    }));

    const response = await fetch('http://localhost:5000/api/expenses/transfer-daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, entries })
    });
    const result = await response.json();

    if (result.status === 'success') {
      clearTempDailyExpenses(date);
      return { success: true, message: 'Transferred to monthly expenses and removed from local storage' };
    } else {
      return { success: false, message: result.message || 'Transfer failed' };
    }
  } catch (error) {
    console.error('Error transferring expenses:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Transfer failed' };
  }
};

export const fetchYearlyExpenses = async (year: number): Promise<LocalExpense[]> => {
  try {
    if (isNaN(year)) {
      throw new Error('Invalid year');
    }
    const response = await fetch(`http://localhost:5000/api/expenses/yearly?year=${year}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to fetch yearly expenses');
    }
    return result.data.expenses.map((exp: any) => ({
      _id: exp._id,
      amount: Math.round(Number(exp.amount)), // no decimals
      date: exp.month ? `${exp.month}-01` : '',
      name: '',
      category: '',
      description: '',
      receipt: false,
      yearlyTotal: 0
    }));
  } catch (error) {
    console.error(`Error fetching yearly expenses for year ${year}:`, error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch yearly expenses');
  }
};