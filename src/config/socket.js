const socketIO = require('socket.io');
const auctionService = require('../services/auctionService');

let io;

const initSocket = (server) => {
    //console.log('Initializing Socket.IO...');
    io = socketIO(server, {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('WebSocket connected:', socket.id);

        socket.on('joinAuctionRoom', async (auctionId) => {
          socket.join(`auction-${auctionId}`);
          try {
              const data = await getLiveAuctionData(auctionId);
              socket.emit('auctionData', data);
          } catch (error) {
              socket.emit('error', { message: error.message });
          }
        });

        socket.on('placeBid', async (data) => {
            try {
                const { auctionId, price, userId } = data;
                const updatedBid = await auctionService.placeBid({ auctionId, price, userId });

                socket.to(`auction-${auctionId}`).emit('bid_placed', updatedBid); 
            } catch (error) {
                console.error("Error placing bid: ", error.message);
                socket.emit('bid_error', { message: error.message });
            }
        });

        socket.on('disconnect', () => {
          console.log('WebSocket disconnected:', socket.id);
        });
    });
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO has not been initialized');
    }
    return io;
};

module.exports = {
    initSocket,
    getIO
};
