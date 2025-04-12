const express = require('express');
const router = express.Router();
const buyerTypeController = require('../controllers/buyerTypeController')

router.get('/buyer-types', buyerTypeController.getAllBuyerTypes);
router.post('/buyer-types', buyerTypeController.createBuyerType);

module.exports = router;