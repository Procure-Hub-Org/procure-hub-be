const express = require('express');
const cors = require('cors');
const serverConfig = require('./src/config/server');
const frontendConfig = require('./src/config/frontend');
const userRoutes = require('./src/routes/userRoutes.js'); 
const adminUserRoutes = require('./src/routes/routes.js'); 
const authRoutes = require('./src/routes/authRoutes.js');
const adminRoutes = require('./src/routes/adminRoutes.js');
const procurementRoutesBuyer = require('./src/routes/procurementRoutes.js');
const categoryRoutes = require('./src/routes/categoryRoutes');
const buyerTypeRoutes = require('./src/routes/buyerTypeRoutes.js');
const procurementRoutes = require('./src/routes/procurementRequestRoutes.js');

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
app.use('/api',procurementRoutesBuyer);
app.use('/api', procurementRoutes);
app.use('/api', categoryRoutes);
app.use('/api', buyerTypeRoutes);
app.use('/api', procurementRoutes);

app.listen(serverConfig.port, () => {
    console.log(`Server is running on port ${serverConfig.port}`);
    console.log(`API endpoints dostupni na:
    - POST /api/user/register - Register user
    - POST /api/auth/login - User login
    - PATCH /api/users/:id/approve - Approve user (admin only)
    - PATCH /api/users/:id/suspend - Suspend user (admin only)
    - DELETE /api/users/:id - Delete user (admin only)
    - PUT /api/user/profile/update - Update user profile
    - GET /api/user/profile - Get user profile info
    - POST /api/procurement/create - Create a new procurement request
    - PUT /api/procurement/:id/status - Update procurement request status
    - PUT /api/procurement/:id/update - Update procurement request
    - GET /api/buyer_types - Get all buyer types
    - POST /api/buyer_types - Create buyer type
    - GET /api/procurement-requests - Get procurement requests (sellers only)
    - GET /api/procurement-categories - Get all categories
    - GET /api/procurement-requests/buyer - Get all procurement requests (buyers only)
    - GET /api/procurement-requests/favorites - Get favorite procurement requests (sellers only)
    - POST /api/procurement-requests/:id/follow - Follow (add to favorites) procurement request (sellers only)
    - DELETE /api/procurement-requests/:id/unfollow - Unfollow (remove from favorites) procurement request (sellers only)`);
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