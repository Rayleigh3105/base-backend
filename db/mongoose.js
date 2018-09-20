var mongoose = require('mongoose');

// Mongoose uses now Promises
mongoose.Promise = global.Promise;

// Connect to Database
mongoose.createConnection(process.env.MONGODB_URI || 'mongodb://localhost:27017/BaseBackend');

module.exports = { mongoose };


