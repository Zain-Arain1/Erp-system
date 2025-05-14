const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const customerRoutes = require('./routes/customerRoutes');
const gateInRoutes = require('./routes/GateInRoutes');
const gateOutRoutes = require('./routes/GateOutRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const productRoutes = require('./routes/productRoute');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/customers', customerRoutes);
app.use('/api/gate-in', gateInRoutes);
app.use('/api/gate-out', gateOutRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/products', productRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected!'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});