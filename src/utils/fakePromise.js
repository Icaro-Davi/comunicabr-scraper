function fakePromise(timeout = 5000) { return new Promise(resolve => setTimeout(resolve, timeout)); }
module.exports = fakePromise;