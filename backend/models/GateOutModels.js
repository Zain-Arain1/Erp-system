const mongoose = require('mongoose');

const gateOutSchema = new mongoose.Schema({
  invoice: { type: Number, required: true, unique: true },
  customer: { type: String, required: true },
  units: { type: String, required: true },
  quantity: { type: Number, required: true },
  saleprice: { type: Number, required: true },
  total: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Overdue', 'Pending'], required: true },
  date: { type: Date, required: true },
  from: { type: String, required: true }, // Changed from 'vendor' to 'from'
}, { timestamps: true });

module.exports = mongoose.model('GateOut', gateOutSchema);