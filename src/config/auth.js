module.exports = {
    jwtSecret: process.env.JWT_SECRET || 'your-very-secure-secret-key',
    jwtExpiresIn: '24h'
  };