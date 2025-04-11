const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../../database/models');

// Ruta za dohvat svih zahtjeva za nabavku
router.get('/procurement/requests', verifyToken, async (req, res) => {
  try {
    const requests = await db.ProcurementRequest.findAll({
      include: [
        {
          model: db.User,
          as: 'buyer',
          attributes: ['id', 'first_name', 'last_name', 'company_name', 'email']
        },
        {
          model: db.ProcurementCategory,
          as: 'procurementCategory',
          attributes: ['id', 'name']
        },
        {
          model: db.ProcurementItem,
          as: 'items',
          attributes: ['id', 'title', 'quantity']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error fetching procurement requests:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/procurement/requests/category/:categoryId', verifyToken, async (req, res) => {
    try {
      const { category_id } = req.params;
      
      const requests = await db.ProcurementRequest.findAll({
        where: { category_id },
        include: [
          {
            model: db.User,
            as: 'buyers',
            attributes: ['id', 'first_name', 'last_name', 'company_name']
          },
          {
            model: db.ProcurementCategory,
            as: 'procurementCategory',
            attributes: ['id', 'name']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
  
      res.status(200).json({ requests });
    } catch (error) {
      console.error('Error fetching procurement requests by category:', error);
      res.status(500).json({ error: error.message });
    }
  });
  

module.exports = router;