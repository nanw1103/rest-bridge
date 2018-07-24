const fs = require('fs')
const {log, error} = require('../shared/log.js')(__filename)


class MemStore {
	
	constructor() {
		this._map = {}
	}
	
	set(k, obj) {
		this._map[k] = obj
		return Promise.resolve()
	}
	
	get(k) {
		if (k in this._map)
			return Promise.resolve(this._map[k])
		return Promise.reject()
	}
	
	list() {
		return Promise.resolve(Object.keys(this._map))
	}
	
	exists(k) {
		return k in this._map ? Promise.resolve() : Promise.reject()
	}
}

module.exports = FsStore