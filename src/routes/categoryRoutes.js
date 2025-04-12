const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

router.get('/procurement-categories', categoryController.getAllProcurementCategories);

module.exports = router;
