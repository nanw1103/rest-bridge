const path = require('path')
const clusterCall = require('cluster-call')
const { log } = require('../shared/log.js')()
const thisNode = require('../shared/node.js')
const registry = require('./registry.js')
const defaults = require('./defaults.js')

require('cluster-collector')

let globalOptions = { ...defaults}

clusterCall.getOptions = () => globalOptions

async function create(options) {

	let actual = overrideOptions(options)
	await initializeStore(actual)

	actual.port = Number.parseInt(actual.port)
	if (!Number.isInteger(actual.port))
		throw new Error('Invalid configuration. options.port must be integer. Configured: ' + options.port)

	globalOptions = actual
	globalOptions.id = thisNode.id

	if (Number.parseInt(actual.cluster.nodes) > 1) {
		if (actual.auth.verifyClient) {
			throw 'options.auth.verifyClient is not supported in cluster mode. Use single node configuration instead (set options.cluster.nodes=1).'
		}

		return createCluster(actual)
	} else
		return createSingleNode(actual)
}

function overrideOptions(options) {
	let actual = JSON.parse(JSON.stringify(defaults))
	if (!options)
		return actual
	actual = Object.assign(actual, options)
	Object.assign(actual.connector, defaults.connector, options.connector)
	Object.assign(actual.management, defaults.management, options.management)
	Object.assign(actual.cluster, defaults.cluster, options.cluster)
	return actual
}

async function initializeStore(options) {
	if (!options.cluster.store) {
		if (Number.parseInt(options.cluster.nodes) > 1) {
			options.cluster.store = 'cluster-mem-store:rest-bridge'
		} else {
			options.cluster.store = 'mem-store'
		}
	}

	log('Using store:', options.cluster.store)
	registry.configStore(options.cluster.store)
	await registry.init()
	log('Store initialized')
}

function createCluster(options) {

	const cluster = require('cluster')
	cluster.setupMaster({
		exec: path.join(__dirname, 'child.js')
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

	for (let i = 0; i < options.cluster.nodes; i++) {
		startWorker(i)
	}

	function startWorker(index) {
		cluster.fork({
			RB_INDEX: index
		}).on('exit', (code, signal) => {
			log(`worker ${index} died. code=${code}. signal=${signal}`)
			setTimeout(() => startWorker(index), 5000)
		})
	}
}

function createSingleNode(options) {
	const node = require('./node-impl.js')
	return node.create(options)
}

module.exports = {
	create,
	registry
}