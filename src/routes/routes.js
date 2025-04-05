const express = require('express');
const controller = require('../controllers/controller');
const { User } = require('../../database/models'); 
const router = express.Router();

router.patch('/users/:id/approve', controller.approveUser);
router.delete('/users/:id', controller.deleteUser);
router.patch('/users/:id/suspend', controller.suspendUser);

// ispis postojecih usera
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] }
    });
    res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;