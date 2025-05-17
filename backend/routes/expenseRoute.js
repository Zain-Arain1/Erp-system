const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

const logRoute = (method, path) => {
  console.log(`Registering ${method} route: ${path}`);
  return (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${method} ${path} called`);
    next();
  };
};

router.get('/', logRoute('GET', '/'), expenseController.getAllExpenses);
router.post('/', logRoute('POST', '/'), expenseController.createExpense);
router.patch('/:id', logRoute('PATCH', '/:id'), expenseController.updateExpense);
router.delete('/:id', logRoute('DELETE', '/:id'), expenseController.deleteExpense);

router.get('/daily', logRoute('GET', '/daily'), expenseController.getDailyExpenses);
router.get('/monthly', logRoute('GET', '/monthly'), expenseController.getMonthlyExpenses);
router.get('/yearly', logRoute('GET', '/yearly'), expenseController.getYearlyExpenses);

router.post('/transfer-daily', logRoute('POST', '/transfer-daily'), expenseController.transferDailyToMonthly);
router.post('/transfer-monthly', logRoute('POST', '/transfer-monthly'), expenseController.transferMonthlyToYearly);
router.post('/manual-transfer', logRoute('POST', '/manual-transfer'), expenseController.manualTransfer);

router.get('/analytics', logRoute('GET', '/analytics'), expenseController.getExpenseAnalytics);
router.patch('/approve/:id', logRoute('PATCH', '/approve/:id'), expenseController.approveExpense);

module.exports = router;
