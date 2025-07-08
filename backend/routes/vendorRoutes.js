const express = require('express');
const router = express.Router();
const { 
  createVendor, 
  getVendors,
  updateVendor,
  deleteVendor
} = require('../controllers/vendorController');
const Vendor = require('../models/vendorModels');

// Vendor routes
router.post('/', createVendor);
router.get('/', getVendors);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

// New ledger route
router.get('/:id/ledger', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor.ledger || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;