const url = require('url')
const WebSocket = require('ws')
const http = require('http')
const https = require('https')

const {log} = require('../shared/log.js')(__filename)
const rawHttp = require('../shared/raw-http.js')
const constants = require('../shared/constants.js')

function doHttpCall(baseUrl, req, callback) {
	
	let target = url.parse(baseUrl)

	var options = {
		hostname: target.hostname,
		port: target.port,
		path: req.path,
		method: req.method,
		headers: req.headers,
		setHost: false,
		timeout: 60000
	}

	let httpLib = target.protocol === 'http:' ? http : https

	let request = httpLib.request(options, function(res) {

		let respObj = {
			httpVersion: res.httpVersion,
			statusCode: res.statusCode,
			statusMessage: res.statusMessage,
			headers: res.headers,
			body: []
		}

		res.on('data', function (chunk) {
			respObj.body.push(chunk)
		}).on('end', function() {
			callback(null, respObj)
		})
	}).on('error', e => {
		callback(e)
	}).on('timeout', () => {
		callback('timeout')
	})

	if (req.body)
		request.write(req.body)
	request.end()
}

function prepareHeaders(info) {
	let ret = {}
	for (let k in info) {
		ret[constants.headers.PREFIX + k] = info[k]
	}
	return ret
}

function parseRequestMessage(text) {
	let req
	try {
		req = rawHttp.parseReq(text)
	} catch (e) {
		log('Error parsing req', e.toString())
		return
	}
	
	let seq = req.headers[constants.headers.SEQ]
	if (!seq) {
		log('Missing seq header')
		return
	}
	delete req.headers[constants.headers.SEQ]
	req.seq = seq
	return req
}

function routeMatcherFactory(options) {
	let routes = []
	for (let k in options.routes) {
		let meta = options.routes[k]
		let r
		if (typeof meta === 'string') {
			r = { target: meta }
		} else {
			r = Object.assign({}, meta)
		}
		r.pattern = new RegExp(k)
		routes.push(r)
	}
	return function matchRoute(path) {
		for (let r of routes) {
			if (r.pattern.test(path))
				return r.target
		}
	}
}

let ws
let closed

function startConnector(options) {

	log('Starting connector to', options.hub)
	closed = false
	
	let headers = prepareHeaders(options.info)
	let matchRoute = routeMatcherFactory(options)
	
	function createClient() {
		ws = new WebSocket(options.hub + '/rest-bridge/connect', 'binary', {
			handshakeTimeout: 20000,
			//perMessageDeflate: false,
			//protocolVersion:
			//origin:
			auth: 'pandora',
			headers: headers
		}).on('open', () => {
			log('ws open')
			restartDelay = initialDelay
			
			//start heartbeat
			heartbeatTimer = setInterval(() => ws.ping(), constants.HEARTBEAT_INTERVAL)
		}).on('close', (code, reason) => {
			log('ws close', code, reason)
			if (code === constants.AUTH_FAILURE)
				restartDelay = maxDelay
			restart()
		}).on('error', e => {
			log('ws error:', e.toString())
			ws.close()
		//}).on('ping', () => {
		//	log('ws ping', data)
		//}).on('pong', () => {
		//	log('ws pong', data)
		}).on('unexpected-response', () => {
			log('ws unexpected-response')
			ws.terminate()
		//}).on('upgrade', () => {
		//	log('ws upgrade')
		}).on('message', onMessage)

		function onMessage(text) {
			let req = parseRequestMessage(text)
			if (!req)
				return
			
			let target = matchRoute(req.path)
			if (!target) {
				sendError('No matching route', req.seq)
				return
			}
			
			doHttpCall(target, req, callback)

			function callback(err, respObj) {
				if (err) {
					sendError('Connector error: ' + err, req.seq)
					return
				}
				
				respObj.headers[constants.headers.SEQ_RESP] = req.seq
				if (respObj.body.length > 0)
					respObj.headers[constants.headers.CHUNKS] = respObj.body.length

				let headerText = rawHttp.resToHead(respObj)

				ws.send(headerText)
				for (let chunk of respObj.body) {
					//log('writing body chunk', chunk.length)
					ws.send(chunk)
				}
			}
		}
		
		function sendError(msg, seq) {
			let headers = {}
			headers[constants.headers.SEQ_RESP] = seq
			let text = rawHttp.response(503, null, headers, msg)
			ws.send(text)
		}
		
	}

	const initialDelay = 1000
	const maxDelay = 120 * 1000
	let restartDelay = initialDelay
	let heartbeatTimer
	
	function restart() {
		if (ws)
			ws.terminate()
		
		clearInterval(heartbeatTimer)
		
		if (closed) {
			log('Closed.')
			return
		}
		
		restartDelay *= 2
		if (restartDelay > maxDelay)
			restartDelay = maxDelay
		log('reconnect in', restartDelay / 1000)
		setTimeout(createClient, restartDelay)
	}
	
	createClient()
}

function close() {
	if (ws)
		ws.close()
	closed = true
}

module.exports = {
	start: startConnector,
	close: close
}