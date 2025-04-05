const express = require('express');
const controller = require('../controllers/controller');
const db = require('../../database/models'); 
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

// Ovdje je middleware za autentikaciju i autorizaciju
router.patch('/users/:id/approve', verifyToken, isAdmin, controller.approveUser);
router.delete('/users/:id', verifyToken, isAdmin, controller.deleteUser);
router.patch('/users/:id/suspend', verifyToken, isAdmin, controller.suspendUser);

// ispis postojecih usera (također zaštićeno za admine)
router.get('/users', verifyToken, isAdmin, async (req, res) => {
    try {
      // Koristi db.user umjesto db.User
      const users = await db.user.findAll({
        attributes: { exclude: ['password_hash'] }
      });
      res.status(200).json({ users });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: error.message });
    }
  });

module.exports = router;