const lru = require('tiny-lru')

const defaultOptions = {
	size: 2000,
	ttl: 0,
	expire: 5000
}

class CachedStore {

	constructor(store, options) {
		this.impl = store
		this.options = Object.assign({}, defaultOptions, options)
		this.cache = lru(options.size, false, options.ttl, options.expire);
	}
	
	set(k, obj) {
		this.cache.set(k, obj)
		return this.impl.set(k, obj)
	}
	
	async get(k) {
		let v
		if (!this.cache.has(k)) {
			try {
				v = this.impl.get(k)
			} catch (e) {
				v = null
			}
			
			this.cache.set(k, v)
		} else {
			v = this.cache.get(k)
		}
		return v
	}
	
	list(path) {
		let v
		if (!this.cache.has(path)) {
			v = this.impl.list(path)
			this.cache.set(path, v)
		} else {
			v = this.cache.get(path)
		}
		return v
	}
	
	exists(k) {
		return this.impl.exists(k)
	}

	init(options) {
		return this.impl.init(options)
	}
}

module.exports = CachedStore