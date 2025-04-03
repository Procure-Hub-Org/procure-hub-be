const { body } = require('express-validator');

exports.registerValidator = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email'),
    body('password')              // validacija za password (minimalna duzina, velika slova, brojevi, specijalni karakteri)
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
      .matches(/[\W_]/)
      .withMessage('Password must contain at least one special character'),
    body('first_name')
      .notEmpty()
      .trim()
      .withMessage('First name is required'),
    body('last_name')
      .notEmpty()
      .trim()
      .withMessage('Last name is required'),
    body('role')
      .isIn(['buyer', 'seller'])
      .withMessage('Role must be either buyer or seller'),
    body('address')
        .notEmpty()
        .trim()
        .withMessage('Address is required'),
    body('company_name')
      .optional()
      .trim(),
    body('phone_number')
        .notEmpty()
        .withMessage('Phone number is required')
        .trim()
        .bail()
      .matches(/^\+(\d{1,3})\s?(\d{1,15})(\s?\d{1,15})*$/)      // regex za broj telefona (+country_code phone_number)
      .withMessage('Please enter a valid phone number'),
    body('company_address')
      .optional()
      .trim()
  ];