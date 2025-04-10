const db = require('../../database/models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); 
const config = require('../config/auth');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Attempting login for:', email);
    
    // Traži korisnika po emailu - koristi db.User
    const user = await db.User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // SIGURNO POREĐENJE LOZINKI POMOĆU bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Provjeri da li je korisnik suspendovan
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended' });
    }
    
    console.log('JWT Secret:', config.jwtSecret);
    
    // Kreiraj token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};