const express = require('express');
const notificationController = require('../controllers/notificationController');
const router = express.Router();

router.get('/notifications/:userId', notificationController.getNotificationsByUserId);

module.exports = router;
