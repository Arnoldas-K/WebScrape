/*
var links = [];
jQuery('#device-only > ul:nth-child(1) > li:nth-child(2) > ul > li').each(function(){ links.push( $(this).find('a').attr('href') ) ; } );
 */

var Nightmare = require('nightmare');
var nightmare = Nightmare();
var co = require('co');

nightmare
    .useragent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36')
    .viewport(1280, 1024)
    .goto('http://www.monki.com/gb/')
    .wait('body > header')
    .evaluate(function () {
        var links = [];
        jQuery('#device-only > ul:nth-child(1) > li:nth-child(2) > ul > li').each(function(){
            links.push( { link: 'http://www.monki.com/gb/' + $(this).find('a').attr('href'), type:$(this).find('a').text() });
        });
        links = links.slice(2, links.length); // removing two useless links
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
        yield nightmare.goto(clothesPages[i].link);
        var previousHeight, currentHeight=0;
        while(previousHeight !== currentHeight) {
            previousHeight = currentHeight;
            var currentHeight = yield nightmare.evaluate(function() {
                return document.body.scrollHeight;
            });
            yield nightmare.scrollTo(currentHeight, 0)
                .wait(3000)
                .screenshot('test.png');
        }
        let links = yield nightmare.evaluate(() => {
            var pageLinks = [];
            jQuery('#center-container > section > div.filter-category-main.category-filter > section > ul > li > a').each(function() {
                pageLinks.push({ link: 'http://www.monki.com' + jQuery(this).attr('href'), type: jQuery('body > header > section > div > h1').text()});});
            return pageLinks;
            })
            .catch(error => {
                console.log(error);
                if (!errorOccurred) {
                    errorOccurred = true;
                    i--;
                } else if (errorOccurred) {
                    console.log('Skipping ' + clothesPages[i].link);
                    errorOccurred = false;
                }
            });
        console.log(links.length + " found links of " + links.type);
        linksList = linksList.concat(links);
    }
    return linksList;
};

let getData = function* (linksList) {
    var collectionModel = require('../../models/item')("monki");
    let data = [];
    var errorOccurred = false;
    for (let i = 0; i < linksList.length; i++) {
        console.log(linksList[i].link + '|' + i + '/' + linksList.length);
        var skip = false;
        yield collectionModel.find({url: linksList[i].link}, function (err, docs) {
            if (docs.length) {
                skip = true;
                console.log('Item already exists in DB, skipping ' + linksList[i].link);
            } else {
                skip = false;
            }
        });
        if (!skip) {
            var minWaitTime = Math.floor(Math.random() * (16000 - 8000 + 1)) + 8000;
            let item = yield nightmare.goto(linksList[i].link).wait(minWaitTime).evaluate(() => {
                var price = jQuery('#center-container > div.product-details-wrapper > section.product-details > div > h2').text().trim();
                var sizes = [];
                jQuery('#size-drop > div > select').find('option').each( function() {
                    var size = {size: $(this).text() };
                    sizes.push(size);
                });
                var hover = 'http://www.monki.com' + jQuery('#center-container > div.product-details-wrapper > section.product-preview > div > div.product-thumbnail > ul > li:nth-child(2) > a > img').attr('src');
                if(!hover) { hover = ''; }
                var itemas = {
                    sex: 'Women',
                    season: 'Universal',
                    type: '',
                    cover: 'http://www.monki.com' + jQuery('#center-container > div.product-details-wrapper > section.product-preview > div > div.image-container > a.img > img').attr('src'),
                    hover: hover,
                    name: jQuery('#breadcrumbs > li.active > span').text().trim(),
                    category: ['Monki'],
                    price: price.substring(1, price.length),
                    currency: price[0],
                    url: window.location.href,
                    shipping: "Home delivery UK | Shipping fee : £6" +
                    "You will normally receive your order within 3-5 working days" +
                    "Express delivery UK | Shipping fee : £9" +
                    "Order placed before 1 pm Mon-Sat will be delivered the next working day.",
                    sizes: sizes
                };
                return itemas;
            })
                .then((itemData) => {
                itemData.type = linksList[i].type;
                itemData.category.push(linksList[i].type);
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
            insertData(collectionModel, item);
            data.push(item);
        }
    }
    return data;
};