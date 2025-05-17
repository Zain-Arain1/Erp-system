const MonthlyExpense = require('../models/monthlyExpenseModel');
const YearlyExpense = require('../models/yearlyExpenseModel');
const { startOfMonth, endOfMonth, startOfYear, endOfYear } = require('date-fns');

const handleError = (res, statusCode, message) => {
  console.error(`Error: ${message}`);
  if (res) return res.status(statusCode).json({ status: 'error', message });
  throw new Error(message);
};

exports.getAllExpenses = async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Use specific endpoints for daily, monthly, or yearly expenses' });
};

exports.createExpense = async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Daily expense saved to localStorage' });
};

exports.updateExpense = async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Update handled by localStorage' });
};

exports.deleteExpense = async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Delete handled by localStorage' });
};

exports.getDailyExpenses = async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Fetch daily expenses from localStorage' });
};

exports.getMonthlyExpenses = async (req, res) => {
  try {
    const query = {};
    if (req.query.dateRange) {
      const [start, end] = req.query.dateRange.split(',').map(d => new Date(d));
      if (isNaN(start) || isNaN(end)) {
        return handleError(res, 400, 'Invalid date range');
      }
      // Find all months that overlap the range
      const startYM = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      const endYM = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;
      query.yearMonth = { $gte: startYM, $lte: endYM };
    }
    const expenses = await MonthlyExpense.find(query).sort({ yearMonth: 1 });
    res.status(200).json({ status: 'success', results: expenses.length, data: { expenses } });
  } catch (err) {
    handleError(res, 500, `Failed to fetch monthly expenses: ${err.message}`);
  }
};

exports.getYearlyExpenses = async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    if (isNaN(year)) {
      return handleError(res, 400, 'Invalid year');
    }
    const expenses = await YearlyExpense.find({ year }).sort({ year: -1 });
    const allEntries = expenses.flatMap(exp =>
      exp.expenses.map(entry => ({
        _id: exp._id,
        amount: entry.amount,
        month: entry.month,
        year: exp.year
      }))
    );
    res.status(200).json({ status: 'success', results: allEntries.length, data: { expenses: allEntries } });
  } catch (err) {
    handleError(res, 500, `Failed to fetch yearly expenses: ${err.message}`);
  }
};

exports.transferDailyToMonthly = async (req, res) => {
  try {
    const { date, entries } = req.body;
    if (!date || !entries || !Array.isArray(entries) || entries.length === 0) {
      return handleError(res, 400, 'Date and valid entries are required');
    }

    // Group and sum entries by date (should be only one date, but support multiple for robustness)
    const dateSums = {};
    for (const entry of entries) {
      if (!entry.amount || typeof entry.amount !== 'number' || entry.amount <= 0) {
        return handleError(res, 400, 'All entries must have a positive amount');
      }
      if (!entry.date || isNaN(new Date(entry.date).getTime())) {
        return handleError(res, 400, 'All entries must have a valid date');
      }
      const dateKey = new Date(entry.date).toISOString().split('T')[0];
      if (!dateSums[dateKey]) dateSums[dateKey] = 0;
      dateSums[dateKey] += entry.amount;
    }

    const upserts = [];
    for (const [dateStr, amount] of Object.entries(dateSums)) {
      const dateObj = new Date(dateStr);
      const yearMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      // Upsert the month, then upsert the entry for the day
      upserts.push(
        MonthlyExpense.findOneAndUpdate(
          { yearMonth, "entries.date": dateObj },
          {
            $set: { "entries.$.amount": amount },
          },
          { new: true }
        ).then(async (doc) => {
          if (!doc) {
            // If not found, push new entry or create new month doc
            return MonthlyExpense.findOneAndUpdate(
              { yearMonth },
              { $push: { entries: { date: dateObj, amount } } },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
          }
          return doc;
        })
      );
    }
    const results = await Promise.all(upserts);

    // --- Always transfer to yearly for the affected month(s) ---
    let autoTransferMessages = [];
    for (const [dateStr] of Object.entries(dateSums)) {
      const dateObj = new Date(dateStr);
      await exports.transferMonthlyToYearlyForMonth(dateObj.getFullYear(), dateObj.getMonth() + 1);
      autoTransferMessages.push(`Auto-transferred monthly expenses for ${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')} to yearly.`);
    }

    res.status(200).json({
      status: 'success',
      message: 'Transferred to monthly expenses' + (autoTransferMessages.length ? ' | ' + autoTransferMessages.join(' ') : ''),
      data: results
    });
  } catch (err) {
    handleError(res, 500, `Failed to transfer daily expenses: ${err.message}`);
  }
};

// Helper for auto-transfer: transfer monthly to yearly for a specific year/month
exports.transferMonthlyToYearlyForMonth = async (year, month) => {
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const monthlyDoc = await MonthlyExpense.findOne({ yearMonth });
  if (!monthlyDoc || !monthlyDoc.entries || monthlyDoc.entries.length === 0) {
    return;
  }
  const monthTotal = monthlyDoc.entries.reduce((sum, entry) => sum + entry.amount, 0);

  let yearlyDoc = await YearlyExpense.findOne({ year });
  if (!yearlyDoc) {
    yearlyDoc = await YearlyExpense.create({
      year,
      expenses: [{ month: yearMonth, amount: monthTotal }]
    });
  } else {
    const existingMonth = yearlyDoc.expenses.find(e => e.month === yearMonth);
    if (existingMonth) {
      existingMonth.amount = monthTotal;
    } else {
      yearlyDoc.expenses.push({ month: yearMonth, amount: monthTotal });
    }
    await yearlyDoc.save();
  }
};

exports.transferMonthlyToYearly = async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1; // 1-based
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

    // Find all monthly expenses for the previous month
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const monthlyDocs = await MonthlyExpense.find({
      date: { $gte: start, $lte: end }
    });

    if (!monthlyDocs || monthlyDocs.length === 0) {
      const message = `No expenses found for ${yearMonth}`;
      if (res) return res.status(200).json({ status: 'success', message });
      console.log(message);
      return;
    }

    // Sum all amounts for the month
    const monthTotal = monthlyDocs.reduce((sum, doc) => sum + doc.amount, 0);

    let yearlyDoc = await YearlyExpense.findOne({ year });
    if (!yearlyDoc) {
      yearlyDoc = await YearlyExpense.create({
        year,
        expenses: [{ month: yearMonth, amount: monthTotal }]
      });
    } else {
      const existingMonth = yearlyDoc.expenses.find(e => e.month === yearMonth);
      if (existingMonth) {
        existingMonth.amount = monthTotal;
      } else {
        yearlyDoc.expenses.push({ month: yearMonth, amount: monthTotal });
      }
      await yearlyDoc.save();
    }

    if (res) {
      res.status(200).json({ status: 'success', message: `Transferred expenses for ${yearMonth} to yearly`, data: yearlyDoc });
    } else {
      console.log(`Transferred expenses for ${yearMonth} to yearly`);
    }
  } catch (err) {
    handleError(res, 500, `Failed to transfer monthly expenses: ${err.message}`);
  }
};

exports.manualTransfer = async (req, res) => {
  try {
    await exports.transferMonthlyToYearly(req, res);
  } catch (err) {
    handleError(res, 500, `Manual transfer failed: ${err.message}`);
  }
};

exports.getExpenseAnalytics = async (req, res) => {
  try {
    const monthlyStats = await MonthlyExpense.aggregate([
      { $unwind: '$expenses' },
      {
        $group: {
          _id: '$yearMonth',
          totalAmount: { $sum: '$expenses.amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    const yearlyStats = await YearlyExpense.aggregate([
      { $unwind: '$expenses' },
      {
        $group: {
          _id: '$year',
          totalAmount: { $sum: '$expenses.amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    res.status(200).json({ status: 'success', data: { monthlyStats, yearlyStats } });
  } catch (err) {
    handleError(res, 500, `Failed to fetch analytics: ${err.message}`);
  }
};

exports.approveExpense = async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Approval not implemented' });
};