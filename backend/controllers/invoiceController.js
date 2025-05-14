const mongoose = require('mongoose');
const Invoice = require('../models/InvoiceModels');
const Customer = require('../models/customerModel'); // ✅ Import Customer model

// Validation middleware
const validateInvoiceInput = (req, res, next) => {
  const { customer, products, paymentMethod } = req.body;

  if (!customer || !mongoose.Types.ObjectId.isValid(customer)) {
    return res.status(400).json({ message: 'Valid customer ID is required' });
  }

  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: 'At least one product is required' });
  }

  if (!paymentMethod || !['Cash', 'Credit Card', 'Bank Transfer'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Valid payment method is required' });
  }

  next();
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ];
    }

    const invoices = await Invoice.find(query)
      .populate('customer', 'name email phone address')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const processedInvoices = invoices.map(invoice => ({
      ...invoice,
      customerDetails: invoice.customer ? {
        _id: invoice.customer._id,
        name: invoice.customer.name,
        email: invoice.customer.email,
        phone: invoice.customer.phone,
        address: invoice.customer.address
      } : null
    }));

    const count = await Invoice.countDocuments(query);

    res.json({
      invoices: processedInvoices,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer', 'name email phone address');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get invoices by customer ID
// @route   GET /api/invoices/customer/:customerId
// @access  Private
const getInvoicesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const invoices = await Invoice.find({
      $or: [
        { customer: customerId },
        { 'customerDetails._id': customerId }
      ]
    })
      .sort({ date: -1 })
      .lean();

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res) => {
  try {
    const invoiceDate = req.body.date ? new Date(req.body.date) : new Date();
    if (isNaN(invoiceDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : new Date(invoiceDate);
    if (isNaN(dueDate.getTime())) {
      return res.status(400).json({ message: 'Invalid due date format' });
    }

    const subtotal = parseFloat(req.body.products.reduce((sum, product) =>
      sum + (product.quantity * product.price), 0).toFixed(2));

    const tax = parseFloat((req.body.tax || 0).toFixed(2));
    const discount = parseFloat((req.body.discount || 0).toFixed(2));
    const paid = parseFloat((req.body.paid || 0).toFixed(2));

    const total = parseFloat((subtotal + tax - discount).toFixed(2));
    const due = parseFloat((total - paid).toFixed(2));

    if (paid > total) {
      return res.status(400).json({ message: 'Paid amount cannot exceed total amount' });
    }

    const customerDoc = await Customer.findById(req.body.customer);
    if (!customerDoc) {
      return res.status(400).json({ message: 'Customer not found' });
    }

    const invoice = new Invoice({
      ...req.body,
      date: invoiceDate,
      dueDate,
      subtotal,
      tax,
      discount,
      total,
      paid,
      due,
      status: due <= 0 ? 'Paid' : dueDate < new Date() ? 'Overdue' : 'Pending',
      customerDetails: {
        _id: customerDoc._id,
        name: customerDoc.name,
        email: customerDoc.email,
        phone: customerDoc.phone,
        address: customerDoc.address
      }
    });

    await invoice.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name email phone address')
      .lean();

    res.status(201).json({
      ...populatedInvoice,
      id: populatedInvoice._id,
      _id: undefined
    });
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
const updateInvoice = async (req, res) => {
  try {
    const {
      customer,
      dueDate,
      products,
      paymentMethod,
      notes,
      paid,
      tax,
      discount
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid invoice ID' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const subtotal = products
      ? products.reduce((sum, product) => sum + (product.quantity * product.price), 0)
      : invoice.subtotal;

    const updatedTax = tax !== undefined ? tax : invoice.tax;
    const updatedDiscount = discount !== undefined ? discount : invoice.discount;
    const updatedPaid = paid !== undefined ? paid : invoice.paid;

    const total = subtotal + updatedTax - updatedDiscount;
    const due = total - updatedPaid;

    const updatedDueDate = dueDate ? new Date(dueDate) : invoice.dueDate;
    const status = due <= 0
      ? 'Paid'
      : updatedDueDate < new Date()
      ? 'Overdue'
      : 'Pending';

    // If customer is updated, also update customerDetails
    if (customer && customer !== invoice.customer.toString()) {
      const updatedCustomer = await Customer.findById(customer);
      if (!updatedCustomer) {
        return res.status(400).json({ message: 'Customer not found' });
      }
      invoice.customerDetails = {
        _id: updatedCustomer._id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        address: updatedCustomer.address
      };
    }

    invoice.customer = customer || invoice.customer;
    invoice.dueDate = updatedDueDate;
    invoice.products = products || invoice.products;
    invoice.subtotal = subtotal;
    invoice.tax = updatedTax;
    invoice.discount = updatedDiscount;
    invoice.total = total;
    invoice.paid = updatedPaid;
    invoice.due = due;
    invoice.status = status;
    invoice.paymentMethod = paymentMethod || invoice.paymentMethod;
    invoice.notes = notes || invoice.notes;

    await invoice.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name email phone address');

    res.json(populatedInvoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await Invoice.findByIdAndDelete(req.params.id); 


    res.json({ message: 'Invoice removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add payment to invoice
// @route   POST /api/invoices/:id/payments
// @access  Private
const addPayment = async (req, res) => {
  try {
    const { amount } = req.body;

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be positive' });
    }

    if (amount > invoice.due) {
      return res.status(400).json({ message: 'Payment amount exceeds due amount' });
    }

    // Initialize paymentHistory array if it doesn't exist
    invoice.paymentHistory = invoice.paymentHistory || [];
    
    // Add payment to history
    invoice.paymentHistory.push({
      amount: amount,
      date: new Date(),
      method: invoice.paymentMethod
    });

    invoice.paid += amount;
    invoice.due = invoice.total - invoice.paid;

    if (invoice.due <= 0) {
      invoice.status = 'Paid';
    } else if (new Date(invoice.dueDate) < new Date()) {
      invoice.status = 'Overdue';
    } else {
      invoice.status = 'Pending';
    }

    await invoice.save();

    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  getInvoicesByCustomer, // ✅ NEW EXPORT ADDED
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addPayment,
  validateInvoiceInput
};