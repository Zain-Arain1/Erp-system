const { Employee, Salary, Advance, Attendance } = require('../models/HRMModels');
const mongoose = require('mongoose');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs').promises;
const path = require('path');

// Utility function to create CSV writer
const createCsvWriterInstance = (filename, headers) => {
  return createCsvWriter({
    path: path.join('temp', filename),
    header: headers
  });
};

// Employee Controller
exports.getEmployees = async (req, res) => {
  try {
    const { sortBy = 'joinDate', sortDirection = 'desc', search, status } = req.query;
    const query = {};
    
    if (search) query.$text = { $search: search };
    // Only add status to query if explicitly provided
    if (status) query.status = status;

    const employees = await Employee.find(query)
      .sort({ [sortBy]: sortDirection === 'asc' ? 1 : -1 })
      .select('-__v')
      .lean();

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employees', error: error.message });
  }
};
exports.createEmployee = async (req, res) => {
  try {
    console.log('Full incoming request:', {
      body: req.body,
      headers: req.headers,
      params: req.params
    });
 const { name, position, department, basicSalary, contact, status } = req.body;
    const email = req.body.email ? req.body.email.toLowerCase().trim() : undefined;

    // Validate required fields with detailed errors
    const errors = {};
    if (!name) errors.name = { message: 'Name is required' };
    if (!position) errors.position = { message: 'Position is required' };
    if (!department) errors.department = { message: 'Department is required' };
    if (!basicSalary) errors.basicSalary = { message: 'Basic salary is required' };
    if (!contact) errors.contact = { message: 'Contact number is required' };

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    // Email validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = { message: 'Invalid email format' };
    }

    // Contact validation
    if (!/^[0-9]{10,15}$/.test(contact)) {
      errors.contact = { message: 'Contact must be 10-15 digits' };
    } else {
      // Contact uniqueness check
      const existingContact = await Employee.findOne({ contact });
      if (existingContact) {
        errors.contact = { message: 'Contact number already exists' };
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }
    console.log('Creating employee with:', {
      name,
      position,
      department,
      basicSalary,
      contact,
      status,
      email
    });
    const employee = new Employee({
      name,
      position,
      department,
      basicSalary,
      email,
      contact,
      status: status || 'active',
      joinDate: req.body.joinDate || new Date()
    });
    console.log('Employee document before save:', employee);
    await employee.save();
    res.status(201).json(employee);
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      errors: error.errors,
      code: error.code,
      keyPattern: error.keyPattern, // For duplicate key errors
      keyValue: error.keyValue
    });
    console.error('Employee creation error:', error);
    res.status(400).json({
      message: 'Failed to create employee',
      error: error.message,
      errors: error.errors
    });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, contact } = req.body;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (contact && !/^[0-9]{10,15}$/.test(contact)) {
      return res.status(400).json({ message: 'Invalid contact number format' });
    }

    const employee = await Employee.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update employee', error: error.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findByIdAndUpdate(
      id,
      { status: 'inactive', updatedAt: new Date() },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: 'Employee deactivated successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete employee', error: error.message });
  }
};

exports.exportEmployees = async (req, res) => {
  try {
    // Ensure temp directory exists
    await fs.mkdir('temp', { recursive: true });

    const employees = await Employee.find().lean();

    const csvWriter = createCsvWriter({
      path: path.join('temp', 'employees.csv'),
      header: [
        { id: 'name', title: 'Name' },
        { id: 'position', title: 'Position' },
        { id: 'department', title: 'Department' },
        { id: 'basicSalary', title: 'Basic Salary' },
        { id: 'email', title: 'Email' },
        { id: 'contact', title: 'Contact' },
        { id: 'status', title: 'Status' },
        { id: 'joinDate', title: 'Join Date' }
      ]
    });

    await csvWriter.writeRecords(employees.map(emp => ({
      ...emp,
      joinDate: new Date(emp.joinDate).toLocaleDateString()
    })));

    res.download(path.join('temp', 'employees.csv'), 'employees_export.csv', async (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      try {
        await fs.unlink(path.join('temp', 'employees.csv'));
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      message: 'Failed to export employees',
      error: error.message
    });
  }

};
exports.checkContact = async (req, res) => {
  try {
    const { contact } = req.query;
    const employee = await Employee.findOne({ contact });
    res.json({
      exists: !!employee,
      employeeId: employee?._id
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking contact', error: error.message });
  }
};

// Salary Controller
// Update the getSalaries controller
// In HRMController.js - getSalaries
exports.getSalaries = async (req, res) => {
  try {
    const { month, year, sortBy = 'createdAt', sortDirection = 'desc' } = req.query;
    const query = {};

    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const salaries = await Salary.find(query)
      .populate('employeeId', 'name position department avatar contact email')
      .sort({ [sortBy]: sortDirection === 'asc' ? 1 : -1 })
      .lean();

    // Map the results to include employee details directly
    const formattedSalaries = salaries.map(salary => ({
      ...salary,
      _id: salary._id,
      employeeId: salary.employeeId?._id,
      employeeName: salary.employeeId?.name || 'Unknown',
      employeePosition: salary.employeeId?.position || '-',
      employeeAvatar: salary.employeeId?.avatar,
      department: salary.employeeId?.department || '-',
      employeeContact: salary.employeeId?.contact,
      employeeEmail: salary.employeeId?.email
    }));

    res.json(formattedSalaries);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch salaries', error: error.message });
  }
};

exports.createSalary = async (req, res) => {
  try {
    const { employeeId, month, year, allowances, deductions, bonuses } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({ message: 'Employee ID, month, and year are required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const existingSalary = await Salary.findOne({ employeeId, month, year });
    if (existingSalary) {
      return res.status(400).json({ message: 'Salary record already exists for this month' });
    }

    const netSalary = employee.basicSalary + Number(allowances) - Number(deductions) + Number(bonuses);

    const salary = new Salary({
      employeeId,
      month: parseInt(month),
      year: parseInt(year),
      basicSalary: employee.basicSalary,
      allowances: Number(allowances) || 0,
      deductions: Number(deductions) || 0,
      bonuses: Number(bonuses) || 0,
      netSalary
    });

    await salary.save();
    res.status(201).json(salary);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create salary record', error: error.message });
  }
};

exports.createBulkSalaries = async (req, res) => {
  try {
    const { employees, month, year, allowances, deductions, bonuses } = req.body;

    if (!employees?.length || !month || !year) {
      return res.status(400).json({ message: 'Employees list, month, and year are required' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const results = [];
      for (const employeeId of employees) {
        const employee = await Employee.findById(employeeId).session(session);
        if (!employee) continue;

        const existingSalary = await Salary.findOne({ employeeId, month, year }).session(session);
        if (existingSalary) continue;

        const netSalary = employee.basicSalary + Number(allowances) - Number(deductions) + Number(bonuses);

        const salary = new Salary({
          employeeId,
          month: parseInt(month),
          year: parseInt(year),
          basicSalary: employee.basicSalary,
          allowances: Number(allowances) || 0,
          deductions: Number(deductions) || 0,
          bonuses: Number(bonuses) || 0,
          netSalary
        });

        await salary.save({ session });
        results.push(salary);
      }

      await session.commitTransaction();
      res.status(201).json({
        message: 'Bulk salary records created successfully',
        createdCount: results.length,
        records: results
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(400).json({ message: 'Failed to create bulk salaries', error: error.message });
  }
};

exports.updateSalaryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const salary = await Salary.findByIdAndUpdate(
      id,
      {
        status,
        ...(status === 'paid' && { paymentDate: new Date() }),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    res.json(salary);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update salary status', error: error.message });
  }
};

exports.exportSalaries = async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = {};

    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const salaries = await Salary.find(query)
      .populate('employeeId', 'name position')
      .lean();

    const csvWriter = createCsvWriterInstance('salaries.csv', [
      { id: 'employeeName', title: 'Employee Name' },
      { id: 'position', title: 'Position' },
      { id: 'month', title: 'Month' },
      { id: 'year', title: 'Year' },
      { id: 'basicSalary', title: 'Basic Salary' },
      { id: 'allowances', title: 'Allowances' },
      { id: 'deductions', title: 'Deductions' },
      { id: 'bonuses', title: 'Bonuses' },
      { id: 'netSalary', title: 'Net Salary' },
      { id: 'status', title: 'Status' },
      { id: 'paymentDate', title: 'Payment Date' }
    ]);

    await csvWriter.writeRecords(salaries.map(salary => ({
      employeeName: salary.employeeId?.name || 'Unknown',
      position: salary.employeeId?.position || '-',
      ...salary,
      paymentDate: salary.paymentDate ? new Date(salary.paymentDate).toLocaleDateString() : '-'
    })));

    res.download(path.join('temp', 'salaries.csv'), 'salaries.csv', async (err) => {
      if (err) {
        res.status(500).json({ message: 'Failed to download file' });
      }
      await fs.unlink(path.join('temp', 'salaries.csv')).catch(() => { });
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to export salaries', error: error.message });
  }
};

// Advance Controller
exports.getAdvances = async (req, res) => {
  try {
    const advances = await Advance.find()
      .populate('employeeId', 'name position department avatar')
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

    // Format the response to include employee details directly
    const formattedAdvances = advances.map(advance => ({
      ...advance,
      employeeName: advance.employeeId?.name || 'Unknown',
      employeePosition: advance.employeeId?.position || '-',
      department: advance.employeeId?.department || '-',
      employeeAvatar: advance.employeeId?.avatar
    }));

    res.json(formattedAdvances);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch advances', error: error.message });
  }
};
exports.createAdvance = async (req, res) => {
  try {
    const { employeeId, amount, date, reason } = req.body;

    if (!employeeId || !amount || !reason) {
      return res.status(400).json({ message: 'Employee ID, amount, and reason are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const advance = new Advance({
      employeeId,
      amount: Number(amount),
      date: date || new Date(),
      reason,
      status: 'pending'
    });

    await advance.save();
    res.status(201).json(advance);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create advance', error: error.message });
  }
};

exports.updateAdvanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const advance = await Advance.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate('employeeId', 'name position')
      .select('-__v');

    if (!advance) {
      return res.status(404).json({ message: 'Advance not found' });
    }

    res.json(advance);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update advance status', error: error.message });
  }
};

exports.addRepayment = async (req, res) => {
  try {
    const { advanceId, amount, date } = req.body;

    if (!advanceId || !amount) {
      return res.status(400).json({ message: 'Advance ID and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Repayment amount must be greater than 0' });
    }

    const advance = await Advance.findById(advanceId);
    if (!advance) {
      return res.status(404).json({ message: 'Advance not found' });
    }

    const totalRepaid = advance.repayments.reduce((sum, r) => sum + r.amount, 0);
    if (totalRepaid + Number(amount) > advance.amount) {
      return res.status(400).json({ message: 'Repayment amount exceeds remaining balance' });
    }

    advance.repayments.push({
      amount: Number(amount),
      date: date || new Date()
    });

    await advance.save();
    res.json(advance);
  } catch (error) {
    res.status(400).json({ message: 'Failed to add repayment', error: error.message });
  }
};

exports.exportAdvances = async (req, res) => {
  try {
    const advances = await Advance.find()
      .populate('employeeId', 'name position')
      .lean();

    const csvWriter = createCsvWriterInstance('advances.csv', [
      { id: 'employeeName', title: 'Employee Name' },
      { id: 'amount', title: 'Amount' },
      { id: 'date', title: 'Date' },
      { id: 'reason', title: 'Reason' },
      { id: 'status', title: 'Status' },
      { id: 'remaining', title: 'Remaining' }
    ]);

    await csvWriter.writeRecords(advances.map(advance => ({
      employeeName: advance.employeeId?.name || 'Unknown',
      amount: advance.amount.toFixed(2),
      date: new Date(advance.date).toLocaleDateString(),
      reason: advance.reason,
      status: advance.status,
      remaining: (advance.amount - advance.repayments.reduce((sum, r) => sum + r.amount, 0)).toFixed(2)
    })));

    res.download(path.join('temp', 'advances.csv'), 'advances.csv', async (err) => {
      if (err) {
        res.status(500).json({ message: 'Failed to download file' });
      }
      await fs.unlink(path.join('temp', 'advances.csv')).catch(() => { });
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to export advances', error: error.message });
  }
};

// Attendance Controller
// In HRMController.js
exports.getAttendances = async (req, res) => {
  try {
    const { month, year, sortBy = 'date', sortDirection = 'desc' } = req.query;
    const query = {};

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { 
        $gte: startDate, 
        $lte: new Date(endDate.setHours(23, 59, 59, 999))
      };
    }

    const attendances = await Attendance.find(query)
      .populate('employeeId', 'name position department')
      .sort({ [sortBy]: sortDirection === 'asc' ? 1 : -1 })
      .lean();

    // Format the response to include employee details
    const formattedAttendances = attendances.map(att => ({
      ...att,
      _id: att._id.toString(),
      employeeId: att.employeeId?._id.toString(),
      employeeName: att.employeeId?.name || 'Unknown',
      department: att.employeeId?.department || '-'
    }));

    res.json(formattedAttendances);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to fetch attendances', 
      error: error.message 
    });
  }
};

exports.createAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, notes } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({ message: 'Employee ID, date, and status are required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const attendanceDate = new Date(date);
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
        $lte: new Date(attendanceDate.setHours(23, 59, 59, 999))
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already recorded for this date' });
    }

    const attendance = new Attendance({
      employeeId,
      date: new Date(date),
      status,
      checkIn: checkIn ? new Date(`${date}T${checkIn}`) : undefined,
      checkOut: checkOut ? new Date(`${date}T${checkOut}`) : undefined,
      notes
    });

    await attendance.save();
    res.status(201).json(attendance);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create attendance record', error: error.message });
  }
};

exports.createBulkAttendances = async (req, res) => {
  try {
    const { employees, date, status, checkIn, checkOut, notes } = req.body;

    if (!employees?.length || !date || !status) {
      return res.status(400).json({ message: 'Employees list, date, and status are required' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const results = [];
      const attendanceDate = new Date(date);

      for (const employeeId of employees) {
        const employee = await Employee.findById(employeeId).session(session);
        if (!employee) continue;

        const existingAttendance = await Attendance.findOne({
          employeeId,
          date: {
            $gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
            $lte: new Date(attendanceDate.setHours(23, 59, 59, 999))
          }
        }).session(session);

        if (existingAttendance) continue;

        const attendance = new Attendance({
          employeeId,
          date: new Date(date),
          status,
          checkIn: checkIn ? new Date(`${date}T${checkIn}`) : undefined,
          checkOut: checkOut ? new Date(`${date}T${checkOut}`) : undefined,
          notes
        });

        await attendance.save({ session });
        results.push(attendance);
      }

      await session.commitTransaction();
      res.status(201).json({
        message: 'Bulk attendance records created successfully',
        createdCount: results.length,
        records: results
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(400).json({ message: 'Failed to create bulk attendances', error: error.message });
  }
};

exports.exportAttendances = async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = {};

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendances = await Attendance.find(query)
      .populate('employeeId', 'name position')
      .lean();

    const csvWriter = createCsvWriterInstance('attendances.csv', [
      { id: 'employeeName', title: 'Employee Name' },
      { id: 'position', title: 'Position' },
      { id: 'date', title: 'Date' },
      { id: 'status', title: 'Status' },
      { id: 'checkIn', title: 'Check In' },
      { id: 'checkOut', title: 'Check Out' },
      { id: 'notes', title: 'Notes' }
    ]);

    await csvWriter.writeRecords(attendances.map(att => ({
      employeeName: att.employeeId?.name || 'Unknown',
      position: att.employeeId?.position || '-',
      date: new Date(att.date).toLocaleDateString(),
      status: att.status,
      checkIn: att.checkIn ? new Date(att.checkIn).toLocaleTimeString() : '-',
      checkOut: att.checkOut ? new Date(att.checkOut).toLocaleTimeString() : '-',
      notes: att.notes || '-'
    })));

    res.download(path.join('temp', 'attendances.csv'), 'attendances.csv', async (err) => {
      if (err) {
        res.status(500).json({ message: 'Failed to download file' });
      }
      await fs.unlink(path.join('temp', 'attendances.csv')).catch(() => { });
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to export attendances', error: error.message });
  }
};
let departmentCache = [
  'HR',
  'Finance',
  'Engineering',
  'Marketing',
  'Sales',
  'Operations',
  'Customer Support'
];

exports.getDepartments = async (req, res) => {
  try {
    res.json(departmentCache);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch departments', error: error.message });
  }
};

exports.addDepartment = async (req, res) => {
  try {
    const { department } = req.body;
    
    if (!department) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    if (departmentCache.includes(department)) {
      return res.status(400).json({ message: 'Department already exists' });
    }

    departmentCache = [...departmentCache, department];
    res.status(201).json({ message: 'Department added successfully', department });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add department', error: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    // Check if any employees are in this department
    const employeesInDept = await Employee.countDocuments({ department });
    if (employeesInDept > 0) {
      return res.status(400).json({
        message: `Cannot delete department with ${employeesInDept} employee(s). Reassign them first.`
      });
    }

    departmentCache = departmentCache.filter(d => d !== department);
    res.json({ 
      message: 'Department deleted successfully',
      department 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to delete department', 
      error: error.message 
    });
  }
};