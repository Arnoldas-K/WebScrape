/**
 * Created by Arnoldas on 23/06/2017.
 */
var Nightmare = require('nightmare');
var nightmare = Nightmare();
var co = require('co');

var clothesPages = ['http://clothsurgeon.com/shop/coats', 'http://clothsurgeon.com/shop/jackets', 'http://clothsurgeon.com/shop/tops',
'http://clothsurgeon.com/shop/t-shirts', 'http://clothsurgeon.com/shop/pants'];

nightmare
    .useragent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36')
    .viewport(1280, 1024)
    .then(function () {
        co(getLinks).then(function (foundLinks) {
            console.log(foundLinks.length);
            co(getData(foundLinks)).then(function (scrapedData) {
                console.log(scrapedData.length);
                insertData(scrapedData);
                return nightmare.end(); // terminating electron instances
            });
        })
    })
    .catch(function (err) {
        console.log("Found an error " + err);
    });

function insertData(foundData) { require('../../server')('clothsurgeon', foundData); }

let getLinks = function *() {
    let linksList = [];
    let errorOccurred = false;
    for (let i = 0; i < clothesPages.length; i++) {
        let links = yield nightmare.goto(clothesPages[i]).wait(8000).evaluate(() => {
            var pageLinks = [];
            jQuery('#content > div.product-grid.clearfix > div > div.image > a').each(function (item) {
                var link = jQuery(this).attr("href");
                var tempType = (window.location.href).split('/');
                var type = tempType[tempType.length-1];
                type = type.charAt(0).toUpperCase() + type.substring(1);
                var both = {"link": link, "type": type};
                pageLinks.push(both);
            });
            return pageLinks;
        })
            .catch(error => {
                console.log(error);
                if (!errorOccurred) {
                    errorOccurred = true;
                    i--;
                } else if (errorOccurred) {
                    console.log('Skipping ' + clothesPages[i]);
                    errorOccurred = false;
                }
            });
        linksList = linksList.concat(links);
    }
    return linksList;
};

let getData = function *(foundLinks) {
    var data = [];
    var errorOccurred = false;
    for (let i = 0; i < foundLinks.length; i++) {
        console.log(foundLinks[i].url + '|' + i + '/' + foundLinks.length);
        var minWaitTime = Math.floor(Math.random() * (16000 - 8000 + 1)) + 8000;
        let item = yield nightmare.goto(foundLinks[i].link).wait(minWaitTime).evaluate(() => {
            var url = window.location.href;
            var price = jQuery('#content > div.product-info.clearfix > div.right > div > div.price > span').text();
            var type = '';
            var sizes = [];
            jQuery('#content > div.product-info.clearfix > div.right > div > div.options > div.option > select > option').each(function(){
                if($(this).text() !== ' --- Please Select --- ') {
                    var size = { size : $(this).text().trim() };
                    sizes.push(size);
                }
            });
            var itemData = {
                sex: 'Mens',
                season: 'Universal',
                type: type,
                cover: String(jQuery('#content > div.product-info.clearfix > div.left > div:nth-child(4) > img').attr('src')),
                hover: String(jQuery('#content > div.product-info.clearfix > div.left > div:nth-child(5) > img:nth-child(1)').attr('src')),
                name: jQuery('#content > div.product-info.clearfix > div.right > h1').text(),
                category: ['London', 'Luxury', 'Street', 'clothsurgeon'],
                price: price.substring(1, price.length),
                currency: price[0],
                url: url,
                sizes: sizes
            };
            return itemData;
        })
            .then((itemData) => {
                itemData.type = foundLinks[i].type;
                itemData.category.push(itemData.type);
                return itemData;
            })
            .catch(error => {
                console.log(error);
                if (!errorOccurred) { // if error didn't occur before, give it one more chance
                    errorOccurred = true;
                    i--;
                } else if (errorOccurred) {
                    console.log('Skipping ' + linksList[i]);
                    errorOccurred = false;
                }
            });
        data.push(item);
    }
    return data;
};