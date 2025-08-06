// routes/RawProductRoutes.js
const express = require('express');
const router = express.Router();
const rawProductController = require('../controllers/RawProductController');

router.post('/', rawProductController.createRawProduct);
router.get('/', rawProductController.getRawProducts);
router.put('/:id', rawProductController.updateRawProduct);
router.delete('/:id', rawProductController.deleteRawProduct);

module.exports = router;