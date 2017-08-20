var Nightmare = require('nightmare');
var nightmare = Nightmare();
var co = require('co');

nightmare
    .useragent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36')
    .viewport(1280, 1024)
    .goto('https://www.gvnmnt.com/collections')
    .wait('#main')
    .evaluate(function () {
        var links = [];
        jQuery('#main').find('div > div > div > ul > li').each(function () {
            var link = 'https://www.gvnmnt.com' + jQuery(this).find('div.coll-image-wrap > a').attr('href');
            links.push(link);
        });
        return links;
    })
    .then(function (newLinks) {
        co(getLinks(newLinks)).then(function (foundLinks) {
            console.log(foundLinks.length);
            co(getData(foundLinks)).then(function (scrapedData) {
                console.log('done' + scrapedData.length);
                nightmare.end();
            });
        });
    })
    .catch(function (err) {
        console.error('Found an error ' + err);
    });

function insertData(collectionM, foundData) {
    require('../../server')(collectionM, foundData);
}

let getLinks = function *(clothesPages) {
    let linksList = [];
    let errorOccurred = false;
    for (let i = 0; i < clothesPages.length; i++) {
        let links = yield nightmare.goto(clothesPages[i]).wait(5000).evaluate(() => {
            var pageLinks = [];
            jQuery('#main').find('div > div > div > div.row.product_image > article').each(function (item) {
                var link = jQuery(this).find('figure > div > form > a').attr('href');
                if(link !== undefined) {  pageLinks.push('https://www.gvnmnt.com' + link); }
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

let getData = function* (linksList) {
    var collectionModel = require('../../models/item')("gvnmnt");
    let data = [];
    var errorOccurred = false;
    for (let i = 0; i < linksList.length; i++) {
        console.log(linksList[i] + '|' + i + '/' + linksList.length);
        var skip = false;
        yield collectionModel.find({url: linksList[i]}, function (err, docs) {
            if (docs.length) {
                skip = true;
                console.log('Item already exists in DB, skipping ' + linksList[i]);
            } else {
                skip = false;
            }
        });
        if (!skip) {
            var minWaitTime = Math.floor(Math.random() * (16000 - 8000 + 1)) + 8000;
            let item = yield nightmare.goto(linksList[i]).wait(minWaitTime).evaluate(() => {
                var url = window.location.href;
                var price = jQuery('#product-price > span').text();
                var type = jQuery('body > section.page-title > div > div > div > ol > li:nth-child(3) > a').text();
                var sizes = [];
                jQuery('#product-select-option-0').find('option').each( function() {
                    var size = {size: $(this).attr('value') };
                    sizes.push(size);
                });
                var itemas = {
                    sex: 'Mens',
                    season: 'Universal',
                    type: type,
                    cover: String('https:' + jQuery('#main > div > div.row.product-details-section > div:nth-child(1) > div.product-image-big > a > div > img').attr('src')),
                    hover: "",
                    name: jQuery('#main > div > div.row.product-details-section > div:nth-child(2) > div > h1').text(),
                    category: ['Youth', 'Rebel', 'Urban', 'GVNMNT', type],
                    price: price.substring(1, price.length),
                    currency: price[0],
                    url: url,
                    shipping: "Unknown",
                    sizes: sizes
                };
                return itemas;
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
            insertData(collectionModel, item);
            data.push(item);
        }
    }
    return data;
};