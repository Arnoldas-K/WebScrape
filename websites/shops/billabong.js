/**
 * Created by Arnoldas on 24/06/2017.
 */
var Nightmare = require('nightmare');
var nightmare = Nightmare();
var co = require('co');
// TODO: reduce timers
nightmare
    .useragent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36')
    .viewport(1280, 1024)
    .goto('http://eu.billabong.com/shop/mens')
    .wait('#shop-menu')
    .evaluate(function () { // collecting all types clothing pages for further browsing
        var clothesPages = [];
        var menu = $('#shop-menu');
        // men
        menu.find('> ul > li:nth-child(1) > ul > li:nth-child(2) > ul > li > a').each(function () {
            clothesPages.push('http://eu.billabong.com' + $(this).attr('href'));
        });
        // women
        menu.find('> ul > li:nth-child(2) > ul > li:nth-child(2) > ul > li > a').each(function () {
            clothesPages.push('http://eu.billabong.com' + $(this).attr('href'));
        });
        // boys
        menu.find('> ul > li:nth-child(3) > ul > li:nth-child(1) > ul > li > a').each(function () {
            clothesPages.push('http://eu.billabong.com' + $(this).attr('href'));
        });
        // girls
        menu.find('> ul > li:nth-child(4) > ul > li:nth-child(1) > ul > li > a').each(function () {
            clothesPages.push('http://eu.billabong.com' + $(this).attr('href'));
        });
        // returning collected pages
        return clothesPages;
    })
    .then(function (collectedLinks) {
        co(collectClothesLinks(collectedLinks)).then(function (foundLinks) { // looking if found pages have further pages
            console.log(foundLinks.length + ' - clothes found');
            var uniqueArray = removeDuplicates(foundLinks, "link");
            console.log("Clothes found after duplicates were removed : " + foundLinks.length);
            co(collectClothesData(uniqueArray)).then(function (scrapedData) {
                console.log(scrapedData.length + ' - scraped clothes');
                insertData(scrapedData);
                return nightmare.end(); // terminating electron instances
            });
        });
    })
    .catch(function (err) {
        console.log("Found an error " + err);
    });

function insertData(foundData) { require('../../server')('billabong', foundData); }

let collectClothesLinks = function *(pagesLinks) {
    var clothesLinks = [];
    console.log(pagesLinks + ' types of clothes pages');
    for (let i = 0; i < pagesLinks.length; i++) { // i = 0 i < 3 finished | awaits - i 3 i < pagesLinks.length
        var minWaitTime = Math.floor(Math.random() * (16000 - 8000 + 1)) + 8000;
        let pages = [];
        let nextPages = yield nightmare.goto(pagesLinks[i]).wait(minWaitTime).evaluate(()=> {
            return jQuery('body > div.site-wrapper > div.content-wrapper.wall-wrapper > section.heading-holder > div > div.pag_filter > div').attr('data-pages');
        }).catch(error => {
            console.log(error);
        });
        if (nextPages == 1) { // if there is no next pages
            console.log('just one page ' + pagesLinks[i]);
            pages = yield  nightmare.goto(pagesLinks[i]).wait(minWaitTime).evaluate(() => {
                var links = [];
                var type = jQuery('#breadcrumbs').find('span:last').text();
                var sex = jQuery('#breadcrumbs').find('span:nth-child(2) > a').text();
                sex = sex[0].toUpperCase() + sex.slice(1).toLowerCase();
                jQuery('#product-wall').find('li > div > a').each(function () {
                    var linkInfo = { "type" : type, "sex" : sex, "link" : 'http://eu.billabong.com' + $(this).attr('href')};
                    links.push(linkInfo);
                });
                return links;
            }).catch(error => {
                console.log(error);
            });
        } else if (nextPages > 1) {
            console.log('more than one page ' + pagesLinks[i]);
            for (let p = 1; p <= nextPages; p++) {
                console.log(pagesLinks[i] + '#!sort=custom&page=' + p);
                let newPages = yield  nightmare.goto(pagesLinks[i] + '#!sort=custom&page=' + p).wait(minWaitTime).evaluate(() => {
                    var links = [];
                    var type = jQuery('#breadcrumbs').find('span:last').text();
                    var sex = jQuery('#breadcrumbs').find('span:nth-child(2) > a').text();
                    sex = sex[0].toUpperCase() + sex.slice(1).toLowerCase();
                    jQuery('#product-wall').find('li > div > a.product-image').each(function () {
                        var linkInfo = { "type" : type, "sex" : sex, "link" : 'http://eu.billabong.com' +$(this).attr('href')};
                        links.push(linkInfo);
                    });
                    return links;
                }).catch(error => {
                    console.log(error);
                });
                pages = pages.concat(newPages);
            }
        }
        clothesLinks = clothesLinks.concat(pages);
    }
    return clothesLinks;
};

let collectClothesData = function *(clothesLink) {
    var data = [];
    var errorOccurred = false;
    for (let i = 0; i < clothesLink.length; i++) {
        console.log(clothesLink[i].url + '|' + i + '/' + clothesLink.length);
        var minWaitTime = Math.floor(Math.random() * (16000 - 8000 + 1)) + 8000;
        let item = yield nightmare.goto(clothesLink[i].link).wait(minWaitTime).evaluate(() => {
            var url = window.location.href;
            var price = jQuery('body > div.site-wrapper > div.content-wrapper > section.product-detail.product-detail-index.an > div > div > div.product-info > div > header > h3 > span:nth-child(1) > span').text();
            var type = '';
            var sizes = [];
            var hover = String(jQuery('body > div.site-wrapper > div.content-wrapper > section.product-detail.product-detail-index.an > div > div > div.details-gallery > div.alternate-views.row-fluid > div > ul:nth-child(1) > li:nth-child(2) > a').attr('href'));
            if(hover !== undefined){ hover = 'http://eu.billabong.com' + hover;} else { hover = '';}
            jQuery('#CartIndexForm').find('> div.size-holder > ul > li > a').each(function(){
                var size = { size : $(this).text() };
                sizes.push(size);
            });
            var itemData = {
                sex: '',
                season: 'Universal',
                type: type,
                cover: 'http://eu.billabong.com' + String(jQuery('body > div.site-wrapper > div.content-wrapper > section.product-detail.product-detail-index.an > div > div > div.details-gallery > div.alternate-views.row-fluid > div > ul:nth-child(1) > li:nth-child(1) > a').attr('href')),
                hover: hover,
                name: jQuery('body > div.site-wrapper > div.content-wrapper > section.product-detail.product-detail-index.an > div > div > div.product-info > div > header > h1').text(),
                category: ['Surfboarding', 'Youth', 'billabong'],
                price: price.substring(0, price.length-2),
                currency: price[price.length-1],
                url: url,
                sizes: sizes
            };
            return itemData;
            })
            .then((itemData) => {
                itemData.type = clothesLink[i].type;
                itemData.sex = clothesLink[i].sex;
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

function removeDuplicates(originalArray, prop) {
    var newArray = [];
    var lookupObject  = {};

    for(var i in originalArray) {
        lookupObject[originalArray[i][prop]] = originalArray[i];
    }

    for(i in lookupObject) {
        newArray.push(lookupObject[i]);
    }
    return newArray;
}