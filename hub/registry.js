const stat = {
	registered: 0,
	expiredReg: 0,
	expiredDisconnect: 0
}

const connectors = {}
const registrationSeq = []
const disconnectedSeq = []

function register(info) {
	stat.registered++
	
	let k = info.key
	if (k)
		delete info.key
	else
		k = String(Math.random()).substring(2)
	
	let holder = {
		reg: info,
		regTime: Date.now(),
		active: false,
		runtime: null,
		lastConnect: 0,
		lastDisconnect: 0
	}

	connectors[k] = holder
	
	_deleteFromArray(registrationSeq, k)
	registrationSeq.push(k)	
	while (registrationSeq.length > 100) {
		let oldest = registrationSeq.shift(1)
		delete connectors[oldest]
		stat.expiredReg++
	}
	
	return instance
}

function onConnect(info) {
	
	let k = info.key
	let holder = connectors[k]
	if (!holder)
		return false
	
	holder.runtime = info
	holder.active = true
	holder.lastConnect = Date.now()
	
	_deleteFromArray(registrationSeq, k)
	_deleteFromArray(disconnectedSeq, k)
	return true
}

function onDisconnect(info) {
	let k = info.key
	let holder = connectors[k]
	if (!holder)
		return
	
	holder.active = false
	holder.lastDisconnect = Date.now()
	
	_deleteFromArray(disconnectedSeq, k)
	disconnectedSeq.push(k)
	while (disconnectedSeq.length > 2000) {
		let oldest = disconnectedSeq.shift(1)
		delete connectors[oldest]
		stat.expiredDisconnect++
	}
}

function _deleteFromArray(array, obj) {
	let i = array.indexOf(obj)
	if (i < 0)
		return
	array.splice(i, 1)
}

function list() {
	return {		
		connectors: connectors,
		registrationSeq: registrationSeq,
		disconnectedSeq: disconnectedSeq
	}
}

const instance = {
	stat: stat,
	list: list,
	register: register,	
	onConnect: onConnect,
	onDisconnect: onDisconnect
}

module.exports = instance