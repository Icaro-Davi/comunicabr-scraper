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

    static #customError = new CustomError({ moduleName: ScraperData.name, allowCreateLogs: true })

    static #xlsxHeaderRow = [
        // City
        'Cidade',

        // jobs
        '(Emprego) Trabalhadores com CLT',
        '(Emprego) MEI cadastrados',
        '(Emprego) Empresas optantes do Simples Nacional',
        '(Emprego) N° pessoas podem renegociar suas dívidas',

        // culture
        '(Cultura) R$ investidos para a produção cultural local',
        '(Cultura) (Em branco)',

        // citizen
        '(T/ ao cidadão) N° de famílias que ganharam na minha casa minha vida',
        '(T/ ao cidadão) R$ contratados pelas famílias que financiaram suas pelo minha casa minha vida',
        '(T/ ao cidadão) N° pessoas atendidas pelo programa Bolsa família',
        '(T/ ao cidadão) R$ valor médio do beneficio pago pelo Bolsa família',
        '(T/ ao cidadão) (Em Branco)',

        // state_and_municipalities
        '(T/ aos Estados/Municípios) R$ transferido para aplicação em obras públicas',
        '(T/ aos Estados/Municípios) R$ transferido para aplicação da saúde da população',
        '(T/ aos Estados/Municípios) (Em Branco)',
        '(T/ aos Estados/Municípios) (Em Branco)',

        // agriculture
        '(Agriculture) contratos de créditos liberados',
        '(Agriculture) R$ em Empréstimos liberados',
        '(Agriculture) Contratos de credito para financiar (PRONAF)',
        '(Agriculture) R$ foram concedidos para a (PRONAF)',
        '(Agriculture) N° de agricultores que realizam venda direta para o governo',
        '(Agriculture) R$ em vendas diretas de alimentos dos agricultores para o governo',
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
                    break;
                case pagesEnum.CITIZEN:
                    isValidated = scraperData.textContent.length === 5;
                    break;
                case pagesEnum.CULTURE:
                    isValidated = scraperData.textContent.length === 2;
                    break;
                case pagesEnum.STATE_AND_MUNICIPALITIES:
                    isValidated = scraperData.textContent.length === 4;
                    break;
                case pagesEnum.AGRICULTURE:
                    isValidated = scraperData.textContent.length === 6;
                    const [i0, i1, i2, i3, i4, i5] = scraperData.textContent;
                    scraperData.textContent = [i2, i0, i1, i3, i5, i4];
                    break;
            }

            scraperData.textContent = scraperData.textContent
                .map(text => this.#convertTextToNumber(text));

            if (!isValidated) {
                this.#allDataValidated = false;
            }
            return { ...scraperData, isValidated };
        });
    }

    /** @param {string} text  */
    #convertTextToNumber(text) {
        if (typeof text !== 'string') return text;

        const regex = /^[\d]+(?:\.{1})?(?:\d+)?$/g;
        if (text?.match(regex))
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
        const { textContent: jobs } = this.#scraperData.find(scraperData => scraperData.from === pagesEnum.JOBS) ?? new Array(4).fill('Não encontrado');
        const { textContent: culture } = this.#scraperData.find(scraperData => scraperData.from === pagesEnum.CULTURE) ?? new Array(2).fill('Não encontrado');
        const { textContent: citizen } = this.#scraperData.find(scraperData => scraperData.from === pagesEnum.CITIZEN) ?? new Array(5).fill('Não encontrado');
        const { textContent: stateAndMunicipalities } = this.#scraperData.find(scraperData => scraperData.from === pagesEnum.STATE_AND_MUNICIPALITIES) ?? new Array(4).fill('Não encontrado');
        const { textContent: agriculture } = this.#scraperData.find(scraperData => scraperData.from === pagesEnum.AGRICULTURE) ?? new Array(4).fill('Não encontrado');
        return [this.#city.name, ...jobs, ...culture, ...citizen, ...stateAndMunicipalities, ...agriculture];
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