const { createClient } = require('redis');
const redisConfig = require('../config/redis');
const net = require('net');

const redisUrl = new URL(redisConfig.redisUrl);
const host = redisUrl.hostname;
const port = parseInt(redisUrl.port, 10);

let redisConnected = false;
let redisClient = null;

function checkRedisAvailable() {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host, port });
        socket.on('connect', () => {
            socket.end();
            resolve(true);
        });
        socket.on('error', () => {
            resolve(false);
        });
    });
}

async function connectRedis() {
    const isRedisAvailable = await checkRedisAvailable();
    if (isRedisAvailable) {
        redisClient = createClient({ url: redisUrl });
        redisClient.on('error', (err) => console.error('Redis Client Error', err));

        try {
            await redisClient.connect();
            redisConnected = true;
        } catch (error) {
            console.error('Error connecting to Redis:', error);
        }
    }
    
}

connectRedis();

module.exports = {
    redisClient:() => redisClient,
    redisConnected: () => redisConnected,
};