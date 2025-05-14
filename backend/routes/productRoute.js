const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.route('/')
  .get(productController.getProducts)
  .post(productController.createProduct); // Removed `protect`, `admin`

router.route('/:id')
  .get(productController.getProductById)
  .put(productController.updateProduct)    // Removed `protect`, `admin`
  .delete(productController.deleteProduct); // Removed `protect`, `admin`

module.exports = router;