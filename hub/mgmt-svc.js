const registry = require('./registry.js')
const connectorSvc = require('./connector-svc.js')

function _sendJSON(res, obj) {
	let text = JSON.stringify(obj)
	res.writeHead(200, {
		'content-type': 'application/json',
		'content-length': Buffer.byteLength(text),
	})
	res.end(text)
}

const API_LIST = [{
	name: 'register',
	method: 'post',
	path: '/register',
	description: 'Register a new connector'
}, {
	name: 'registry',
	method: 'get',
	path: '/registry',
	description: 'Get registry information'
}, {
	name: 'connectors',
	method: 'get',
	path: '/connectors',
	description: 'Get connector information'
}, {
	name: 'stat',
	method: 'get',
	path: '/stat',
	description: 'Get statistics'
}]

function init(app) {
	
	app.use('/rest-bridge/register', function (req, res) {
		
		if (req.method !== 'POST') {
			res.writeHead(405)
			res.end()
			return
		}
		
		let data
		if (req.body !== '')
			data = JSON.parse(req.body)
		else
			data = {}
		let info = registry.register(data)
		
		_sendJSON(res, info)
	})
	
	app.use('/rest-bridge/registry', function (req, res) {
		_sendJSON(res, registry.list())
	})
	
	app.use('/rest-bridge/connectors', function (req, res) {
		_sendJSON(res, connectorSvc.list())
	})
	
	app.use('/rest-bridge', function (req, res) {
		//console.log(req.url)
		if (req.url !== '/') {
			res.writeHeader(404)
			res.end()
			return
		}
		
		for (let a of API_LIST) {
			a.href = `http://${req.headers.host}${req.originalUrl}${a.path}`
		}
		_sendJSON(res, API_LIST)
	})
}

module.exports = {
	init: init
}
