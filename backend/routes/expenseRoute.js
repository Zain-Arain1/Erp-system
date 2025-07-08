const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

// Removed logRoute wrapper to eliminate console logs

router.get('/', expenseController.getAllExpenses);
router.post('/', expenseController.createExpense);
router.patch('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

router.get('/daily', expenseController.getDailyExpenses);
router.get('/monthly', expenseController.getMonthlyExpenses);
router.get('/yearly', expenseController.getYearlyExpenses);

router.post('/transfer-daily', expenseController.transferDailyToMonthly);
router.post('/transfer-monthly', expenseController.transferMonthlyToYearly);
router.post('/manual-transfer', expenseController.manualTransfer);

router.get('/analytics', expenseController.getExpenseAnalytics);
router.patch('/approve/:id', expenseController.approveExpense);

module.exports = router;
