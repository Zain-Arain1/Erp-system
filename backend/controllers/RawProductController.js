// controllers/RawProductController.js
const RawProduct = require('../models/RawProductModel');

exports.createRawProduct = async (req, res) => {
  try {
    const rawProduct = new RawProduct(req.body);
    await rawProduct.save();
    res.status(201).json(rawProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getRawProducts = async (req, res) => {
  try {
    const rawProducts = await RawProduct.find().sort({ name: 1 });
    res.json(rawProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRawProduct = async (req, res) => {
  try {
    const rawProduct = await RawProduct.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    if (!rawProduct) {
      return res.status(404).json({ message: 'Raw product not found' });
    }
    res.json(rawProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteRawProduct = async (req, res) => {
  try {
    const rawProduct = await RawProduct.findByIdAndDelete(req.params.id);
    if (!rawProduct) {
      return res.status(404).json({ message: 'Raw product not found' });
    }
    res.json({ message: 'Raw product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};