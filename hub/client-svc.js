const {log, error} = require('../shared/log.js')(__filename)
const constants = require('../shared/constants.js')
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
	let k = headers[constants.headers.KEY]
	//k = 'demoKey'

	if (!k) {
		stat.missingConnectorKey++
		res.writeHead(503, 'Missing ' + constants.headers.KEY)
		res.end()		
		return
	}

	return forwardImpl(k, req, res)
}

function forwardImpl(k, req, res) {
	let headers = req.headers

	let includeHubInfo = headers[constants.headers.REQ_HUB_INFO]
	
	let connector = connectorSvc.findConnector(k)
	if (connector) {
		
		removeRbHeaders(headers)
		
		//redirect to connector	connected to this node			
		let seq = ++seq_counter
		headers[constants.headers.SEQ] = seq
				
		let text = rawHttp.reqToText(req)
		connector.send(text, seq, onResponseForwardToClient)
		return
	}


	//connector is not on this node. Find it in registry
	registry.findConnection(k).then(connectionInfo => {
		
		//log('connectionInfo', connectionInfo)

		let node = connectionInfo ? connectionInfo.node : null

		if (!node || node.url === thisNode.url) {
			let headers = {}
			headers[constants.headers.NO_CONNECTOR] = 1
			res.writeHead(503, 'Connector not found', headers)
			res.end()
			stat.missingConnector++
			return
		}
		
		if (headers[constants.headers.FORWARDED]) {
			res.writeHead(503, 'No further redirection')
			res.end()
			stat.noFurtherRedirection++
			return
		}
		
		//log('forwarding to:', node)

		//Forward to another hub node which has the connector connection
		stat.forwarded++
		headers[constants.headers.FORWARDED] = 1	//prevent from further redirection

		//hack for body parser. With text parser, without body it has an empty object
		if (typeof req.body === 'object') {
			delete req.body
		}

		//log('forwarding to', node.url, req.url)
		rawHttp.doHttpCall(node.url, req, onResponseForwardToClient)
	}).catch(e => {
		log('Connector not found:', k, e)
		res.writeHead(503, 'Find connector error')
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
		if (headers[constants.headers.NO_CONNECTOR]) {
			registry.removeConnectionCache(k)
			delete headers[constants.headers.NO_CONNECTOR]
		}

		if (includeHubInfo) {
			let hubInfo = headers[constants.headers.HUB_INFO]
			if (hubInfo)
				hubInfo = thisNode.short().trim() + '/' + hubInfo
			else
				hubInfo = thisNode.short().trim()
			headers[constants.headers.HUB_INFO] = hubInfo
		}
		
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

function removeRbHeaders(headers) {
	let keys = Object.keys(headers)
	for (let k of keys) {
		if (k.startsWith(constants.headers.PREFIX))
			delete headers[k]
	}
}

function init(app) {
	app.use('/rest-bridge-forward/', forwardToConnectorByPathKey)
	app.use(forwardToConnectorByHeaderKey)
}

module.exports = {
	init: init,
	stat: stat
}
