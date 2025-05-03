const socketIO = require('socket.io');
const auctionService = require('../services/auctionService');
const { getLiveAuctionData } = require('../services/auctionInformationService');

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

        socket.on('joinAuctionRoom', async ({auctionId}) => {
          socket.join(`auction-${auctionId}`);
          console.log(`Socket ${socket.id} joined auction-${auctionId}`);
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
                const {updatedBid, lastCall} = await auctionService.placeBid({ auctionId, price, userId });
                const auctionData = await getLiveAuctionData(auctionId);
                socket.emit('auctionData', auctionData);
                socket.to(`auction-${auctionId}`).emit('auctionData', auctionData); // Emit to all clients in the room
                if (lastCall) {
                    socket.emit('auctionTimeUpdate', auctionData);
                    socket.to(`auction-${auctionId}`).emit('auctionTimeUpdate', auctionData);
                }

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
