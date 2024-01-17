const { join } = require('path');

const configurations = {
    logsFolderPath: join(__dirname, '..', 'logs'),
    searchCitiesFromUF: 'PI',
    scraper: {
        ignoreValidatedDataAlreadyCollected: true,
        browsersOpenAtSameTime: 3,
        delayBetweenBrowsersInstancesInMS: 10000,
    },
    xlsx: {
        filename: 'spreadsheet'
    },
    DEV: {
        activeLogs: false,
        showBrowserWorking: false
    }
}

module.exports = configurations;