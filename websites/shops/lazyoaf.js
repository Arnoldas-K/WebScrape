/**
 * Created by Arnoldas on 23/06/2017.
 */
var Nightmare = require('nightmare');
var nightmare = Nightmare();
var co = require('co');

var clothesPages = ['https://www.lazyoaf.com/mens-everything', 'https://www.lazyoaf.com/womens-everything'];

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

function insertData(foundData) { require('../../server')('LAZYOAF', foundData); }

let getLinks = function *() {
    let linksList = [];
    let errorOccurred = false;
    for (let i = 0; i < clothesPages.length; i++) {
        let links = yield nightmare.goto(clothesPages[i]).wait(8000).evaluate(() => {
            var pageLinks = [];
            jQuery('#body > div > div.col-main > div > div > div > ul > li > a').each(function (item) {
                var link = jQuery(this).attr("href");
                var sex = jQuery('#body > div > div.col-main > div > div > div > div.product-head > div > h1 > span > span:nth-child(1)').text();
                var both = {"link": link, "sex": sex};
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
            var price = '';
            if (jQuery('span.regular-price > span').text()) {
                price = jQuery('span.regular-price > span').text();
            } else {
                price = jQuery('p.special-price > span.price').text().trim();
            }
            var tempType = jQuery('#product_addtocart_form > div.product-essential > div.product-shop > div > div.product-name > h1').text().split(' ');
            var type = tempType[tempType.length - 1];
            var sizes = [];
            jQuery('#r > div > input').next().each(function (size) {
                var size = { size : this.innerText };
                sizes.push(size);
            });
            var itemData = {
                sex: '',
                season: 'Universal',
                type: type,
                cover: String(jQuery('#product_addtocart_form > div.product-essential > div:nth-child(1) > div.main-product-images > div > div.bx-viewport > ul > li:nth-child(1) > picture > img').attr('src')),
                hover: String(jQuery('#product_addtocart_form > div.product-essential > div:nth-child(3) > div > ul > li.rslides1_s1 > a > img').attr('src')),
                name: jQuery('#product_addtocart_form').find('> div.product-essential > div.product-shop > div > div.product-name > h1').text(),
                category: ['Weird', 'Urban', 'London', 'Colorful', 'Lazyoaf', type],
                price: price.substring(1, price.length),
                currency: price[0],
                url: url,
                sizes: sizes
            };
            return itemData;
        })
            .then((itemData) => {
                itemData.sex = foundLinks[i].sex;
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