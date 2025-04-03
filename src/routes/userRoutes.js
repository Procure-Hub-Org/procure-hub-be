const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController.js');
const { registerValidator } = require('../middleware/userValidator.js');

router.post('/user/register', registerValidator, userController.register);

module.exports = router;