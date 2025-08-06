// models/ProductModel.js
const mongoose = require('mongoose');

const RawproductSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  stock: { type: Number, default: 0, min: 0 },
  category: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RawProduct', RawproductSchema);