const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../../database/models');

// Ruta za dohvat svih zahtjeva za nabavku
router.get('/procurement/requests', verifyToken, async (req, res) => {
  try {
    console.log('Fetching procurement requests...');
    const currentUser = req.user;
    
    let queryOptions = {
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
    };
    
    if (currentUser.role === 'buyer') {
      queryOptions.where = { buyer_id: currentUser.id };
      console.log(`Filtering requests for buyer ID: ${currentUser.id}`);
    } 
    else if (currentUser.role === 'admin' || currentUser.role === 'seller') {
      // ovo ja i Medin trebamo kasnije vidjet tj ubaciti onu njegovu liniju ovdje
      // svakako radimo u istom fajlu
      console.log(`Nije moj task apperently. Ako se treba negdje drugo impl izbrisati ovo`);
    } else {
      return res.status(403).json({ error: 'Unauthorized access to procurement requests' });
    }
    
    const requests = await db.ProcurementRequest.findAll(queryOptions);

    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error fetching procurement requests:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;