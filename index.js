const express = require('express');
const cors = require('cors');
const serverConfig = require('./src/config/server');
const frontendConfig = require('./src/config/frontend');
const userRoutes = require('./src/routes/userRoutes.js'); 
const adminUserRoutes = require('./src/routes/routes.js'); 
const authRoutes = require('./src/routes/authRoutes.js');
const adminRoutes = require('./src/routes/adminRoutes.js');

const app = express();

// za slike
app.use('/uploads', express.static('public/uploads'));
app.use(cors({
    origin: frontendConfig.frontendUrl
}));

app.use(express.json());

// Povezivanje svih ruta
app.use('/api', userRoutes); 
app.use('/api', adminUserRoutes); 
app.use('/api/auth', authRoutes); 
app.use('/api',adminRoutes);

app.listen(serverConfig.port, () => {
    console.log(`Server is running on port ${serverConfig.port}`);
    console.log(`API endpoints dostupni na:
    - POST /api/user/register - Register user
    - POST /api/auth/login - User login
    - PATCH /api/users/:id/approve - Approve user (admin only)
    - PATCH /api/users/:id/suspend - Suspend user (admin only)
    - DELETE /api/users/:id - Delete user (admin only)
    - PUT /api/user/profile/update - Update user profile
    - GET /api/user/profile - Get user profile info`);
});

// Debugging endpoint za testiranje tokena
app.post('/api/debug-token', (req, res) => {
    try {
      const { token } = req.body;
      const config = require('./src/config/auth');
      const jwt = require('jsonwebtoken');
      
      console.log('Verifying token with secret:', config.jwtSecret);
      const decoded = jwt.verify(token, config.jwtSecret);
      
      res.status(200).json({ 
        valid: true, 
        decoded,
        message: 'Token is valid'
      });
    } catch (error) {
      console.error('Debug token error:', error);
      res.status(401).json({ 
        valid: false, 
        error: error.message 
      });
    }
  });