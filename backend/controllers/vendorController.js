const Vendor = require('../models/vendorModels');

exports.createVendor = async (req, res) => {
  try {
    // Check for existing vendor with same email or phone
    const existingVendor = await Vendor.findOne({
      $or: [
        { email: req.body.email },
        { phone: req.body.phone }
      ]
    });

    if (existingVendor) {
      return res.status(400).json({ 
        error: 'Vendor with this email or phone already exists' 
      });
    }

    const newVendor = new Vendor(req.body);
    const savedVendor = await newVendor.save();
    res.status(201).json(savedVendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// In vendorController.js
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 }).lean();
    
    // Explicitly transform the data
    const response = vendors.map(v => ({
      id: v._id.toString(), // Explicitly convert to string
      name: v.name,
      email: v.email,
      phone: v.phone,
      address: v.address,
      status: v.status,
      company: v.company || '',
      createdAt: v.createdAt,
      updatedAt: v.updatedAt
    }));
    
    res.json(response);
  } catch (error) {
    console.error('Error in getVendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if another vendor has the same email or phone
    const existingVendor = await Vendor.findOne({
      $and: [
        { _id: { $ne: id } },
        { $or: [
          { email: req.body.email },
          { phone: req.body.phone }
        ]}
      ]
    });

    if (existingVendor) {
      return res.status(400).json({ 
        error: 'Another vendor with this email or phone already exists' 
      });
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    
    if (!updatedVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.status(200).json(updatedVendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedVendor = await Vendor.findByIdAndDelete(id);
    
    if (!deletedVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.status(200).json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};