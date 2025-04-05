const db = require('../../database/models');
const User = db.User;
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');

exports.register = async (req, res) => {
  try {
    // Validacija unesenih podataka
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      first_name,
      last_name,
      role,
      company_name,
      phone_number,
      address,
      company_address
    } = req.body;

    // Provjera da li korisnik sa istim mailom vec postoji
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        error: 'Email already registered'
      });
    }

    // Hesiranje passworda koristeci bcrypt
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Kreiranje novog korisnika
    const user = await User.create({
      email,
      password_hash,
      first_name,
      last_name,
      role,
      company_name,
      phone_number,
      address,
      company_address,
      status: 'pending' 
    });

    // Uklanjanje hashiranog passworda iz JSON odgovora
    const userResponse = user.toJSON();
    delete userResponse.password_hash;

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};