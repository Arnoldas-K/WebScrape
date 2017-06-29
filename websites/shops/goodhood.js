var Nightmare = require('nightmare');
var nightmare = Nightmare();
var co = require('co');

nightmare
    .useragent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36')
    .viewport(1280, 1024)
    .goto('http://goodhoodstore.com/mens/outerwear')
    .wait('body > div.Page > div.Page-Body > div > article > div.ModuleContent.Section-Mens > ul > li:nth-child(1) > div.overview > a')
    .evaluate(function () { // collecting all types clothing pages for further browsing
        var clothesPages = [];
        // men clothing
        var links = document.querySelectorAll('#Mens-Clothing > li > a');
        for (var i = 2; i < links.length; i++) {
            clothesPages.push(links[i].href)
        } // i = 2, because first two not needed
        // men footwear
        var links = document.querySelectorAll('#Mens-Footwear > li > a');
        for (var i = 2; i < links.length; i++) {
            clothesPages.push(links[i].href)
        }
        // women
        var links = document.querySelectorAll('#Womens-Clothing > li > a');
        for (var i = 2; i < links.length; i++) {
            clothesPages.push(links[i].href)
        }
        //women footwear
        var links = document.querySelectorAll('#Womens-Shoes > li > a');
        for (var i = 2; i < links.length; i++) {
            clothesPages.push(links[i].href)
        }
        // returning collected pages
        return clothesPages;
    })
    .then(function (collectedLinks) {
        console.log(collectedLinks.length);
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

function insertData(foundData) {
    require('../../server')('goodhood', foundData);
}

let collectClothesLinks = function*(pagesLinks) {
    var clothesLinks = [];
    console.log(pagesLinks.length + ' types of clothes pages');
    for (let i = 10; i < pagesLinks.length; i++) { //
        console.log(pagesLinks[i]);
        var minWaitTime = Math.floor(Math.random() * (16000 - 8000 + 1)) + 8000;
        let pages = [];
        let nextPages = yield nightmare.goto(pagesLinks[i]).wait(minWaitTime).evaluate(() => {
                var links = [];
                var tempLinks = document.querySelectorAll('body > div.Page > div.Page-Body > div > article > div > p.Content-Header.Pages > span.Pages > a');
                for (var i = 0; i < tempLinks.length; i++) {
                    links.push(tempLinks[i].href);
                }
                return links;
            }
        ).catch(error => {
            console.log(error);
        });
        console.log(nextPages.length);
        // scrape initial page
        pages = yield nightmare.goto(pagesLinks[i]).wait(minWaitTime).evaluate(() => {
            var links = [];
            var type = document.querySelector('body > div.Page > div.Page-Body > p > a:nth-child(5)').innerText;
            var sex = document.querySelector('body > div.Page > div.Page-Body > p > a:nth-child(3)').innerText;
            sex = sex[0] + sex.slice(1).toLowerCase();
            type = type[0] + type.slice(1).toLowerCase();
            var linksHREF = document.querySelectorAll('body > div.Page > div.Page-Body > div > article > div > ul > li > div.overview > a');
            for (var i = 0; i < linksHREF.length; i++) {
                var linkInfo = {
                    "type": type,
                    "sex": sex,
                    "link": linksHREF[i].href,
                };
                links.push(linkInfo);
            }
            return links;
        }).catch(error => {
            console.log(error);
        });
        // if that page has next pages
        if (nextPages.length >= 1) {
            for (let p = 0; p < nextPages.length; p++) {
                console.log('going to next page ' + nextPages[p]);
                let newPages = yield nightmare.goto(nextPages[p]).wait(minWaitTime).evaluate(() => {
                    var links = [];
                    var type = document.querySelector('body > div.Page > div.Page-Body > p > a:nth-child(5)').innerText;
                    var sex = document.querySelector('body > div.Page > div.Page-Body > p > a:nth-child(3)').innerText;
                    sex = sex[0] + sex.slice(1).toLowerCase();
                    type = type[0] + type.slice(1).toLowerCase();
                    var linksHREF = document.querySelectorAll('body > div.Page > div.Page-Body > div > article > div > ul > li > div.overview > a');
                    for (var i = 0; i < linksHREF.length; i++) {
                        var linkInfo = {
                            "type": type,
                            "sex": sex,
                            "link": linksHREF[i].href,
                        };
                        links.push(linkInfo);
                    }
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

let collectClothesData = function*(clothesLink) {
    var data = [];
    var errorOccurred = false;
    for (let i = 0; i < clothesLink.length; i++) {
        console.log(clothesLink[i] + '|' + i + '/' + clothesLink.length);
        var minWaitTime = Math.floor(Math.random() * (16000 - 8000 + 1)) + 8000;
        let item = yield nightmare.goto(clothesLink[i].link).wait(minWaitTime).evaluate(() => {
            var url = window.location.href;
            var price = document.querySelector('#Product-Detail-Box > div > p > span.Price1').innerText.split(/\s*[\s,]\s*/)[0];
            var size = document.querySelectorAll('#Product-Detail-Box > div > div.Items.Product-Detail-Items > form:nth-child(2) > p:nth-child(1) > select > option');
            var type = '';
            var sizes = [];
            var brand = document.querySelector('#Brand-Title').innerText;
            var hover = document.querySelector('body > div.Page > div.Page-Body > div > article > div > div > div > div.imgs.list > div:nth-child(1) > a > img').src;
            ;
            if (hover === undefined) {
                hover = '';
            }
            for (var i = 1; i < size.length; i++) {
                sizes.push(size[i].innerText);
            }
            var itemData = {
                sex: '',
                season: 'Universal',
                type: type,
                cover: document.querySelector('body > div.Page > div.Page-Body > div > article > div > div > div > div:nth-child(1) > div.img > a > img').src,
                hover: hover,
                name: document.querySelector('#Product-Detail-Box > div > h1').childNodes[2].nodeValue.trim(),
                category: ['Urban', 'Luxury', 'GoodHood', brand],
                price: price.slice(1),
                currency: price[0],
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
                    console.log('trying one more time');
                    errorOccurred = true;
                    i--;
                } else if (errorOccurred) {
                    console.log('Skipping ' + clothesLink[i]);
                    errorOccurred = false;
                }
            });
        data.push(item);
    }
    return data;
};

function removeDuplicates(originalArray, prop) {
    var newArray = [];
    var lookupObject = {};

    for (var i in originalArray) {
        lookupObject[originalArray[i][prop]] = originalArray[i];
    }

    for (i in lookupObject) {
        newArray.push(lookupObject[i]);
    }
    return newArray;
}
