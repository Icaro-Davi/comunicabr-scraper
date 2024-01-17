'use strict';
const { launch, Browser } = require('puppeteer-core');
const { path: chromiumPath } = require('chromium');

const WebScraperPage = require('./Scraper');
const CustomError = require('../CustomError');
const ScraperData = require('./ScraperData');
const fakePromise = require('../utils/fakePromise');

class Scraper {

    /** @type {Browser[]} */
    #browsers = undefined;
    /** @type {WebScraperPage[]} */
    #scrapers = [];
    /** @type {ScraperData[]} */
    #scrapedData = [];
    #scraperQuantity = 1;
    #cities = [];
    #failedCities = [];
    #activeLogs = false;
    #customError = new CustomError({ moduleName: Scraper.name, allowCreateLogs: true });
    #activeBrowserHeadless = false;
    #delayBetweenBrowsersInstances = 0;

    #onScraper = () => { };

    /**
     * @param {object} params
     * @param {number} params.scraperQuantity
     * @param {number} params.activeLogs
     * @param {number} params.showBrowserWorking
     * @param {number} params.delayBetweenBrowsersInstancesInMS
     *  */
    constructor(params) {
        this.#scraperQuantity = params.scraperQuantity;
        this.#activeLogs = params.activeLogs;
        this.#activeBrowserHeadless = !params.showBrowserWorking;
        this.#delayBetweenBrowsersInstances = params.delayBetweenBrowsersInstancesInMS;
    }

    getScrapedData() {
        return this.#scrapedData;
    }

    /** @param {{name: string; UF: string}} cities  */
    async scraperCities(cities) {
        this.#cities = cities;
        await this.#openBrowsers();
        await this.#startScrapers();
        this.#customError.warn({ fnName: this.#startScrapers.name, message: 'All cities scraped.' });
        return this;
    }

    async #openBrowser() {
        if (!chromiumPath) {
            throw this.#customError.throw({ fnName: run.name, message: 'Chromium path not found, maybe need install' });
        }
        return await launch({
            headless: this.#activeBrowserHeadless ? 'new' : false,
            executablePath: chromiumPath,
            args: ['--disable-features=site-per-process'],
        });
    }

    async #openBrowsers() {
        this.#browsers = await Promise.all(new Array(this.#scraperQuantity).fill(0).map(_ => this.#openBrowser()));
        this.#customError.message({ fnName: this.#openBrowsers.name, message: `${this.#scraperQuantity} Browser(s) created` });
    }

    async #startScrapers() {
        this.#scrapers = await Promise.all(new Array(this.#scraperQuantity).fill(0).map((_, index) => new WebScraperPage().init(this.#browsers[index])));
        return new Promise(async (resolve, reject) => {
            try {
                this.#scrapers.forEach(async (scraper, index) => {
                    await fakePromise(this.#delayBetweenBrowsersInstances);
                    this.#activeLogs && scraper.onLog(message => console.log(message));
                    scraper.onStarting(city => {
                        this.#customError.message({ fnName: this.#startScrapers.name, message: `"${city.name} - ${city.UF}" ${this.#cities.length} left` });
                    });
                    scraper.onDone((scraperData) => {
                        scraperData = new ScraperData(scraperData);
                        this.#scrapedData.push(scraperData);
                        if (this.#onScraper) {
                            this.#onScraper(scraperData)
                                ?.catch(err => this.#customError.warn({ fnName: this.#onScraper.name, message: `${err}` }));
                        }
                        if (this.#cities.length) {
                            scraper.extractDataFromCity(this.#cities.pop());
                        } else {
                            if (scraper.isWorking()) return;
                            this.#browsers[index].close().then(() => {
                                this.#browsers.splice(index, 1);
                            });
                            resolve();
                        }
                    });
                    scraper.onError(async ({ error, city }) => {
                        this.#failedCities.push(city);
                        await this.#customError.warn({
                            fnName: this.#startScrapers.name,
                            message: `Error on extractDataFromCity (${city.name} - ${city.UF}) ${error}`
                        });

                        await scraper.destroy();
                        if (this.#cities.length){
                            this.#browsers[index] = await this.#openBrowser();
                            await scraper.init(this.#browsers[index]);
                            scraper.extractDataFromCity(this.#cities.pop());
                        }
                    });
                    scraper.extractDataFromCity(this.#cities.pop());
                });
            } catch (error) {
                reject(await this.#customError.throw({ fnName: this.#startScrapers.name, message: `Scraper Broke. ${error}` }));
            }
        });
    }

    /** @param {(scraperData: ScraperData) => void} fn  */
    onScraper(fn) {
        this.#onScraper = fn;
        return this;
    }

}

module.exports = Scraper;