const Gate = require('../models/GateInModels');
const moment = require('moment-timezone');

// Set timezone to Pakistan
moment.tz.setDefault('Asia/Karachi');

// Create new gate entry
exports.createGateEntry = async (req, res) => {
  try {
    // Validate request body
    if (!req.body.items || !Array.isArray(req.body.items)) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    // Find the highest invoice number
    const lastEntry = await Gate.findOne().sort({ invoiceNumber: -1 });
    let newInvoiceNumber = 1000; // Default starting number
    
    if (lastEntry && lastEntry.invoiceNumber) {
      newInvoiceNumber = lastEntry.invoiceNumber + 1;
    }

    // Calculate total amount
    const totalAmount = req.body.items.reduce((sum, item) => {
      return sum + (Number(item.total) || 0);
    }, 0);

    const gateEntry = new Gate({
      ...req.body,
      invoiceNumber: newInvoiceNumber,
      totalAmount,
      date: moment().toDate()
    });

    // Explicitly set invoice to undefined to avoid null
    gateEntry.invoice = undefined;

    await gateEntry.save();
    res.status(201).json(gateEntry);
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key error specifically
      return res.status(400).json({ 
        message: 'Invoice number conflict. Please try again.',
        error: error.message 
      });
    }
    res.status(400).json({ 
      message: 'Error creating gate entry',
      error: error.message 
    });
  }
};

// Get all gate entries
exports.getAllGateEntries = async (req, res) => {
  try {
    const entries = await Gate.find().sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single gate entry
exports.getGateEntry = async (req, res) => {
  try {
    const entry = await Gate.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update gate entry
exports.updateGateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await Gate.findByIdAndUpdate(id, req.body, { new: true });
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Add payment to gate entry
exports.addPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await Gate.findById(id);
    
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    entry.payments.push(req.body);
    
    // Update payment status
    const totalPaid = entry.payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (totalPaid >= entry.totalAmount) {
      entry.paymentStatus = 'Paid';
    } else if (totalPaid > 0) {
      entry.paymentStatus = 'Partial';
    } else {
      entry.paymentStatus = 'Pending';
    }

    await entry.save();
    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete gate entry
exports.deleteGateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await Gate.findByIdAndDelete(id);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};