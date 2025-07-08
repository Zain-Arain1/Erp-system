const express = require('express');
const {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  exportEmployees,
  getSalaries,
  createSalary,
  createBulkSalaries,
  updateSalaryStatus,
  exportSalaries,
  getAdvances,
  createAdvance,
  updateAdvanceStatus,
  addRepayment,
  exportAdvances,
  getAttendances,
  createAttendance,
  createBulkAttendances,
  exportAttendances,
  checkContact,
  getDepartments,
  addDepartment,
  deleteDepartment
} = require('../controllers/HRMController');

const router = express.Router();

// Employee Routes
router.get('/employees', getEmployees);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);
router.get('/employees/export', exportEmployees);
router.get('/employees/check-contact', checkContact);
// Salary Routes
router.get('/salaries', getSalaries);
router.post('/salaries', createSalary);
router.post('/salaries/bulk', createBulkSalaries);
router.patch('/salaries/:id', updateSalaryStatus);
router.get('/salaries/export', exportSalaries);

// Advance Routes
router.get('/advances', getAdvances);
router.post('/advances', createAdvance);
router.patch('/advances/:id', updateAdvanceStatus);
router.post('/advances/repay', addRepayment);
router.get('/advances/export', exportAdvances);

// Attendance Routes
router.get('/attendances', getAttendances);
router.post('/attendances', createAttendance);
router.post('/attendances/bulk', createBulkAttendances);
router.get('/attendances/export', exportAttendances);

// HRMRoutes.js
router.get('/departments', getDepartments);
router.post('/departments', addDepartment);
router.delete('/departments/:department', deleteDepartment);
module.exports = router;
