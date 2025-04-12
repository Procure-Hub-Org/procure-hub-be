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

// Ruta za filtriranje zahtjeva po kategoriji
router.get('/procurement/requests/category/:categoryId', verifyToken, async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const requests = await db.ProcurementRequest.findAll({
      where: { category_id: categoryId },
      include: [
        {
          model: db.User,
          as: 'buyer',
          attributes: ['id', 'first_name', 'last_name', 'company_name']
        },
        {
          model: db.ProcurementCategory,
          as: 'procurementCategory',
          attributes: ['id', 'name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error fetching procurement requests by category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta za detalje pojedinačnog zahtjeva
router.get('/procurement/requests/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await db.ProcurementRequest.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'buyer',
          attributes: ['id', 'first_name', 'last_name', 'company_name', 'email', 'phone_number']
        },
        {
          model: db.ProcurementCategory,
          as: 'procurementCategory'
        },
        {
          model: db.ProcurementItem,
          as: 'items'
        },
        {
          model: db.Requirement,
          as: 'requirements'
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: 'Procurement request not found' });
    }

    res.status(200).json({ request });
  } catch (error) {
    console.error('Error fetching procurement request details:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;