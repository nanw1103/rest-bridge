const { log, error } = require('../shared/log.js')(__filename)
const thisNode = require('../shared/node.js')
const registry = require('./registry.js')
const clusterCall = require('cluster-call')

require('cluster-collector')

let globalOptions = null

clusterCall.getOptions = () => globalOptions

async function create(options) {
	
	let actual = Object.assign({}, options)
	await initializeStore(actual)

	actual.port = Number.parseInt(actual.port)
	if (!Number.isInteger(actual.port))
		throw new Error('Invalid configuration. options.port must be integer. Configured: ' + options.port)
	
	globalOptions = actual
	globalOptions.id = thisNode.id
	
	if (Number.parseInt(actual.nodes) > 1)
		return createCluster(actual)
	else
		return createSingleNode(actual)
}

async function initializeStore(options) {
	if (!options.store) {
		if (Number.parseInt(options.nodes) > 1) {
			options.store = 'cluster-mem-store:rest-bridge'
		} else {
			options.store = 'mem-store'
		}
	}
	
	log('Using store:', options.store)	
	registry.configStore(options.store)
	await registry.init()
	log('Store initialized')
}

function createCluster(options) {

	const cluster = require('cluster')
	cluster.setupMaster({
		exec: __dirname + '/child.js'
	})

	cluster
	//.on('exit', (worker, code, signal) => {})
	.on('disconnect', worker => {
		log(`worker ${worker.process.pid} disconnect`)
	//}).on('fork', worker => {
	//	log(`worker ${worker.process.pid} forked`)
	//}).on('listening', (worker, address) => {
	//	log(`worker ${worker.process.pid} listening on ${address.address}:${address.port}`)
	//}).on('message', (worker, message, handle) => {
	}).on('online', worker => {
		log(`worker ${worker.process.pid} online`)
	//}).on('setup', settings => {
	//	log(`setup`)
	})

	for (let i = 0; i < options.nodes; i++) {
		startWorker(i)
	}
	
	function startWorker(index) {
		cluster.fork({
			RB_INDEX: index
		}).on('exit', (code, signal) => {
			log(`worker ${port} died. code=${code}. signal=${signal}`)
			setTimeout(() => startWorker(index), 5000)
			process.exit(1234)
		})
	}
}

function createSingleNode(options) {
	const node = require('./node-impl.js')
	node.create(options)
}

module.exports = {
	create: create,
	registry: registry
}