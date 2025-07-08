const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

// Import routes
const vendorRoutes = require('./routes/vendorRoutes');
const gateInRoutes = require('./routes/GateInRoutes');
const gateOutRoutes = require('./routes/GateOutRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const productRoutes = require('./routes/productRoute');
const customerRoutes = require('./routes/customerRoutes');
const { transferMonthlyToYearly } = require('./controllers/expenseController');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const expenseRoutes = require('./routes/expenseRoute');
const hrmRoutes = require('./routes/HRMRoutes');

const app = express();

// ✅ Fixed CORS setup
const corsOptions = {
  origin: ['http://localhost:3000', process.env.FRONTEND_URL],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Optional but safe

app.use(express.json());

// Request ID and logger middleware
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substring(2, 9);
  console.log(`Incoming ${req.method} request ${req.requestId} to: ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api/vendors', vendorRoutes);
app.use('/api/gate-in', gateInRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/gate-out', gateOutRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/hrm', hrmRoutes);

// Global error handler
app.use(globalErrorHandler);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Cron job for monthly transfer
const scheduleMonthlyTransfer = cron.schedule(
  '0 0 1 * *',
  async () => {
    try {
      await transferMonthlyToYearly({}, null, () => {});
    } catch (err) {
      console.error('Monthly transfer failed:', err);
    }
  },
  {
    scheduled: false,
    timezone: 'UTC',
  }
);

scheduleMonthlyTransfer.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  scheduleMonthlyTransfer.stop();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  scheduleMonthlyTransfer.stop();
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
