const mongoose = require('mongoose');

const gateSchema = new mongoose.Schema({
  invoice: { type: Number, required: true, unique: true },
  customer: { type: String, required: true },
  units: { type: String, required: true },
  quantity: { type: Number, required: true },
  purchaseprice: { type: Number, required: true },
  total: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Overdue', 'Pending'], required: true },
  date: { type: Date, required: true },
  vendor: { type: String, required: true },
}, { timestamps: true });

// Explicitly set collection name to 'gateins'
module.exports = mongoose.model('GateIn', gateSchema, 'gateins');