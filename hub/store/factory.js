function isInterface(obj, methods) {
	for (let name of methods) {
		if (typeof obj[name] !== 'function')
			return false
	}
	return true
}

function isStoreClass(obj) {
	return isInterface(obj, ['set', 'get', 'list', 'has', 'init', 'remove'])
}

function create(config) {

	if (!config === undefined)
		throw new Error('Missing store configuration')

	if (typeof config === 'object') {
		if (!isStoreClass(config))
			throw new Error('Custom store object is not a Store class')
		return config
	}

	if (typeof config === 'function') {
		return create(config())
	} 

	if (typeof config !== 'string') {
		throw new Error('Unknown store configuration: ' + config)
	}

	//parse string config
	let i = config.indexOf(':')
	let type
	let param
	if (i < 0) {
		type = config
	} else {
		type = config.substring(0, i)
		param = config.substring(i + 1)
	}

	switch (type) {
	case 'mem-store':
	{
		let MemStore = require('./mem-store.js')
		return new MemStore
	}
	case 'cluster-mem-store':
	{
		let ClusterMemStore = require('./cluster-mem-store.js')
		return new ClusterMemStore(param)
	}
	case 'fs-store':
	{
		const CachedStore = require('./cached-store.js')
		const FsStore = require('./fs-store.js')
		return new CachedStore(new FsStore(param), {
			size: 2000,
			expire: 5000
		})	
	}
		
	default:
		throw new Error('Unsupported store: ' + config)
	}
}

module.exports = {
	create: create
}
