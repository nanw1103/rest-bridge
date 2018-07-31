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
	
	remove(k) {
		delete this._map[k]
		return Promise.resolve()
	}
	
	list(path) {
		if (path[path.length - 1] !== '/')
			path += '/'
		let keys = Object.keys(this._map)
		let items = keys.filter(v => v.startsWith(path))
		return Promise.resolve(items)
	}
	
	has(k) {
		return k in this._map ? Promise.resolve() : Promise.reject()
	}
	
	async init() {
	}
}

module.exports = MemStore