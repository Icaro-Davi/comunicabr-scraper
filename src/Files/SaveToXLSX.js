const { access } = require('node:fs/promises');
const { join } = require('node:path');
const { Workbook } = require('exceljs');

const CustomError = require('../CustomError');

class SaveToXLSXModule {

    /** @type {string} */
    #spreadsheetName = undefined;
    /** @type {string} */
    #folderPath = undefined;
    /** @type {string} */
    #filepath = undefined;
    /** @type {string[]} */
    #headerRow = [];
    /** @type {string[]} */
    #rows = [];
    /** @type {CustomError} */
    #customError = new CustomError({ moduleName: SaveToXLSXModule.name, allowCreateLogs: true });

    constructor({ sheetName, folderPath, filename }) {
        this.#spreadsheetName = sheetName;
        this.#folderPath = folderPath;
        this.#filepath = join(this.#folderPath, `${filename}.xlsx`);
    }

    setSpreadsheetHeader(headerRow) {
        this.#headerRow = [...headerRow];
        return this;
    }

    addRows(rows) {
        this.#rows = [...this.#rows, ...rows];
        return this;
    }

    async #checkFilepathExists() {
        return access(this.#filepath).then(() => true).catch(() => false);
    }

    async create() {
        try {
            /** @type {Workbook} */
            let workbook = undefined;
            /** @type {import('exceljs').Worksheet} */
            let worksheet = undefined;

            if (await this.#checkFilepathExists()) {
                workbook = await new Workbook().xlsx.readFile(this.#filepath);
                workbook.removeWorksheet(this.#spreadsheetName);
            } else {
                workbook = new Workbook();
            }

            worksheet = workbook.addWorksheet(this.#spreadsheetName);
            worksheet.addRow(this.#headerRow);
            worksheet.addRows(this.#rows);

            await workbook.xlsx.writeFile(this.#filepath);

            this.#customError.message({ fnName: this.create.name, message: `Spreadsheet created successful on path "${this.#filepath}"` });
        } catch (error) {
            throw this.#customError.throw({ fnName: this.create.name, message: `Failed to append sheet "${this.#spreadsheetName}" ${error}` });
        }
    }

}

module.exports = SaveToXLSXModule;