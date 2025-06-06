const jwt = require('jsonwebtoken');
const db = require('../../database/models');
const config = require('../config/auth');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, config.jwtSecret);
    req.userId = decoded.id;
    
    // Provjeri da li korisnik još uvijek postoji
    const user = await db.User.findByPk(req.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Sačuvaj informacije o korisniku za kasniju upotrebu
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin rights required.' });
  }
  next();
};

module.exports = { verifyToken, isAdmin };
