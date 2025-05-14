const express = require('express');
const router = express.Router();
const gateOutController = require('../controllers/GateOutControllers');

router.post('/', gateOutController.createGateOutEntry);
router.get('/', gateOutController.getAllGateOutEntries);
router.put('/:id', gateOutController.updateGateOutEntry);
router.delete('/:id', gateOutController.deleteGateOutEntry);

module.exports = router;