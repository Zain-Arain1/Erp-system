const Gate = require('../models/GateInModels');

// Create new gate entry
exports.createGateEntry = async (req, res) => {
  try {
    // Find the highest invoice number
    const lastEntry = await Gate.findOne().sort({ invoice: -1 });
    const newInvoice = lastEntry ? lastEntry.invoice + 1 : 1;

    const gateEntry = new Gate({
      ...req.body,
      invoice: newInvoice
    });

    await gateEntry.save();
    res.status(201).json(gateEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
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