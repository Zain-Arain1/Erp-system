const mongoose = require('mongoose');

// Product Schema with validation
const ProductSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Product name is required'],
    trim: true 
  },
  quantity: { 
    type: Number, 
    required: [true, 'Quantity is required'], 
    min: [1, 'Quantity must be at least 1'] 
  },
  price: { 
    type: Number, 
    required: [true, 'Price is required'], 
    min: [0, 'Price cannot be negative'] 
  }
}, { _id: false }); // Prevent _id for subdocuments

// Payment History Schema
const PaymentHistorySchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
  method: { type: String, enum: ['Cash', 'CreditCard', 'BankTransfer'] }
}, { _id: false });

// Invoice Schema
const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  date: { type: Date, required: true, default: Date.now },

  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },

  customerDetails: {
    _id: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String }
  },

  dueDate: { type: Date, required: true },
  products: [ProductSchema],
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  paid: { type: Number, default: 0, min: 0 },
  due: { type: Number, required: true, min: 0 },

  status: { 
    type: String, 
    enum: ['Paid', 'Pending', 'Overdue'], 
    default: 'Pending' 
  },

  paymentMethod: { 
    type: String, 
    enum: ['Cash', 'CreditCard', 'BankTransfer'], 
    required: true 
  },

  paymentHistory: [PaymentHistorySchema], // <-- Added field

  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook to generate invoice number if missing
InvoiceSchema.pre('save', async function(next) {
  if (!this.isNew || this.invoiceNumber) return next();
  
  try {
    const lastInvoice = await this.constructor.findOne({}, {}, { sort: { createdAt: -1 } });
    const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber?.split('-')[1]) || 0 : 0;
    this.invoiceNumber = `INV-${(lastNumber + 1).toString().padStart(6, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

// Pre-save hook to recalculate financial fields and status
InvoiceSchema.pre('save', function(next) {
  // Recalculate amounts with precision
  this.subtotal = parseFloat(this.products.reduce((sum, product) => 
    sum + (product.quantity * product.price), 0).toFixed(2));

  this.total = parseFloat((this.subtotal + this.tax - this.discount).toFixed(2));
  this.due = parseFloat((this.total - this.paid).toFixed(2));

  // Update invoice status
  const now = new Date();
  if (this.due <= 0) {
    this.status = 'Paid';
  } else if (this.dueDate && new Date(this.dueDate) < now) {
    this.status = 'Overdue';
  } else {
    this.status = 'Pending';
  }

  this.updatedAt = now;
  next();
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
