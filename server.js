/**
 * Created by Arnoldas on 17/06/2017.
 */
var express = require('express');
var app = express();
var ejs = require('ejs');
var path = require('path');
var schedule = require('node-schedule');
var mongoose = require('mongoose');
var port = 8060;

// view engine
app.engine('html', ejs.renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

// main page
app.get('/', function (req, res) {
    res.render('index');
});
//unavailable pages
app.use(function (req, res) {
    res.status(404);
    res.render('error');
});
// launching server
app.listen(port);
console.log("Server is running on port " + port);

// database initialising
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/myDB');
mongoose.connection.on('open', function () {
    console.log('Mongoose connected.')
});

// data insertion function reachable from scrapers
function insertDataToDatabase(collectionName, data) {
    var ItemModel = require('./models/item')(String(collectionName));
    for (var i = 0; i < data.length; i++) {
        var newItem = new ItemModel({
            sex: data[i].sex,
            season: data[i].season,
            type: data[i].type,
            cover: data[i].cover,
            hover: data[i].hover,
            name: data[i].name,
            category: data[i].category,
            price: data[i].price,
            currency: data[i].currency,
            url: data[i].url,
            sizes: data[i].sizes
        });
        newItem.save(function (err, newItem) {
            if (err) console.log(err);
        });
    }
}

module.exports = insertDataToDatabase;

// scheduling scrapers
//var grindLondonScrape = schedule.scheduleJob('0 52 19 * * *', function() {});

//FINISHED
//var grindlondon = require('./websites/shops/grindlondon');
//var lazyoaf = require('./websites/shops/lazyoaf');
//var lazyoaf = shops.lazyoaf;