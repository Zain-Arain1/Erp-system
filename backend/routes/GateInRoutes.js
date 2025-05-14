const express = require('express');
const router = express.Router();
const gateController = require('../controllers/GateInControllers');

// Gate routes
router.post('/', gateController.createGateEntry);
router.get('/', gateController.getAllGateEntries);
router.put('/:id', gateController.updateGateEntry);
router.delete('/:id', gateController.deleteGateEntry);

module.exports = router;