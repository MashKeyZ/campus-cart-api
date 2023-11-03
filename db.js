const mysql = require('mysql2/promise');

// Create a pool for managing database connections
const pool = mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  waitForConnections: true, // Optional, set to false if you don't want to wait for connections
  connectionLimit: 10, // Adjust this value as needed
  queueLimit: 0 // Optional, set to 0 for unlimited queueing
});

module.exports = pool; // Export the pool for use in other parts of your application

