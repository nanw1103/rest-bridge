const lru = require('tiny-lru')
const thisNode = require('../shared/node.js')
const {error} = require('../shared/log.js')(__filename)
const storeFactory = require('./store/factory.js')

let store

//The ConnectionCache is here to avoid unecessary IO to the store.
//ConnectionCache is used per REST API call.
const connectionCache = lru(2000, false, 0, 0)	//max, notify, ttl, expire

function configStore(config) {
	store = storeFactory.create(config)
}

function init() {
	return store.init([
		'reg',
		'connect',
		'disconnect',
		'instance'
	])
}

function register(info) {
	
	let k = info.key
	if (k)
		delete info.key
	else
		k = Math.random().toString(36).substring(2).padEnd(12, '0')
	
	info.regTime = Date.now()
	let item = 'reg/' + k
	save(item, info)
	return registry
}

function remove(k) {
	removeConnectionCache(k)
	return store.remove(k)
}

async function onConnect(info) {
	
	let k = info.key
	
	await store.get('reg/' + k)

	let item = 'connect/' + k
	save(item, {
		connector: info,
		node: thisNodeInfo(),
		time: Date.now()
	})
}

function onDisconnect(info) {
	let k = info.key
	let item = 'disconnect/' + k
	let now = Date.now()
	save(item, {
		node: thisNodeInfo(),
		time: now
	})
}

function save(name, obj) {
	store.set(name, obj).catch(e => error('Fail writing', name, String(e)))
}

function list(k) {
	if (!k)
		return store.list('/reg')
	return store.get('reg/' + k)
}

function get(k) {
	let ret = {
		reg: null,
		connect: null,
		disconnect: null
	}
	
	let ignore = () => 0
	return Promise.all([
		store.get('reg/' + k).then(data => ret.reg = data).catch(ignore),
		store.get('connect/' + k).then(data => ret.connect = data).catch(ignore),
		store.get('disconnect/' + k).then(data => ret.disconnect = data).catch(ignore)
	]).then(() => ret)
}

async function findConnection(k) {
	let conn = connectionCache.get(k)
	if (!conn) {
		conn = await store.get('connect/' + k)
		connectionCache.set(k, conn)
	}	
	return conn
}

function removeConnectionCache(k) {
	connectionCache.remove(k)
	//log('Removing connection cache', k)
}

function stat() {
	//todo
}


function thisNodeInfo() {
	return {
		url: thisNode.url,
		id: thisNode.id
	}
}

const registry = {
	init: init,
	configStore: configStore,
	stat: stat,
	list: list,
	get: get,
	register: register,
	remove: remove,
	onConnect: onConnect,
	onDisconnect: onDisconnect,
	findConnection: findConnection,
	removeConnectionCache: removeConnectionCache
}

module.exports = registry