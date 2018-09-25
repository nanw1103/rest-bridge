const {log, error} = require('../shared/log.js')(__filename)
const rbheaders = require('../shared/constants.js').headers
const thisNode = require('../shared/node.js')
const rawHttp = require('../shared/raw-http.js')
const registry = require('./registry.js')
const connectorSvc = require('./connector-svc.js')
const makeContext = require('./context-util.js').makeContext



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
	req.headers[rbheaders.KEY] = k
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

/**
 * Check if a request has a request body.
 * A request with a body __must__ either have `transfer-encoding`
 * or `content-length` headers set.
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.3
 *
 * @param {Object} request
 * @return {Boolean}
 */
function hasbody(req) {
	return req.headers['transfer-encoding'] !== undefined ||
		!isNaN(req.headers['content-length'])
}

function workaroundBodyparserLibIssue(req) {
	//workaround body parser issue when using bodyParser.text.
	//It always generates an empty object {} even if no body.
	//Because we are only using text parser, any object body is from BodyParser bug
	if (typeof req.body === 'object')
		delete req.body
}

function forwardImpl(k, req, res) {
	workaroundBodyparserLibIssue(req)
		
	let connector = connectorSvc.findConnector(k)
	if (connector) {
		//redirect to connector	connected to this node			
		connector.send(req, onResponseForwardToClient)
		return
	}

	let headers = req.headers
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

function init(app, options) {
	
	app.use(addHubInfoHeader)
	
	if (options && options.responseHeaders) {
		app.use((req, res, next) => {
			for (let k in options.responseHeaders)
				res.setHeader(k, options.responseHeaders[k])
			next()
		})
	}
	
	let ctx = makeContext(options.baseContext, '/rest-bridge-forward')
	app.use(ctx, forwardToConnectorByPathKey)
	
	ctx = makeContext(options.baseContext, '')
	app.use(ctx, forwardToConnectorByHeaderKey)
}

module.exports = {
	init: init,
	stat: stat
}
