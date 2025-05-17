const mongoose = require('mongoose');

const dailyEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  }
}, { _id: false });

const monthlyExpenseSchema = new mongoose.Schema({
  yearMonth: {
    type: String,
    required: [true, 'Year-Month is required'],
    match: [/^\d{4}-\d{2}$/, 'yearMonth must be in YYYY-MM format'],
    unique: true
  },
  entries: [dailyEntrySchema]
}, {
  versionKey: false,
  timestamps: false
});

module.exports = mongoose.model('MonthlyExpense', monthlyExpenseSchema);