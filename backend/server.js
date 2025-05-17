const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

// Import routes
const customerRoutes = require('./routes/customerRoutes');
const gateInRoutes = require('./routes/GateInRoutes');
const gateOutRoutes = require('./routes/GateOutRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const productRoutes = require('./routes/productRoute');
const { transferMonthlyToYearly } = require('./controllers/expenseController');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const expenseRoutes = require('./routes/expenseRoute');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Global error handling middleware
app.use(globalErrorHandler);
// Routes
app.use('/api/customers', customerRoutes);
app.use('/api/gate-in', gateInRoutes);
app.use('/api/gate-out', gateOutRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/products', productRoutes);

app.use('/api/expenses', expenseRoutes);
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
// Schedule task: transfer monthly data to yearly at midnight on the 1st
const scheduleMonthlyTransfer = cron.schedule(
  '0 0 1 * *',
  async () => {
    console.log('Running monthly to yearly transfer at', new Date().toISOString());
    try {
      await transferMonthlyToYearly({}, null, () => {});
    } catch (err) {
      console.error('Monthly transfer failed:', err.message, err.stack);
    }
  },
  {
    scheduled: false,
    timezone: 'UTC',
  }
);

scheduleMonthlyTransfer.start();
// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`🔧 ${signal} received. Shutting down gracefully...`);
  scheduleMonthlyTransfer.stop();
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...', err.name, err.message, err.stack);
  server.close(() => process.exit(1));
});