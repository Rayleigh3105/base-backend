var mongoose = require('mongoose');
var  conn = require('./../db/mongoose').conn;


// ----------------- MODEL -----------------
var ItemSchema = new mongoose.Schema({
    headline: {
        type: String,
        required: true,
        minLength: 1,
        maxLength: 256,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        minLength: 1,
        trim: true,
    },
    price: {
        type: String        ,
        required: true,
        minLength: 1
    },
    createdAt: {
        type: String,
        default: null
    },
    updatedAt: {
        type: String,
        default:null
    },
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
});


var Item = conn.model('Item', ItemSchema);

module.exports = { Item }
