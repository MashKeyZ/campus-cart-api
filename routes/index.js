var express = require('express');
var router = express.Router();
var redis = require('../redis')

/* GET home page. */
router.get('/', async function(req, res, next) {
  //console.log(redis)
  console.log("Testing redis");
  /*redis.on('connect', () => {
    console.log('Connected to Redis');
  });
  
  redis.on('error', (err) => {
    console.error('Error connecting to Redis:', err);
  });*/
  
   // Set a key
   redis.set('myKey', 'myValue');

// Retrieve the value for a given key
redis.get('myKey').then(value => {
  console.log('Value:', value);
  res.json({key:'myKey', value:value})
}).catch(err => {
  console.error('Error:', err);
  res.end("error")
});

// Close the Redis connection when done
redis.quit();
});

module.exports = router;
