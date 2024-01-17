'use strict';

const { join } = require('node:path');
const DynamicFile = require("../Files/DynamicFile");

class CustomError {

    #moduleName = undefined;
    #allowCreateLogs = false;

    static #dynamicFile = new DynamicFile(join(__dirname, '..', 'Data', 'Logs', 'custom_error_logs.txt'));

    /**
    * @param {Object} params
    * @param {*} params.moduleName
    * @param {*} params.allowCreateLogs
    * */
    constructor(params) {
        this.#moduleName = params.moduleName.toUpperCase();
        this.#allowCreateLogs = params.allowCreateLogs;
    }

    /**
    * @param {Object} params
    * @param {*} params.fnName
    * @param {*} params.message
    * */
    async throw({ fnName, message }) {
        return await this.#throw(fnName, message);
    }

    /**
    * @param {Object} params
    * @param {*} params.fnName
    * @param {*} params.message
    * */
    async warn({ fnName, message }) {
        await this.#warn(fnName, message);
    }

    /**
    * @param {Object} params
    * @param {*} params.fnName
    * @param {*} params.message
    * */
    async message({ fnName, message }) {
        await this.#message(fnName, message);
    }

    #createMessage({ fnName, message, type }) {
        return `[${this.#moduleName}:${fnName}()] "${type}" ${message}\n`;
    }

    async #message(fnName, message) {
        const type = 'MESSAGE';
        if (this.#allowCreateLogs) await this.#registerLog(fnName, message, type);
        console.warn(this.#createMessage({ fnName, message, type }));
    }

    async #warn(fnName, message) {
        const type = 'WARN';
        if (this.#allowCreateLogs) await this.#registerLog(fnName, message, type);
        console.warn(this.#createMessage({ fnName, message, type }));
    }

    async #throw(fnName, message) {
        const type = 'ERROR';
        if (this.#allowCreateLogs) await this.#registerLog(fnName, message, type);
        return new Error(this.#createMessage({ fnName, message, type }));
    }

    #registerLog(fnName, message, type) {
        const logMessage = this.#createMessage({ fnName, message, type });
        CustomError.#dynamicFile.save(logMessage, (file, data) => {
            if (file) {
                file = file.toString('utf8');
                file += data;
                return file;
            }
            return data;
        });
    }

}

module.exports = CustomError;