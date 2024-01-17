const { get } = require('node:https');
const CustomError = require('../CustomError');

class FetchStates {

    /** @type {{ name: string; UF: string }[]} */
    #UF = [];

    #cachedCities = [];
    #customError = new CustomError({ moduleName: FetchStates.name, allowCreateLogs: true });

    getCitiesByUF(UF) {
        this.#UF = UF;
        return this;
    }

    /** @param {{ city: { name: string; UF: string }; scrapedData: any[]; allDataValidated: boolean; }[]} cachedCities  */
    filterUnsavedCitiesByFileCache(cachedCities) {
        this.#cachedCities = cachedCities;
        return this;
    }

    async #fetchCities(UF) {
        const endpoint = 'https://gist.githubusercontent.com/letanure/3012978/raw/6938daa8ba69bcafa89a8c719690225641e39586/estados-cidades.json';

        const data = await new Promise((resolve, reject) => {
            get(endpoint, res => {
                const data = [];
                res.on('data', chunk => data.push(chunk));
                res.on('end', () => resolve(
                    JSON.parse(Buffer.concat(data).toString())
                ));
            }).on('error', reject).end();
        });

        const cities = data.estados
        .find(state => state.sigla === UF).cidades
        .map(cityName => ({ name: cityName, UF }));

        this.#customError.message({ fnName: this.#fetchCities.name, message: `Quantity of cities find "${cities.length}"` });

        return cities;
    }

    /**
     * @param {{ city: { name: string; UF: string }[] }} cities
     * @param {{ city: { name: string; UF: string }; scrapedData: any[]; allDataValidated: boolean; }[]} cachedCities
     *  */
    #filterUnsavedCitiesByFileCache(cities, cachedCities) {
        const filteredCities = cities.filter(city => {
            const cachedCity = cachedCities.find(cachedCity => cachedCity.city.name === city.name && cachedCity.allDataValidated);
            return !cachedCity;
        });
        this.#customError.message({ fnName: this.#filterUnsavedCitiesByFileCache.name, message: `Quantity of cities after filter "${filteredCities.length}"` });
        return filteredCities;
    }

    /** @returns {{ name: string, UF: string }[]} */
    async get() {
        const cities = this.#cachedCities.length
            ? await (async () => {
                const cities = await this.#fetchCities(this.#UF);
                return this.#filterUnsavedCitiesByFileCache(cities, this.#cachedCities);
            })()
            : await this.#fetchCities(this.#UF);

        // return cities.splice(0, 5);
        return cities;
    }

}

module.exports = FetchStates;