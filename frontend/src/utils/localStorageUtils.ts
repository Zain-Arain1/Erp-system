import { LocalExpense } from "@/app/(DashboardLayout)/utilities/expenses/expense";

export const saveTempDailyExpense = (expense: LocalExpense): void => {
  try {
    if (expense.amount <= 0) {
      throw new Error('Amount must be positive');
    }
    if (isNaN(new Date(expense.date).getTime())) {
      throw new Error('Invalid date');
    }
    if (!expense.name || !expense.category) {
      throw new Error('Name and category are required');
    }
    const dateKey = new Date(expense.date).toISOString().split('T')[0];
    const key = `erp_tempDailyExpenses_${dateKey}`;
    const existingExpenses: LocalExpense[] = JSON.parse(localStorage.getItem(key) || '[]');
    // Always store integer amount
    existingExpenses.push({ ...expense, amount: Math.round(Number(expense.amount)) });
    localStorage.setItem(key, JSON.stringify(existingExpenses));
  } catch (error) {
    console.error('Error saving temporary daily expense:', error);
    if (error instanceof Error) {
      throw new Error(error.message || 'Failed to save temporary daily expense');
    }
    throw new Error('Failed to save temporary daily expense');
  }
};

export const getTempDailyExpenses = (date: string): LocalExpense[] => {
  try {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format');
    }
    const key = `erp_tempDailyExpenses_${date}`;
    const expenses: LocalExpense[] = JSON.parse(localStorage.getItem(key) || '[]');
    return expenses.map(exp => ({
      ...exp,
      amount: Math.round(Number(exp.amount)), // always integer
      date: typeof exp.date === 'string' ? exp.date : new Date(exp.date).toISOString(),
    }));
  } catch (error) {
    console.error(`Error fetching temporary daily expenses for ${date}:`, error);
    return [];
  }
};

export const clearTempDailyExpenses = (date: string): void => {
  try {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format');
    }
    const key = `erp_tempDailyExpenses_${date}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing temporary daily expenses for ${date}:`, error);
    if (error instanceof Error) {
      throw new Error(error.message || 'Failed to clear temporary daily expenses');
    }
    throw new Error('Failed to clear temporary daily expenses');
  }
};

export const getAllTempExpenseDates = (): string[] => {
  try {
    const dates: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('erp_tempDailyExpenses_')) {
        const date = key.replace('erp_tempDailyExpenses_', '');
        dates.push(date);
      }
    }
    return dates.sort();
  } catch (error) {
    console.error('Error fetching temporary expense dates:', error);
    return [];
  }
};