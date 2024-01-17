const CustomError = require("../CustomError");
const DynamicFile = require("../Files/DynamicFile");
const SaveToXLSXModule = require("../Files/SaveToXLSX");
const pagesEnum = require('./pages.enum');

class ScraperData {

    /**
     * @type {{ name: string; UF: string }}
     */
    #city = undefined;

    /**
     * @type {{ from: string; textContent: string[]; isValidated: boolean }[]}
     */
    #scraperData = undefined;

    #allDataValidated = true;

    static #xlsxHeaderRow = [
        // City
        'Cidade',

        // jobs
        'Trabalhadores com CLT',
        'MEI cadastrados',
        'Empresas optantes do Simples Nacional',
        'N° pessoas podem renegociar suas dívidas',

        // culture
        'R$ investidos para a produção cultural local',
        '(Em branco)',

        // citizen
        'N° de famílias que ganharam na minha casa minha vida',
        'R$ contratados pelas famílias que financiaram suas pelo minha casa minha vida',
        'N° pessoas atendidas pelo programa Bolsa família',
        'R$ valor médio do beneficio pago pelo Bolsa família',
        '(Em Branco)',

        // state_and_municipalities
        'R$ transferido para aplicação em obras públicas',
        'R$ transferido para aplicação da saúde da população',
        '(Em Branco)',
        '(Em Branco)'
    ];

    /**
     * @param {object} params
     * @param {object[]} params.data
     * @param {string} params.data.from
     * @param {string[]} params.data.textContent
     * @param {string[]} params.data.isValidated
     * @param {object} params.city
     * @param {string} params.city.name
     * @param {string} params.city.UF
     */
    constructor(params) {
        this.#city = params.city;
        this.#scraperData = this.#validateData(
            this.#filterData(params.data)
        );
    }

    #validateData(data) {
        return data.map(scraperData => {
            let isValidated = true;
            switch (scraperData.from) {
                case pagesEnum.JOBS:
                    isValidated = scraperData.textContent.length === 4;
                    scraperData.textContent = scraperData.textContent
                        .map(text => this.#convertTextToNumber(text));
                    break;
                case pagesEnum.CITIZEN:
                    isValidated = scraperData.textContent.length === 5;
                    scraperData.textContent = scraperData.textContent
                        .map(text => this.#convertTextToNumber(text));
                    break;
                case pagesEnum.CULTURE:
                    isValidated = scraperData.textContent.length === 2;
                    break;
                case pagesEnum.STATE_AND_MUNICIPALITIES:
                    isValidated = scraperData.textContent.length === 4;
                    break;
            }
            if (!isValidated) {
                this.#allDataValidated = false;
            }
            return { ...scraperData, isValidated };
        });
    }

    /** @param {string} text  */
    #convertTextToNumber(text) {
        const regex = /^[\d]+(?:\.{1})?(?:\d+)?$/g;
        if (text.match(regex))
            return Number(text.replace('.', ''));
        else return text;
    }

    #filterData(data) {
        const regex = /^(?:R\$\s?)?\d+.?,?\s?(?:\d+)?\s?(?:[MmilBbi]+)?|\(Em branco\)$/g;
        data = data.map(scraperData => ({
            ...scraperData,
            textContent: scraperData.isValidated
                ? scraperData.textContent
                : scraperData
                    .textContent
                    .filter(text => text.match(regex))
        }));
        return data;
    }

    /** @param {DynamicFile} dynamicFile  */
    save(dynamicFile) {
        dynamicFile.save({
            city: this.#city,
            scrapedData: this.#scraperData,
            allDataValidated: this.#allDataValidated
        }, (file, data) => {
            if (file) {
                const listOfScrapedData = JSON.parse(file);
                const index = listOfScrapedData.findIndex(scrapedData => scrapedData.city.name === data.city.name);
                if (index > -1) {
                    listOfScrapedData.splice(index, 1, data);
                } else {
                    listOfScrapedData.push(data);
                }
                return JSON.stringify(listOfScrapedData);
            }
            return JSON.stringify([data]);
        });
    }

    static getXLSXHeaderRow() {
        return this.#xlsxHeaderRow;
    }

    toXLSXLine() {
        return this.#scraperData.reduce((prev, current) => [...prev, ...current.textContent], [this.#city.name]);
    }

    /**
     * @param {Object} param
     * @param {string} param.filepath
     * @param {string[][]} param.rows
     * @param {SaveToXLSXModule} param.saveToXLSXModule
     */
    static async toXLSXFile({ rows, saveToXLSXModule }) {
        await saveToXLSXModule
            .setSpreadsheetHeader(this.#xlsxHeaderRow)
            .addRows(rows)
            .create();
    }

    getCityFullName() {
        return `${this.#city.name} - ${this.#city.UF}`;
    }

    getCity() {
        return this.#city;
    }

    getScraperData() {
        return this.#scraperData;
    }
}

module.exports = ScraperData;