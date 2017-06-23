var mongoose = require('mongoose');
var Schema = mongoose.Schema;

function dynamicScheme(nameOfCollection) {
    var ItemSchema = new Schema({
        sex: {type: String, required: true},
        season: {type: String, required: true},
        type: {type: String, required: true},
        name: {type: String, required: true},
        category: {type: [String], default: ''},
        price: { type: String, required: true},
        currency: { type: String, required: true},
        cover: {type: String, required: true},
        hover: {type: String, default: ''},
        url: {type: String, required: true},
        sizes: {type: [String], default: ''}
    });
//module.exports = mongoose.model('Item', ItemSchema);
    return mongoose.model(String(nameOfCollection), ItemSchema);
}

module.exports = dynamicScheme;