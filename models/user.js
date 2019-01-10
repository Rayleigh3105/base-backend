const mongoose = require('mongoose');
let  conn = require('./../db/mongoose').conn;
const validator = require('validator');


let bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const _ = require('lodash');

let UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        min: 1,
        unique: true,
        validate: {
            isAsync: true,
            validator: validator.isEmail,
            message: '{VALUE} is not a valid email'
        }
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        min: 1,
        unique: false
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        min: 1,
        unique: false
    },
    password: {
        type: String,
        require: true,
        minlength: 6
    },
    kndnumber: {
        type: String,
        require: true,
        min: 5,
        max: 5,
        unique: true
    },
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]
});

UserSchema.methods.toJSON = function () {
    let user = this;
    let userObject = user.toObject();

    return _.pick(userObject, ['_id', 'username']);
};

UserSchema.methods.generateAuthToken = function () {
    let user = this;
    let access = 'auth';
    let token = jwt.sign({_id: user._id.toHexString(), access}, process.env.JWT_SECRET).toString();

    user.tokens = user.tokens.concat([{access, token}]);

    return user.save().then(() => {
        return token;
    });
};

UserSchema.statics.findByToken = function ( token ) {
    let User = this;
    let decoded;

    try {
        decoded = jwt.verify( token, process.env.JWT_SECRET );
    } catch (e) {
        return Promise.reject()
    }

    return User.findOne({
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    })
};

UserSchema.statics.findByCredentials = function ( username, password ) {
    let User = this;

    return User.findOne({ username }).then( ( user ) => {
        if ( !user ) {
            return Promise.reject();
        }

        return  new Promise(  (resolve, reject) => {
            bcrypt.compare( password, user.password, ( err, res ) => {
                if ( res ) {
                    resolve( user );
                } else {
                    reject();
                }
            });
        });
    })
};

// Instance Method
UserSchema.methods.removeToken = function ( token ) {
    var user = this;

    // Removes Token
    return user.update({
        $pull: {
            tokens: { token }
        }
    })
};

UserSchema.pre( 'save', function ( next ) {
    let user = this;

    if ( user.isModified( 'password')) {
        bcrypt.genSalt( 10, ( err, salt ) => {
            bcrypt.hash( user.password, salt, ( err, hash ) => {
                user.password = hash;
                next();
            });
        });
    } else {
        next();
    }
});

let User = conn.model('User', UserSchema);

module.exports = {User}


