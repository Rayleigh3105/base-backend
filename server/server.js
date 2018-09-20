// --- CONFIG ---
require('./../config/config');

// +++ THIRD PARTY MODULES +++
var express = require('express');
const cors = require('cors');
const _ = require('lodash');
var moment = require('moment');
var bodyParser = require('body-parser');
const { ObjectID } = require('mongodb');


// +++ LOCAL +++
var { mongoose } = require('./../db/mongoose').mongoose;
var { User } = require('./../models/user');
var { Item } = require('./../models/item');
var { authenticate } = require('./../middleware/authenticate');



var app = express();

// Declare Port for deployment or local
const port = process.env.PORT || 3000;

// Setup Middleware
app.use( bodyParser.json(), cors( {origin: '*'}));

// BEGIN ROUTES

// POST /users
app.post('/users', async ( req, res ) => {
    try {
        res.header("access-control-expose-headers",
            ",x-auth"
            +",Content-Length"
        );
        var body = _.pick( req.body, [ 'email', 'password']);
        var user = new User( body );

        await user.save();
        const token = await user.generateAuthToken();
        res.header( 'x-auth', token ).send( user );
    } catch (e) {
        res.status(400).send("User can not be created (Invalid Email/Password or User already exists)");
    }
});

// Post /users/login
app.post('/users/login', async ( req, res ) => {
    try {
        res.header("access-control-expose-headers",
            ",x-auth"
            +",Content-Length"
        );
        const body = _.pick( req.body, [ 'email', 'password']);

        const user = await User.findByCredentials( body.email, body.password);
        const token = await user.generateAuthToken()
        res.header( 'x-auth', token ).send( user );
    } catch (e) {
        res.status( 400 ).send("Something went wrong during LogIn (Invalid Email/Password), try again");
    }
});

// Delete /users/me/token
app.delete( '/users/me/token', authenticate, async ( req, res ) => {
    try {
        await req.user.removeToken( req.token );
        res.status( 200 ).send();
    } catch (e) {
        res.status( 400 ).send()
    }
});

app.post('/item', authenticate, async ( req, res ) => {
    try {
        var date = new Date().getTime();
        // Todo - Format in Local Date Format
        var formattedTime = moment( date ).format('DD.MM.YYYY');

        var item = new Item({
            headline: req.body.headline,
            description: req.body.description,
            createdAt: formattedTime,
            price: req.body.price,
            _creator: req.user._id
        });

        await item.save().then( ( item ) => {
            res.send( item )
        })
    } catch (e) {
        res.status( 400 ).send( "Something went wrong during saving the Item");

    }
});

app.get('/item', authenticate, async ( req, res ) =>{
    try {
        Item.find({
            _creator: req.user._id
        }).then( ( item ) => {
            if (!item) {
                res.status( 404 ).send(" No Items found!")
            } else {
                res.send( item );
            }
        })
    } catch (e) {
        res.status( 400 ).send("Something went wrong during fetching the Items")
    }
})


// END ROUTES


// Start of for NodeJs
app.listen( port, () => {
    console.log(`Started up on port ${port}`);
});

module.exports = {
    app
};
