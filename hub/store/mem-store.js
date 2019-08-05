const lru = require('tiny-lru')

class MemStore {
	constructor(size) {
		size = size || 10000
		this._map = lru(size, false, 0, 0)
	}

	async set(k, obj) {
		this._map.set(k, obj)
	}

	async get(k) {
		if (!this._map.has(k))
			return Promise.reject()
		return this._map.get(k)
	}

	async remove(k) {
		this._map.remove(k)
	}

	async list(path) {
		if (path[path.length - 1] !== '/')
			path += '/'
		let keys = Object.keys(this._map)
		let items = keys.filter(v => v.startsWith(path))
		return items
	}

	async has(k) {
		return this._map.has(k)
	}

	async init() {
	}
}

module.exports = MemStore