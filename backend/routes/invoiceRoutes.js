const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
router.get('/customer/:customerId', invoiceController.getInvoicesByCustomer);
// Routes for invoices
router.route('/')
  .get(invoiceController.getInvoices)
  .post(invoiceController.createInvoice);

router.route('/:id')
  .get(invoiceController.getInvoiceById)
  .put(invoiceController.updateInvoice)
  .delete(invoiceController.deleteInvoice);

router.route('/:id/payments')
  .post(invoiceController.addPayment);

// New route: Get all invoices for a specific customer
router.get('/customer/:customerId', async (req, res) => {
  // const Invoice = require('../models/invoiceModel'); // import Invoice model here

  try {
    const { customerId } = req.params;
    const invoices = await Invoice.find({
      $or: [
        { customer: customerId },
        { 'customerDetails._id': customerId }
      ]
    }).sort({ date: -1 });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ PDF route has been removed

module.exports = router;
