const mongoose = require('mongoose');
var  conn = require('./../db/mongoose').conn;

var bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const _ = require('lodash');

var UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        unique: true
    },
    password: {
        type: String,
        require: true,
        minlength: 6
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
    var user = this;

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

var User = conn.model('User', UserSchema);

module.exports = {User}


