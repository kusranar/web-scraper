const request = require('request');
const cheerio = require('cheerio');
const Bluebird = require('bluebird');
const fs = require('fs');
const source = `${__dirname}/model/solution.json`;
let solution = (fs.existsSync(source) ? JSON.parse(fs.readFileSync(source, {encoding: 'utf8'})) : []);

const url = 'https://www.bankmega.com/';

let getRequest = (url) => {
    const promise = new Bluebird( (resolve, reject) => {
        request(url, (error, response, body) => {
            if(!error && response.statusCode == 200){
                resolve(body);
            } else {
                reject("error get request");
            }
        });
    });
    return promise;
}

let searchCategory = (extUrl, search) => {
    const newUrl = url + extUrl;
    getRequest(newUrl)
        .then( body => {
            const $ = cheerio.load(body);
            const $promoBy = $('#contentpromolain2 div').first().find('div');
            $promoBy.each( (i, elem) => {
                const $element = $(elem);
                if($element.text().trim() == search){
                    searchSubPromo(newUrl + '?product=1');
                }
            });
        })
        .catch( error => {
            console.log(`${error} search category`);
        })
}

let searchSubPromo = (url) => {
    getRequest(url)
        .then( body => {
            const $ = cheerio.load(body);
            const $subCatPromo = $('#subcatpromo div');

            $subCatPromo.each( (i, elem) => {
                const $element = $(elem);
                let subPromo = $element.find('img').attr('title').replace(/&/g, "And").replace(/ /g, "");
                solution[subPromo] = [];
                save(solution);
                searchPromo(url, i+1, subPromo);
            });
        })
        .catch( error => {
            console.log(`${error} search sub promo`);
        });
}

let searchPromo = (url, index, subPromo) => {
    const newUrl = url + '&subcat=' + index;

    getRequest(newUrl)
        .then( body => {
            const $ = cheerio.load(body);
            let pages = $('.tablepaging tbody tr td').length;
            for(let i = 1; i < pages - 1; i++){
                getRequest(newUrl + '&page=' + i)
                    .then( body => {
                        const $ = cheerio.load(body);
                        let $promos = $('#promolain li');
                        $promos.each( (indx, elemt) => {
                            let $element = $(elemt);
                            let link = $element.find('a').attr('href');
                            insertPromo(subPromo, link);
                        })
                    })
            }
        })
        .catch( error => {
            console.log(`${error} search promo`);
        })
}

let insertPromo = (subPromo, link) => {
    let newLink = "";
    if(!link.includes("http")){
        newLink += url + link;
    } else {
        newLink += link;
    }
    console.log(newLink);
    getRequest(newLink)
        .then( body => {
            const $ = cheerio.load(body);
            const $title = $('.titleinside h3');
            const $areaPromo = $('.area b');
            const $periodePromo = $('.periode b');
            let result = {
                title : $title.text(),
                areaPromo : $areaPromo.text(),
                periodePromo : $periodePromo.text(),
                image : newLink
            };

            if(subPromo == "Travel"){
                solution.Travel.push(result);
            } else if(subPromo == "Lifestyle"){
                solution.Lifestyle.push(result);
            } else if(subPromo == "FoodAndBeverages"){
                solution.FoodAndBeverages.push(result);
            } else if(subPromo == "GadgetAndEntertainment"){
                solution.GadgetAndEntertainment.push(result);
            } else if(subPromo == "DailyNeeds"){
                solution.DailyNeeds.push(result);
            } else {
                solution.Others.push(result);
            }

            save(solution);
        })
        .catch( error => {
            console.log(`${error} insert promo`);
        })
}

let save = (data) => {
    fs.writeFileSync(source, JSON.stringify(data));
}

searchCategory("promolainnya.php", "Kartu Kredit");

