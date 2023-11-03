const Redis = require('ioredis');

const redis = new Redis({
  host: '127.1.0.0', // Use the Docker container's IP or hostname
  port: 6379, // Redis port
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Error connecting to Redis:', err);
});
/*
exports.storeUserData=async function(userId, userData) {
  await redis.hset(`user:${userId}`, userData);
}*/

module.exports = redis;