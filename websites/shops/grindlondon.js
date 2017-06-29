/**
 * Created by Arnoldas on 22/06/2017.
 */
var Nightmare = require('nightmare');
var nightmare = Nightmare();
var co = require('co');

nightmare
    .useragent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36')
    .viewport(1280, 1024)
    .goto('http://www.grindlondon.com/store/')
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
            insertData(scrapedData);
        });
    })
    .catch(function (err) {
        console.error('Found an error ' + err);
    });

function insertData(foundData) {
    require('../../server')('GRINDLONDON', foundData);
}

let getData = function *(linksList) {
    let data = [];
    var errorOccurred = false;
    for (let i = 0; i < linksList.length; i++) {
        console.log(linksList[i] + '|' + i + '/' + linksList.length);
        var minWaitTime = Math.floor(Math.random() * (16000 - 8000 + 1)) + 8000;
        let item = yield nightmare.goto(linksList[i]).wait(minWaitTime).evaluate(() => {
            var url = window.location.href;
            var price = jQuery('#main').find('div.summary.entry-summary > div:nth-child(2) > p > span').text();
            var type = jQuery('#main').find('nav > a:nth-child(3)').text();
            var sizes = [];
            jQuery('#size').find('option.attached.enabled').each(function () {
                sizes.push(this.innerText);
            });
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
            })
            .catch(error => {
                console.log(error);
                if(!errorOccurred) { // if error didn't occur before, give it one more chance
                    errorOccurred = true;
                    i--;
                } else if(errorOccurred){
                    console.log('Skipping ' + linksList[i]);
                    errorOccurred = false;
                }
            });
        data.push(item);
    }
    return data;
};