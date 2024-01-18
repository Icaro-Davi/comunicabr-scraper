const { join } = require('node:path');
const configurations = require('./configurations');

const CustomError = require('./CustomError');
const DynamicFile = require('./Files/DynamicFile');
const FetchStates = require('./FetchStates');
const Scraper = require('./Scraper');
const ScraperData = require('./Scraper/ScraperData');
const SaveToXLSXModule = require('./Files/SaveToXLSX');

async function main() {
    const customError = new CustomError({ moduleName: 'ROOT', allowCreateLogs: true });

    customError.warn({ fnName: main.name, message: `=== Starting new scrapping for UF "${configurations.searchCitiesFromUF}" ===` });

    const dynamicFile = new DynamicFile(join(__dirname, 'Data', `${configurations.searchCitiesFromUF}.json`));
    const fetchCities = new FetchStates()
        .getCitiesByUF(configurations.searchCitiesFromUF);

    if (configurations.scraper.ignoreValidatedDataAlreadyCollected) {
        fetchCities.filterUnsavedCitiesByFileCache(JSON.parse(await dynamicFile.getFile() ?? "[]"));
    }

    const cities = await fetchCities.get();
    const cachedScrapedData = JSON.parse(await dynamicFile.getFile() ?? [])
        .map(cachedScrapedData => new ScraperData({
            city: cachedScrapedData.city,
            data: cachedScrapedData.scrapedData
        }));

    let rows = [];
    if (cities.length) {
        const data = (await new Scraper({
            scraperQuantity: (configurations.scraper.browsersOpenAtSameTime < cities.length)
                ? configurations.scraper.browsersOpenAtSameTime
                : cities.length,
            activeLogs: configurations.DEV.activeLogs,
            showBrowserWorking: configurations.DEV.showBrowserWorking,
            delayBetweenBrowsersInstancesInMS: configurations.scraper.delayBetweenBrowsersInstancesInMS
        })
            .onScraper((scrapedData) => scrapedData.save(dynamicFile))
            .scraperCities(cities))
            .getScrapedData();
        rows = data.map(scrapedData => scrapedData.toXLSXLine());
    }

    rows = [ ...cachedScrapedData.map(scrapedData => scrapedData.toXLSXLine()), ...rows ];

    await ScraperData.toXLSXFile({
        rows, saveToXLSXModule: new SaveToXLSXModule({
            folderPath: join(__dirname, 'Data'), filename: configurations.xlsx.filename,
            sheetName: configurations.searchCitiesFromUF
        })
    });

    customError.warn({ fnName: main.name, message: `Scraper done.` });
}

main();