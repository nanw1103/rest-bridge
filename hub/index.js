const { log, error } = require('../shared/log.js')(__filename)
const thisNode = require('../shared/node.js')
const registry = require('./registry.js')

require('cluster-collector')

function create(options) {

	let actual = Object.assign({}, options)
	
	if (!actual.store) {
		if (Number.parseInt(actual.nodes) > 0) {
			actual.store = 'cluster-mem-store:rest-bridge'
		} else {
			actual.store = 'mem-store'
		}
	}
	
	registry.configStore(actual.store)
	registry.init()
		.then(() => log('Store initialized'))
		.catch(err => {
			error(err)
			process.exit(10001)
		})
			
	if (Number.parseInt(actual.nodes) > 0) {
		return createCluster(actual)
	} else {
		return createSingleNode(actual)
	}
}

function createCluster(options) {

	const cluster = require('cluster')
	cluster.setupMaster({
		exec: __dirname + '/child.js'
	})
	
	cluster.on('exit', (worker, code, signal) => {
		log(`worker ${worker.process.pid} died. code=${code}. signal=${signal}`)
		
		function restart() {
			let w = cluster.fork({
				RB_NODE_ID: thisNode.id,
				PORT: worker.rest_bridge_port,
				REST_BRIDGE_STORE: options.store
			})
			w.rest_bridge_port = worker.rest_bridge_port
		}
		setTimeout(restart, 5000)
		
	}).on('disconnect', worker => {
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
		let port = Number.parseInt(options.port) + i
		let w = cluster.fork({
			RB_NODE_ID: thisNode.id,
			PORT: port,			
			REST_BRIDGE_STORE: options.store
		})
		w.rest_bridge_port = port
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