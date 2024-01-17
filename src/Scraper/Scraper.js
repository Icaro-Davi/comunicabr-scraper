'use strict';
const Event = require('node:events');
const { Browser, Page, Frame } = require('puppeteer-core');

const CustomError = require('../CustomError');
const BaseScraper = require('./base/Scraper.base');

const fakePromise = require('../utils/fakePromise');
const eventsEnum = require('./events.enum');
const knownPagesEnum = require('./pages.enum');

class WebScraperPage extends BaseScraper {

    /** @type {Page} */
    #page = undefined;
    /** @type {Frame} */
    #iframe = undefined;
    #working = false;
    #event = new Event();
    #textContentParts = [];
    #currentPageName = undefined;
    #customError = new CustomError({ moduleName: WebScraperPage.name, allowCreateLogs: true });

    async #openPage(browser) {
        this.#page = await browser.newPage();
        await this.reload();
    }

    async reload() {
        await this.#page.goto('https://governa.presidencia.gov.br/painel_publico/#/edbfb1b7-78a7-44a4-988d-87d4c8895246/5d526078-a15a-47b3-83a4-20e20a693aad');
        this.#currentPageName = knownPagesEnum.MAIN;
        // await this.page.setViewport({ width: 2000, height: 1024 });
        await this.#page.waitForNetworkIdle({ idleTime: 5000 });
        await this.#page.waitForSelector('iframe');
        this.#iframe = await this.#page.frames()[1];
        this.#textContentParts = [];
        this.#working = false;
        if (!this.#iframe) {
            throw await this.#customError.throw({ fnName: this.#selectCityInList.name, message: 'Iframe not found.' });
        }
    }

    /** @param {Browser} browser  */
    async init(browser) {
        if (!this.#page) {
            await this.#openPage(browser);
        } else {
            this.#customError.warn({ fnName: this.init.name, message: 'Page already created' });
        }
        return this;
    }

    async destroy(){
        try {
            await this.#page.browser().close();
            this.#page = undefined;
            this.#iframe = undefined;
            this.#working = false;
            this.#textContentParts = [];
            this.#currentPageName = undefined;
            this.#customError.warn({ fnName: this.destroy.name, message: 'Browser destroyed' });
        } catch (error) {
            throw this.#customError.throw({ fnName: this.destroy.name, message: `Error on destroy browser ${error}` });
        }
    }

    async #selectCityInList(cityName) {
        try {
            this.#emitLog(`Searching for "${cityName}"`);
            this.#iframe.waitForSelector('input');
            this.#iframe.waitForSelector('.slicer-content-wrapper');
            const selectElements = (await this.#iframe.$$('.slicer-content-wrapper'))[2];
            await selectElements.click();
            await fakePromise(500);
            await this.#iframe.$$eval('input', (inputElements) => (inputElements[2].value = ''));
            await selectElements.type(cityName);
            await this.#iframe.waitForSelector('.slicerCheckbox:not(.selected)');
            const listElement = (await this.#iframe.$$('.visibleGroup'))[2];
            await fakePromise(2000);
            const firstSearchedMatchElement = await listElement.$('.row');
            await firstSearchedMatchElement.click();
            await this.#page.keyboard.press('Escape');
            await this.#page.keyboard.press('Escape');
            await fakePromise(1000);
            this.#emitLog(`City selected "${cityName}"`);
        } catch (error) {
            throw await this.#customError.throw({ fnName: this.#selectCityInList.name, message: `Error on find city. ${error}` });
        }
    }

    async #selectBtnOptionFromMainPage(clickOffsetX, clickOffsetY, dotColor) {
        if (this.#currentPageName === knownPagesEnum.MAIN) {
            const imagesElement = await this.#iframe.$$('[data-testid="visual-content-desc"]');
            const { x, y } = await imagesElement[14].boundingBox();
            dotColor && await this.#createDot(x + clickOffsetX, y + clickOffsetY, dotColor);
            await this.#page.mouse.click(x + clickOffsetX, y + clickOffsetY);
            await fakePromise(1000);
            const btnSearchElement = (await this.#iframe.$$('.imageBackground'))[3];
            await btnSearchElement.click();
            await this.#iframe.waitForSelector('[width="315"][height="50"] tspan');
            await fakePromise(5000);
        } else {
            this.#emitLog(`This action cannot run on this page "${this.#currentPageName}"`);
        }
    }

    async #navigateToFacade({ currentPageName, clickOffset: { x, y }, fnName, dotColor }) {
        try {
            this.#emitLog(`Selecting "${currentPageName}" Menu Button`);
            await this.#selectBtnOptionFromMainPage(x, y, dotColor);
            this.#currentPageName = currentPageName;
            this.#emitLog(`Selected "${currentPageName}" Menu Button`);
        } catch (error) {
            throw await this.#customError.throw({ fnName, message: `Error on try select "${currentPageName}" button. ${error}` });
        }
    }

    async #navigateToJobPage() {
        await this.#navigateToFacade({
            currentPageName: knownPagesEnum.JOBS,
            clickOffset: { x: 300, y: 70 },
            fnName: this.#navigateToJobPage.name,
        });
    }

    async #navigateToCulturePage() {
        await this.#navigateToFacade({
            currentPageName: knownPagesEnum.CULTURE,
            clickOffset: { x: 130, y: 70 },
            fnName: this.#navigateToCulturePage.name,
        });
    }

    async #navigateToCitizenPage() {
        await this.#navigateToFacade({
            currentPageName: knownPagesEnum.CITIZEN,
            clickOffset: { x: 220, y: 150 },
            fnName: this.#navigateToCitizenPage.name,
        });
    }

    async #navigateToStatesAndMunicipalitiesPage() {
        await this.#navigateToFacade({
            currentPageName: knownPagesEnum.STATE_AND_MUNICIPALITIES,
            clickOffset: { x: 300, y: 150 },
            fnName: this.#navigateToStatesAndMunicipalitiesPage.name,
        });
    }

    async #extractTextContent() {
        try {
            this.#emitLog('Extracting textContent');
            const textContent = await this.#iframe.$$eval('[width="315"][height="50"] tspan', elements => elements.map(element => element.textContent));
            this.#emitLog(`Extraction textContent succeeded`);
            this.#textContentParts.push({ from: this.#currentPageName, textContent });
        } catch (error) {
            this.#emitLog(`Extraction textContent failed`);
            throw await this.#customError.throw({ fnName: this.#extractTextContent.name, message: `Error on extract text content. ${error}` });
        }
    }

    async #goBackToMainPage() {
        try {
            const homeBtnElement = (await this.#iframe.$$('[data-sub-selection-object-name="visual-area"]'))[1];
            const { x, y, width, height } = await homeBtnElement.boundingBox();
            await this.#page.mouse.click(x + (width / 2), y + (height / 2));
            this.#currentPageName = 'main';
            await fakePromise(5000);
            this.#emitLog('Going back to main menu');
        } catch (error) {
            throw await this.#customError.throw({ fnName: this.#goBackToMainPage.name, message: `Error on try go back to main page. ${error}` });
        }
    }

    async extractDataFromCity(city) {
        try {
            if (this.#working) return;
            this.#working = true;
            this.#emitStarting(city);

            await this.#selectCityInList(`${city.name} - ${city.UF}`);
            const steps = [
                this.#navigateToJobPage,
                this.#navigateToCulturePage,
                this.#navigateToCitizenPage,
                this.#navigateToStatesAndMunicipalitiesPage
            ]
            for await (const goToPage of steps) {
                await goToPage.call(this);
                await this.#extractTextContent();
                await this.#goBackToMainPage();
            }

            this.#working = false;
            this.#emitDone({ city, data: this.#textContentParts });
            this.#textContentParts = [];
        } catch (error) {
            this.#emitError({ error, city });
        }
    }

    async #createDot(x, y, color = 'red') {
        await this.#page.evaluate(({ x, y, color }) => {
            const span = document.createElement('span');
            span.style = `top:${y}px;left:${x}px;position:absolute;width:10px;height:10px;z-index:999;background-color:${color};`;
            document.body.append(span);
        }, { x, y, color });
    }

    isWorking() {
        return this.#working;
    }

    #emitStarting(message) {
        this.#event.emit(eventsEnum.STARTING, message);
    }

    onStarting(fn) {
        this.#event.on(eventsEnum.STARTING, fn);
    }

    #emitDone(message) {
        this.#event.emit(eventsEnum.DONE, message);
    }

    onDone(fn) {
        this.#event.on(eventsEnum.DONE, fn);
    }

    #emitError({ error, city }) {
        this.#event.emit(eventsEnum.ERROR, { error, city });
    }

    onError(fn) {
        this.#event.on(eventsEnum.ERROR, fn);
    }

    #emitLog(message) {
        this.#event.emit(eventsEnum.LOGS, message);
    }

    onLog(fn) {
        this.#event.on(eventsEnum.LOGS, fn);
    }
}

module.exports = WebScraperPage;