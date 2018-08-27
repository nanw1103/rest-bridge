const {log, error} = require('../shared/log.js')(__filename)
const rbheaders = require('../shared/constants.js').headers
const thisNode = require('../shared/node.js')
const rawHttp = require('../shared/raw-http.js')

const registry = require('./registry.js')
const connectorSvc = require('./connector-svc.js')

let seq_counter = 0

const stat = {
	incoming: 0,
	missingConnectorKey: 0,
	missingConnector: 0,	
	connectorFailure: 0,
	noFurtherRedirection: 0,
	forwarded: 0,
}

function forwardToConnectorByPathKey(req, res) {
	//log('forwardToConnectorByPathKey', req.method, req.url)
	stat.incoming++

	let url = req.url
	let end = url.indexOf('/', 1)
	if (end < 0) {
		res.writeHead(503, 'Missing target path in url')
		res.end()
		return
	}
	let k = url.substring(1, end)
	req.url = url.substring(end)

	//log('forwardToConnectorByPathKey result', req.url)

	return forwardImpl(k, req, res)
}

function forwardToConnectorByHeaderKey(req, res) {

	//log('forwardToConnectorByHeaderKey', req.method, req.url)
	stat.incoming++
	
	let headers = req.headers
	let k = headers[rbheaders.KEY]
	//k = 'demoKey'

	if (!k) {
		stat.missingConnectorKey++
		res.writeHead(503, 'Missing ' + rbheaders.KEY)
		res.end()		
		return
	}

	return forwardImpl(k, req, res)
}

function forwardImpl(k, req, res) {
	let headers = req.headers

	let connector = connectorSvc.findConnector(k)
	if (connector) {
		
		removeRbHeaders(headers)
		
		//redirect to connector	connected to this node			
		let seq = ++seq_counter
		headers[rbheaders.SEQ] = seq
				
		let text = rawHttp.reqToText(req)
		connector.send(text, seq, onResponseForwardToClient)
		return
	}

	if (headers[rbheaders.FORWARDED]) {
		let headers = {}
		headers[rbheaders.NO_CONNECTOR] = 1
		res.writeHead(503, 'No further redirection', headers)
		res.end()
		stat.noFurtherRedirection++
		return
	}

	//connector is not on this node. Find it in registry
	registry.findConnection(k).then(connectionInfo => {
		
		//log('connectionInfo', connectionInfo)

		let node = connectionInfo ? connectionInfo.node : null

		if (!node || node.url === thisNode.url) {
			registry.removeConnectionCache(k)
			let headers = {}
			res.writeHead(503, 'Connector not found', headers)
			res.end()
			stat.missingConnector++
			return
		}		
		
		//log('forwarding to:', node)

		//Forward to another hub node which has the connector connection
		stat.forwarded++
		headers[rbheaders.FORWARDED] = 1	//prevent from further redirection

		//hack for body parser. With text parser, without body it has an empty object
		if (typeof req.body === 'object') {
			delete req.body
		}

		//log('forwarding to', node.url, req.url)
		rawHttp.doHttpCall(node.url, req, (err, result) => {
			if (err) {
				//the peer seems not working properly. Clear cache
				registry.removeConnectionCache(k)
			}
			
			onResponseForwardToClient(err, result)
		})
	}).catch(e => {
		log('Connector not found:', k, e)
		res.writeHead(503, 'Find connector error: ' + String(e))
		res.end()
		stat.missingConnector++
	})
	
	
	function onResponseForwardToClient(err, result) {
		if (res.finished)
			return
		
		if (err) {
			stat.connectorFailure++
			res.writeHead(503, 'WS failure: ' + String(err))
			res.end()				
			return
		}

		let headers = result.headers
		if (headers[rbheaders.NO_CONNECTOR]) {
			registry.removeConnectionCache(k)
			delete headers[rbheaders.NO_CONNECTOR]
		}

		appendHubInfoHeader(req, result)
		
		//log('result.statusCode', result.statusCode)
		//log('result.headers', headers)
		
		//handle 'Invalid character in statusMessage'
		try {
			res.writeHead(result.statusCode, result.statusMessage, headers)
			if (result.body) {
				res.write(result.body)
			} else if (result.chunks) {
				for (let c of result.chunks) {
					//log('writing chunk', c.length)
					res.write(c)
				}
			}
			
			res.end()
		} catch (e) {
			error('Error write back to client', e)
			log(result)
		}
	}
}

function appendHubInfoHeader(req, res) {
	if (req.headers[rbheaders.REQ_HUB_INFO]) {
		let hubInfo = res.headers[rbheaders.HUB_INFO]
		if (hubInfo)
			hubInfo = thisNode.short().trim() + '/' + hubInfo
		else
			hubInfo = thisNode.short().trim()
		res.headers[rbheaders.HUB_INFO] = hubInfo
	}
}

function addHubInfoHeader(req, res, next) {
	if (req.headers[rbheaders.REQ_HUB_INFO])
		res.setHeader(rbheaders.HUB_INFO, thisNode.short().trim())
	next()
}

function removeRbHeaders(headers) {
	let keys = Object.keys(headers)
	for (let k of keys) {
		if (k.startsWith(rbheaders.PREFIX))
			delete headers[k]
	}
}

function init(app, options) {
	
	app.use(addHubInfoHeader)
	
	if (options && options.responseHeaders) {
		app.use((req, res, next) => {
			for (let k in options.responseHeaders)
				res.setHeader(k, options.responseHeaders[k])
			next()
		})
	}
	
	app.use('/rest-bridge-forward/', forwardToConnectorByPathKey)
	app.use(forwardToConnectorByHeaderKey)
}

module.exports = {
	init: init,
	stat: stat
}
