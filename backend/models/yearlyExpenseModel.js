const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  amount: { 
    type: Number, 
    required: [true, 'Amount is required'], 
    min: [0.01, 'Amount must be positive']
  },
  month: { 
    type: String, 
    required: [true, 'Month is required'], 
    match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format']
  }
}, { _id: false });

const yearlyExpenseSchema = new mongoose.Schema({
  year: { 
    type: Number, 
    required: [true, 'Year is required'] 
  },
  expenses: [entrySchema]
}, {
  versionKey: false,
  timestamps: false,
  indexes: [{ key: { year: 1 } }]
});

module.exports = mongoose.model('Yearly Expenses', yearlyExpenseSchema);