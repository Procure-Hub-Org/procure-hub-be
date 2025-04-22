const express = require('express');
const router = express.Router();
const criteriaController = require('../controllers/criteriaController');

router.get('/procurement-criterias', criteriaController.getAllCriteriaTypes);

module.exports = router;
