var mongoose = require('mongoose');
var Schema = mongoose.Schema;

function dynamicScheme(nameOfCollection) {
    var ItemSchema = new Schema({
        sex: {type: String},
        season: {type: String},
        type: {type: String},
        name: {type: String},
        category: {type: [String], default: ''},
        price: { type: String},
        currency: { type: String},
        cover: {type: String},
        hover: {type: String, default: ''},
        url: {type: String},
        sizes: {type: [String], default: ''}
    });
//module.exports = mongoose.model('Item', ItemSchema);
    return mongoose.model(String(nameOfCollection), ItemSchema);
}

module.exports = dynamicScheme;