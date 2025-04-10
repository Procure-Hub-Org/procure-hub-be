const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../../database/models');
console.log("User", db);

const createUserByAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not authorized to create users' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email, password, first_name, last_name,
      role, company_name, phone_number, address, company_address
    } = req.body;
    //validacija broja telefona
    if (!/^\+(\d{1,3})\s?(\d{1,15})(\s?\d{1,15})*$/.test(phone_number)) {
        return res.status(400).json({ error: 'Phone number is not in the correct format' });
    }
    //validacija password-a
    if (
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/\d/.test(password) ||
        !/[\W_]/.test(password)
      ) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long, contain one uppercase letter, one number, and one special character'
        });
      }
      //provjera ispravnosti email formata
    if (email && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    //provjera da li korisnik vec postoji 
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const newUser = await db.User.create({
      email,
      password_hash,
      first_name,
      last_name,
      role,
      company_name: company_name !== undefined ? company_name : null,
      phone_number: phone_number !== undefined ? phone_number : null,
      address: address !== undefined ? address : null,
      company_address: company_address !== undefined ? company_address : null,
      status: 'pending', //po potrebe izmijeniti i ovo ukoliko admin moze odma status mijenjati
      created_at: new Date()
    });
    return res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUserByAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not authorized to update users' });
    }
    const userId = req.params.id;
    const {
      email, first_name, last_name, role,
      company_name, phone_number, address, company_address
    } = req.body;

    console.log('userId:', userId);
    const user = await db.User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    /*
    //provjera da li su poslani neki drugi parametrni -> izmijeniti po potrebi
    const allowedFields = ['role'];
    const invalidFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      return res.status(400).json({ error: `You cannot update the following fields: ${invalidFields.join(', ')}` });
    }
    //provjera da li je polje role ispravno
    if (role && !['admin', 'buyer', 'seller'].includes(role)) {
        return res.status(400).json({ error: 'Role must be one of: admin, buyer, seller' });
      }
    user.role = role || user.role;
    user.updated_at = new Date();
    await user.save();
    res.status(200).json({ message: 'User updated successfully', user });*/

    let newRole;
    if(user.role === 'buyer'){
      newRole = 'seller';
    }else if (user.role === 'seller') {
      newRole = 'buyer';
    } else if (user.role === 'admin') {
      // Cannot update admin role
      return res.status(400).json({ error: 'Cannot update admin role' });
    }
    
    user.role = newRole;
    user.updated_at = new Date();
    await user.save();

    res.status(200).json({ message: 'User role updated successfully', user });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createUserByAdmin, updateUserByAdmin };

