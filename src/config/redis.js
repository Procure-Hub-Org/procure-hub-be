require('dotenv').config();

module.exports = {
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
};