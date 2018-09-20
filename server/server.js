// --- CONFIG ---
require('./../config/config');

// +++ THIRD PARTY MODULES +++
var express = require('express');
const cors = require('cors');
const _ = require('lodash');
var moment = require('moment');
var bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');


// +++ LOCAL +++
var {mongoose} = require('./../db/mongoose').mongoose;
var {User} = require('./../models/user');
var {Item} = require('./../models/item');
var {authenticate} = require('./../middleware/authenticate');


var app = express();

// Declare Port for deployment or local
const port = process.env.PORT || 3000;

// Setup Middleware
app.use(bodyParser.json(), cors({origin: '*'}));

// BEGIN ROUTES

// POST /users
app.post('/users', async (req, res) => {
    try {
        res.header("access-control-expose-headers",
            ",x-auth"
            + ",Content-Length"
        );
        let body = _.pick(req.body, ['email', 'password']);
        let user = new User(body);

        await user.save();
        const token = await user.generateAuthToken();
        res.header('x-auth', token).send(user);
    } catch (e) {
        res.status(400).send("User can not be created (Invalid Email/Password or User already exists)");
    }
});

// Post /users/login
app.post('/users/login', async (req, res) => {
    try {
        res.header("access-control-expose-headers",
            ",x-auth"
            + ",Content-Length"
        );
        const body = _.pick(req.body, ['email', 'password']);

        const user = await User.findByCredentials(body.email, body.password);
        const token = await user.generateAuthToken()
        res.header('x-auth', token).send(user);
    } catch (e) {
        res.status(400).send("Something went wrong during LogIn (Invalid Email/Password), try again");
    }
});

// Delete /users/me/token
app.delete('/users/me/token', authenticate, async (req, res) => {
    try {
        await req.user.removeToken(req.token);
        res.status(200).send();
    } catch (e) {
        res.status(400).send()
    }
});

app.post('/item', authenticate, async (req, res) => {
    try {
        let date = new Date().getTime();
        // Todo - Format in Local Date Format
        let formattedTime = moment(date).format('DD.MM.YYYY');

        let item = new Item({
            headline: req.body.headline,
            description: req.body.description,
            createdAt: formattedTime,
            price: req.body.price,
            _creator: req.user._id
        });

        await item.save().then((item) => {
            res.send(item)
        })
    } catch (e) {
        res.status(400).send("Something went wrong during saving the Item");

    }
});

app.get('/item', authenticate, (req, res) => {
    try {
        Item.find({
            _creator: req.user._id
        }).then((item) => {
            if (!item) {
                res.status(404).send(" No Items found!")
            } else {
                res.send(item);
            }
        })
    } catch (e) {
        res.status(400).send("Something went wrong during fetching the Items")
    }
});

app.patch('/item/:id', authenticate, (req, res) => {
    let date = new Date().getTime();
    // Todo - Format in Local Date Format
    let formattedTime = moment(date).format('DD.MM.YYYY, HH:MM:SS');

    let id = req.params.id;
    let body = _.pick(req.body, ['headline', 'description', 'price']);
    body.updatedAt = formattedTime;

    if (!ObjectID.isValid(id)) {
        return res.status(404).send("Invalid Objectt ID!")
    }

    Item.findOneAndUpdate({
        _id: id,
        _creator: req.user._id
    },{
        $set: body
    }, {
        new: true
    }).then( ( item ) => {
        if ( !item ) {
            return res.status( 404 ).send(`Item with ID: ${id} not found!`);
        }

        res.send( item );
    }).catch( ( e ) => {
        res.status( 400 ).send(`Somethiong went wrong during update of Item with ID: ${id} !`)
    })


});


// END ROUTES


// Start of for NodeJs
app.listen(port, () => {
    console.log(`Started up on port ${port}`);
});

module.exports = {
    app
};
