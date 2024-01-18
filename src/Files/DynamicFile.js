const { access, readFile, writeFile, } = require('node:fs/promises');

class DynamicFile {
    #queue = [];
    #isLoading = false;
    #filepath = undefined;

    constructor(filepath) {
        this.#filepath = filepath;
    }

    async exists(path) {
        return access(path)
            .then(() => true)
            .catch(() => false);
    }

    async getFile() {
        if (await this.exists(this.#filepath)) {
            const file = await readFile(this.#filepath);
            return file;
        }
    }


    getFilepath() {
        return this.#filepath;
    }

    /**
     * @param {any} data
     * @param {(file: Buffer, data) => any} beforeSave
     */
    async save(data, beforeSave) {
        try {
            if (this.#isLoading) {
                this.#queue.push([data, beforeSave]);
                return;
            } else if (beforeSave) {
                this.#isLoading = true;
                const file = await this.exists(this.#filepath) ? await readFile(this.#filepath) : undefined;
                const fileToSave = await beforeSave(file, data);
                if (!fileToSave) throw new Error('Cannot save undefined data');
                await writeFile(this.#filepath, fileToSave, { encoding: 'utf8' });
                this.#isLoading = false;

                if (this.#queue.length) {
                    this.save(...this.#queue.shift());
                }
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

}

module.exports = DynamicFile;