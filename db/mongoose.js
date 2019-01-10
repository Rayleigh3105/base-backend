var mongoose = require('mongoose');

// Mongoose uses now Promises
mongoose.Promise = global.Promise;

// Connect to Database
let conn = mongoose.createConnection(process.env.MONGODB_URI || 'mongodb://localhost:27017/Camel24');

module.exports = { mongoose, conn };


