require('dotenv').config();

module.exports = {
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};