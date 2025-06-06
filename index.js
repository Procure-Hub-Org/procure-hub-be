const express = require('express');
const cors = require('cors');
const socketIO = require('socket.io');
const http = require('http');   // potrebno za socket.io
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
const bidproposalRoutesBuyer = require('./src/routes/buyerBidProposalRoutes.js');
const criteriaRoutes = require('./src/routes/criteriaRoutes.js');
const procurementBidRoutes = require('./src/routes/procurementBidRoutes');
const bidDocumentRoutes = require('./src/routes/bidDocumentRoutes.js');
const bidProposalRoutes = require('./src/routes/bidProposalRoutes.js');
const autionCreationRoutes= require('./src/routes/auctionbuyerRoutes.js');
const auctionRoutes = require('./src/routes/auctionRoutes.js');
const auctionHistoryRoutes = require('./src/routes/auctionHistoryRoutes.js')
const { initSocket } = require('./src/config/socket.js');   // init socket.io
const auctionDashboardRoutes = require('./src/routes/auctionDashboardRoutes.js');
const buyerAnalytics = require('./src/routes/buyerAnalyticsRoute.js');
const sellerAnalytics = require('./src/routes/sellerAnalyticsRoute.js');
const contractRoutes = require('./src/routes/contractRoutes.js');
const contractDocumentRoutes = require('./src/routes/contractDocumentRoutes.js');
const disputeRoutes = require('./src/routes/disputeRoutes.js');
const sellerReportRoute = require('./src/routes/sellerReportRoute.js');
const notificationRoutes = require('./src/routes/notificationRoutes');
const contractChangeRequestRoute = require('./src/routes/contractChangeRequestRoute.js');


const app = express();

// Inicijalizacija servera (potrebno za socket.io)
const server = http.createServer(app);

// Inicijalizacije socket.io
initSocket(server);

// za slike
app.use('/uploads', express.static('public/uploads'));
app.use('/logo', express.static('public/logo'));
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
app.use('/api', criteriaRoutes);
app.use('/api', categoryRoutes);
app.use('/api', buyerTypeRoutes);
app.use('/api', bidproposalRoutesBuyer);
app.use('/api', procurementBidRoutes);
app.use('/api', bidDocumentRoutes);
app.use('/api', bidProposalRoutes);
app.use('/api', auctionDashboardRoutes);
app.use('/api', autionCreationRoutes);
app.use('/api', auctionRoutes);
app.use('/api', buyerAnalytics);
app.use('/api', sellerAnalytics);
app.use('/api', auctionHistoryRoutes)
app.use('/api', contractRoutes);
app.use('/api', contractDocumentRoutes);
app.use('/api', disputeRoutes);
app.use('/api', sellerReportRoute);
app.use('/api', notificationRoutes);
app.use('/api', contractChangeRequestRoute);


server.listen(serverConfig.port, () => {
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
    - PATCH /api/procurement/:id/update - Update procurement request
    - GET /api/buyer_types - Get all buyer types
    - POST /api/buyer_types - Create buyer type
    - GET /api/procurement-requests - Get procurement requests (sellers only)
    - GET /api/procurement-categories - Get all categories
    - GET /api/procurement-criterias - Get all procurement criterias
    - GET /api/procurement-requests/buyer - Get all procurement requests (buyers only)
    - GET /api/procurement-requests/favorites - Get favorite procurement requests (sellers only)
    - POST /api/procurement-requests/:id/follow - Follow (add to favorites) procurement request (sellers only)
    - DELETE /api/procurement-requests/:id/unfollow - Unfollow (remove from favorites) procurement request (sellers only)
    - GET /api/procurement-bids/:id - Get all procurement bids (sellers only)
    - GET /api/procurement-requests/:id - Get procurement request details
    - GET /api/procurement/:id/bids - Get all bids for a specific procurement request
    - POST /api/bid/create - Create a new bid (sellers only)
    - PUT /api/bid/:id/update - Update a bid that's not submitted (sellers only)
    - PUT /api/bid/:id/submit - Submit a bid (sellers only)
    - GET /api/bid/:id/preview - Preview a bid (sellers only)
    - POST /bid-documents/upload - Upload bid document (sellers only)
    - DELETE /bid-documents/:id/remove - Remove bid document (sellers only)
    - GET /procurement-bid/:id/bid-documents - Get bid documents for a specific procurement request
    - GET /api/bids/user/:userId - Fetch all seller's bids
    - GET /api/auction/:id/history - Fetch auction history
    - GET /api/notifications/:userId - Get user notifications
    - POST /api/contracts/:id/add-documents - Upload contract document (buyers only)
    - DELETE /api/contracts/:id/remove-document - Remove contract document (buyers only)
    - GET /api/contracts/:id/documents - Get contract documents (buyers only)`);

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