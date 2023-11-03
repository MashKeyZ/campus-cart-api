const Redis = require('ioredis');
const redis = new Redis({
    port: 6379,          // Redis port
    host: 'localhost',   // Docker container's IP (localhost because we mapped the port)
  });
  
  
  // Set a key
  redis.set('myKey', 'myValue');
  
  // Retrieve the value for the key
  redis.get('myKey').then(value => {
    console.log('Value:', value);
  });
  
  // Close the connection when done
  redis.quit();