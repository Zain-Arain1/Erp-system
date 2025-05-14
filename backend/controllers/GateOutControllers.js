const GateOut = require('../models/GateOutModels');

exports.createGateOutEntry = async (req, res) => {
  try {
    const lastEntry = await GateOut.findOne().sort({ invoice: -1 });
    const newInvoice = lastEntry ? lastEntry.invoice + 1 : 1;

    const gateOutEntry = new GateOut({
      ...req.body,
      invoice: newInvoice
    });

    await gateOutEntry.save();
    res.status(201).json(gateOutEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllGateOutEntries = async (req, res) => {
  try {
    const entries = await GateOut.find().sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateGateOutEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await GateOut.findByIdAndUpdate(id, req.body, { new: true });
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteGateOutEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await GateOut.findByIdAndDelete(id);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};