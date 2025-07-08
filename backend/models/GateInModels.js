const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  method: { type: String, enum: ['Cash', 'Bank Transfer', 'Cheque', 'Other'], required: true },
  reference: { type: String },
});

const itemSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Item name is required'] },
  units: { type: String, required: [true, 'Units are required'] },
  quantity: { 
    type: Number, 
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0'] 
  },
  purchasePrice: { 
    type: Number, 
    required: [true, 'Price is required'],
    min: [0.01, 'Price must be greater than 0'] 
  },
  total: { 
    type: Number, 
    required: [true, 'Total is required'],
    min: [0, 'Total cannot be negative'] 
  },
});

const gateSchema = new mongoose.Schema({
  invoiceNumber: { 
    type: Number, 
    required: true, 
    unique: true,
    index: true 
  },
  items: [itemSchema],
  vendor: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Partial', 'Pending'], required: true },
  date: { type: Date, required: true, default: Date.now },
  payments: [paymentSchema],
}, { 
  timestamps: true,
  validateBeforeSave: true 
});

// Remove any existing index on 'invoice' if it's not needed
gateSchema.index({ invoice: 1 }, { unique: false });

// Set timezone to Pakistan
gateSchema.pre('save', function(next) {
  if (!this.date) {
    this.date = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  }
  next();
});

module.exports = mongoose.model('GateIn', gateSchema, 'gateins');