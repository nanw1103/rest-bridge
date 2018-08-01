const thisNode = require('../shared/node.js')
const registry = require('./registry.js')
const connectorSvc = require('./connector-svc.js')

const clusterCollector = require('cluster-collector')

clusterCollector.on('connectors', getConnectors)
clusterCollector.on('nodes', getThisNode)

function getConnectors() {
	return {
		node: {
			url: thisNode.url,
			id: thisNode.id + '/' + thisNode.name
		},
		connectors: connectorSvc.list(),
	}
}

function getThisNode() {
	return thisNode
}

const API_LIST = [{
	name: 'register',
	method: 'post',
	path: '/registry',
	description: 'Register a new connector'
}, {
	name: 'Delete registered connector',
	method: 'delete',
	path: '/registry/<key>',
	description: 'Remove a connector'
}, {
	name: 'registry',
	method: 'get',
	path: '/registry',
	description: 'Get registry information'
}, {
	name: 'registry.connector',
	method: 'get',
	path: '/registry/<connector-key>',
	description: 'Get information of specific connector'	
}, {
	name: 'nodes',
	method: 'get',
	path: '/nodes',
	description: 'Get nodes in this cluster instance'
}, {
	name: 'connectors',
	method: 'get',
	path: '/connectors',
	description: 'Get connector information. Scope: cluster instance'
}, {
	name: 'stat',
	method: 'get',
	path: '/stat',
	description: 'Get statistics. Scope: cluster instance'
}, {
	name: 'env',
	method: 'get',
	path: '/env',
	description: 'Get environments. Scope: cluster instance'
}, {
	name: 'node',
	method: 'get',
	path: '/node',
	description: 'Get single node info'
}]

function init(app) {
	
	app.use('/rest-bridge/registry', function (req, res) {
		
		if (req.method === 'POST') {
			let data
			if (req.body !== '')
				data = JSON.parse(req.body)
			else
				data = {}
			let info = registry.register(data)
			
			_sendJSON(res, info)
		} else if (req.method === 'GET') {
			if (req.url === '/') {
				registry.list()
					.then(info => _sendJSON(res, info))
					.catch(err => _sendError(res, err))
			} else {
				let k = req.url.substring(1)
				registry.get(k)
					.then(info => _sendJSON(res, info))
					.catch(err => _sendError(res, err))
			}
		} else if (req.method === 'DELETE') {
			let k = req.url.substring(1)
			registry.delete(k)
				.then(() => _sendJSON(res, {}))
				.catch(err => _sendError(res, err))
		} else {
			res.writeHead(405)
			res.end()
		}
	})
	
	app.use('/rest-bridge/nodes', function (req, res) {
		clusterCollector.collect('nodes')
			.then(ret => _sendJSON(res, ret))
			.catch(err => _sendError(res, err))
	})
	
	app.use('/rest-bridge/connectors', function (req, res) {
		clusterCollector.collect('connectors')
			.then(ret => _sendJSON(res, ret))
			.catch(err => _sendError(res, err))
	})
	
	app.use('/rest-bridge/node', function (req, res) {
		_sendJSON(res, thisNode)
	})
	
	app.use('/rest-bridge', function (req, res) {
		//console.log(req.url)
		if (req.url !== '/') {
			res.writeHead(404)
			res.end()
			return
		}
		
		let base = req.originalUrl
		if (base.endsWith('/'))
			base = base.substring(0, base.length - 1)
		for (let a of API_LIST) {
			a.href = `http://${req.headers.host}${base}${a.path}`
		}
		_sendJSON(res, API_LIST)
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
