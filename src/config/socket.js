const socketIO = require('socket.io');

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
