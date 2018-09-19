// --- CONFIG ---
require('./../config/config');

// +++ THIRD PARTY MODULES +++
var express = require('express');

// +++ LOCAL +++
var { User } = require('./../models/user');

var app = express();

// Declare Port for deployment or local
const port = process.env.PORT || 3000;

// Start of for NodeJs
app.listen( port, () => {
    console.log(`Started up on port ${port}`);
});

module.exports = {
    app
};
