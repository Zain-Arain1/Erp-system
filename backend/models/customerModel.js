const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;