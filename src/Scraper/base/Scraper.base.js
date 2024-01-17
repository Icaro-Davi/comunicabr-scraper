const CustomError = require("../../CustomError");

class BaseScraper {

    #customError = new CustomError({ allowCreateLogs: true, moduleName: BaseScraper.name });

    reload() {
        throw this.#customError.throw({ fnName: this.reload.name, message: 'Not implemented' });
    }

    init(browser) {
        throw this.#customError.throw({ fnName: this.init.name, message: 'Not implemented' });
    }

    extractDataFromCity(cities) {
        throw this.#customError.throw({ fnName: this.extractDataFromCity.name, message: 'Not implemented' });
    }

    isWorking() {
        throw this.#customError.throw({ fnName: this.isWorking.name, message: 'Not implemented' });
    }

    onStarting(fn) {
        throw this.#customError.throw({ fnName: this.onStarting.name, message: 'Not implemented' });
    }

    onDone(fn) {
        throw this.#customError.throw({ fnName: this.onDone.name, message: 'Not implemented' });
    }

    onError(fn) {
        throw this.#customError.throw({ fnName: this.onError.name, message: 'Not implemented' });
    }

    onLog(fn) {
        throw this.#customError.throw({ fnName: this.onLog.name, message: 'Not implemented' });
    }

}

module.exports = BaseScraper;