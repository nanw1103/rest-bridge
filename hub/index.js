const { log, error } = require('../shared/log.js')(__filename)
const thisNode = require('../shared/node.js')
const registry = require('./registry.js')

const clusterCollector = require('cluster-collector')

function create(options) {
	if (options.cluster) {
		return createCluster(options)
	} else {
		return createSingleNode(options)
	}
}

async function createCluster(options) {

	await registry.init()
	console.log('Store initialized')

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
				REST_BRIDGE_STORE: options.cluster.store
			})
			w.rest_bridge_port = worker.rest_bridge_port
		}
		setTimeout(restart, 5000)
		
	}).on('disconnect', worker => {
		log(`worker ${worker.process.pid} disconnect`)
	}).on('fork', worker => {
		log(`worker ${worker.process.pid} forked`)
//	}).on('listening', (worker, address) => {
//		log(`worker ${worker.process.pid} listening on ${address.address}:${address.port}`)
	//}).on('message', (worker, message, handle) => {
	}).on('online', worker => {
		log(`worker ${worker.process.pid} online`)
//	}).on('setup', settings => {
//		log(`setup`)
	})

	for (let i = 0; i < options.cluster.nodes; i++) {
		let port = Number.parseInt(options.port) + i
		let w = cluster.fork({
			RB_NODE_ID: thisNode.id,
			PORT: port,			
			REST_BRIDGE_STORE: options.cluster.store
		})
		w.rest_bridge_port = port
	}
}

function createSingleNode(options) {
	const node = require('./node-impl.js')
	node.create(options)
	return Promise.resolve()
}

module.exports = {
	create: create,
	registry: registry
}