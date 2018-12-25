const clusterCall = require('cluster-call')
const MemStore = require('./mem-store.js')

const storeMap = {}
clusterCall.clusterMemStoreOp = async function(id, method, args) {
	let store = storeMap[id]
	if (!store)
		return Promise.reject('Store not found: ' + id)

	return store[method].apply(store, args)
}

class MasterStore extends MemStore {
	constructor(id) {
		super()

		if (!id)
			id = Math.random().toString(36).slice(2).padEnd(12, '0')
		this.id = id
		storeMap[id] = this
	}
	close() {
		delete storeMap[this.id]
	}
}

module.exports = MasterStore
