const socketIO = require('socket.io');

let io;

const initSocket = (server) => {
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
