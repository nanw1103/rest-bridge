const clusterCollector = require('cluster-collector')

const thisNode = require('../shared/node.js')
const mgmtSvc = require('./mgmt-svc.js')
const connectorSvc = require('./connector-svc.js')
const clientSvc = require('./client-svc.js')
const registry = require('./registry.js')

clusterCollector.on('stat', getNodeStat)
clusterCollector.on('env', getNodeEnv)

function getNodeStat() {
	return {
		node: thisNode.format(),
		client: clientSvc.stat,
		connector: connectorSvc.stat,
		mgmt: mgmtSvc.stat,
		registry: registry.stat,
		system: {
			memoryUsage: process.memoryUsage()
		}
	}
}

function getNodeEnv() {
	return process.env
}

function init(app) {
	
	app.use('/rest-bridge/stat', function (req, res) {
		
		clusterCollector.collect('stat')
			.then(ret => _sendJSON(res, ret))
			.catch(err => _sendError(res, err))
	})
	
	app.use('/rest-bridge/env', function (req, res) {		
		clusterCollector.collect('env')
			.then(ret => _sendJSON(res, ret))
			.catch(err => _sendError(res, err))
	})
}

function _sendError(res, err) {
	_sendJSON(res, {error: err.toString()})
}

function _sendJSON(res, obj) {
	let text = JSON.stringify(obj, null, 4)
	res.writeHead(200, {
		'content-type': 'application/json',
		'content-length': Buffer.byteLength(text),
	})
	res.end(text)
}

module.exports = {
	init: init
}
