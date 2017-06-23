/**
 * Created by Arnoldas on 22/06/2017.
 */
var Nightmare = require('nightmare');
var nightmare = Nightmare();
var co = require('co');

var links = [];
var data = [];

nightmare
    .useragent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36')
    .viewport(1280, 1024)
    .goto('http://www.grindlondon.com/store/')
    .screenshot('test.png')
    .wait('#post-4 > div')
    .evaluate(function () {
        var links = [];
        jQuery('#post-4').find('div > div > ul > li > a.woocommerce-LoopProduct-link').each(function (item) {
            var link = jQuery(this).attr("href");
            links.push(link);
        });
        return links;
    })
    .then(function (newLinks) {
        co(getData(newLinks)).then(function (scrapedData) {
            console.log('done');
            nightmare.end();
            insertData(scrapedData); // inserting data to the db
            //return insertData;
        }, function (err) {
            console.log(err);
        });
    })
    .catch(function (err) {
        console.error('Found an error ' + err);
    });

function insertData(foundData) { require('../../server')('GRINDLONDON', foundData); }

let getData = function *(linksList) {
    let data = [];
    let linkai = ['http://www.grindlondon.com/product/pullover-navy/', 'http://www.grindlondon.com/product/pullover-mint/', 'http://www.grindlondon.com/product/pullover-white/'];
    for (let i = 0; i < 2; i++) {
        console.log(linkai[i]);
        var minWaitTime = Math.floor(Math.random() * (30000 - 8000 + 1)) + 8000;
        let item = yield nightmare.goto(linkai[i]).wait(minWaitTime).evaluate(() => {
            var url = window.location.href;
            var price = jQuery('#main').find('div.summary.entry-summary > div:nth-child(2) > p > span').text();
            var type = jQuery('#main').find('nav > a:nth-child(3)').text();
            var sizes = [];
            jQuery('#size').find('option.attached.enabled').each(function () { sizes.push(this.innerText); });
            var itemas = {
                sex: 'Men',
                season: 'Universal',
                type: type,
                cover: String(jQuery('div.a3-dgallery > div.a3dg-nav > div.a3dg-thumbs > ul > li.first_item > a').attr('href')),
                hover: String(jQuery('div.a3-dgallery > div.a3dg-nav > div.a3dg-thumbs > ul > li.last_item > a').attr('href')),
                name: jQuery('#main').find('div.summary.entry-summary > h1').text(),
                category: ['Urban', 'Street', 'London', 'GRINDLONDON', type],
                price: price.substring(1, price.length),
                currency: price[0],
                url: url,
                sizes: sizes
            };
            return itemas;
        });
        data.push(item);
    }
    return data;
};