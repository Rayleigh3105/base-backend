// --- CONFIG ---
require('./../config/config');

// +++ THIRD PARTY MODULES +++
var express = require('express');
const cors = require('cors');
const _ = require('lodash');
var moment = require('moment');
var bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const path = require('path');

// +++ LOCAL +++
var mongoose = require('./../db/mongoose').mongoose;
var  conn = require('./../db/mongoose').conn;
var {User} = require('./../models/user');
var {Item} = require('./../models/item');
var {authenticate} = require('./../middleware/authenticate');
const crypto = require('crypto');


var app = express();

// Declare Port for deployment or local
const port = process.env.PORT || 3000;

// Setup Middleware
app.use(bodyParser.json(), cors({origin: '*'}));
app.use(methodOverride('_method'));

let gfs;

conn.once('open', function () {
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads')
});

// Create storage engine
const storage = new GridFsStorage({
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/BaseBackend',
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage });

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ file: req.file });
});

// @route GET /files
// @desc Display all files in JSON
app.get('/files', (req, res) => {
    gfs.files.find().toArray( ( err, files ) => {
        // Check if files
        if(!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exists'
            });
        }
        // Files exists

        return res.json( files );
    });
});

// @route GET /files/:filename
// @desc Display single File object
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({
        filename: req.params.filename
    }, ( err, file ) => {
        if(!file) {
            return res.status(404).json({
                err: 'No files exists'
            });
        }

        // Files exists
        return res.json( file );
    })
});

// @route GET /image/:filename
// @desc Display image
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({
        filename: req.params.filename
    }, ( err, file ) => {
        if(!file) {
            return res.status(404).json({
                err: 'No files exists'
            });
        }

        // Check if image
        if(file.contentType === 'image/jpeg' || file.contentType === 'img/png'){
            // Read output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe( res );
        } else {
            res.status(404).json({
                err: 'Not an image of type JPEG/PNG'
            })
        }
    })
});

// @route DELETE /files/:id
// @desc Delete file
app.delete('/files/:id', ( req, res ) => {
    gfs.files.remove({
        _id: req.params.id,
        root: 'uploads'
    }, (err, gridStore) => {
        if( err ){
            return res.status( 404 ).json({ err });
        }
    })
});



// BEGIN ROUTES

// POST /users
app.post('/users', async ( req, res ) => {
    try {
        res.header("access-control-expose-headers",
            ",x-auth"
            +",Content-Length"
        );
        var body = _.pick( req.body, [ 'username', 'password']);
        var user = new User( body );

        await user.save();
        const token = await user.generateAuthToken();
        res.header( 'x-auth', token ).send( user );
    } catch (e) {
        res.status(400).send("User can not be created (Invalid Username/Password or User already exists)");
    }
});

// Post /users/login
app.post('/users/login', async (req, res) => {
    try {
        res.header("access-control-expose-headers",
            ",x-auth"
            + ",Content-Length"
        );
        const body = _.pick(req.body, ['username', 'password']);

        const user = await User.findByCredentials(body.username, body.password);
        const token = await user.generateAuthToken()
        res.header('x-auth', token).send(user);
    } catch (e) {
        res.status(400).send("Something went wrong during LogIn (Invalid Username/Password), try again");
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
        res.json({ file: req.file()});
        let date = new Date().getTime();
        let formattedTime = moment(date).locale("de").format('L, LTS');

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
    let formattedTime = moment(date).locale("de").format('L, LTS');

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
        res.status( 400 ).send(`Something went wrong during update of Item with ID: ${id} !`)
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
