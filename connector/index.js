const WebSocket = require('ws')

const {log} = require('../shared/log.js')(__filename)
const rawHttp = require('../shared/raw-http.js')
const constants = require('../shared/constants.js')
const EventEmitter = require('events')


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
		return options.target
	}
}

let ws
let closed

const defaultOptions = {
	handshakeTimeout: 20000,
	//perMessageDeflate: false,
	//protocolVersion:
	//origin:
	auth: 'pandora',
	//headers: {}
}

function startConnector(options) {

	log('Starting connector', JSON.stringify(options.info))
	log('Connecting to hub', options.hub)

	let events = new EventEmitter
	
	//log('Starting connector to', options.hub)
	closed = false
	
	let headers = prepareHeaders(options.info)
	let matchRoute = routeMatcherFactory(options)
	
	let wsOptions = Object.assign({}, defaultOptions, options)
	wsOptions.headers = headers
	
	function createClient() {
		ws = new WebSocket(options.hub + '/rest-bridge/connect', 'binary', wsOptions).on('open', () => {
			//log('ws open')
			restartDelay = initialDelay
			startHeartbeat()
		}).on('close', (code, reason) => {
			log('ws close', code, reason)
			if (code === constants.WS_SERVER_CMD_QUIT) {
				log('Receives WS_SERVER_CMD_QUIT. Exit.')
				process.exit(constants.WS_SERVER_CMD_QUIT)
				return
			}
			
			if (code === constants.WS_AUTH_FAILURE)
				restartDelay = maxDelay
			
			restart()
		}).on('error', e => {
			log('ws error:', e.toString())
			ws.close()
		//}).on('ping', data => {
		//	log('ws ping', data.toString())
		//}).on('pong', () => {
		//	log('ws pong', data)
		}).on('unexpected-response', () => {
			log('ws unexpected-response')
			ws.terminate()
		//}).on('upgrade', () => {
		//	log('ws upgrade')
		}).once('message', onFirstMessage)

		function onFirstMessage(text) {
			ws.on('message', onMessage)
			log('Hub connected', text)
			events.emit('connected')
		}

		function onMessage(text) {
			let req = parseRequestMessage(text)
			if (!req) {
				setImmediate(restart)
				return
			}
			
			let target = matchRoute(req.url)
			if (!target) {
				sendError('No matching route', req.seq)
				return
			}
			
			removeRbHeaders(req.headers)
			
			if (options.verbose)
				log(`#${req.seq} --> ${target}${req.url}`)
			
			rawHttp.doHttpCall(target, req, callback)

			function callback(err, respObj) {
				if (err) {
					sendError('Connector error: ' + err, req.seq)
					return
				}
				
				respObj.headers[constants.headers.SEQ_RESP] = req.seq
				//if (respObj.chunks.length > 0)
				//	respObj.headers[constants.headers.CHUNKS] = respObj.chunks.length

				let totalLength = 0
				let chunks = respObj.chunks
				for (let chunk of chunks)
					totalLength += chunk.length
				
				
				let headerText = rawHttp.resToHead(respObj)
				//console.log('header len', headerText.length, 'body len', totalLength)				
				let headerBuf = Buffer.from(headerText, 'utf8')
				totalLength += headerBuf.length
				chunks.unshift(headerBuf)
				
				let lenBuf = Buffer.alloc(8)
				let headerEnd = lenBuf.length + headerBuf.length
				lenBuf.writeInt32LE(headerEnd)
				chunks.unshift(lenBuf)
				totalLength += lenBuf.length
								
				if (options.verbose)
					log(`#${req.seq} <-- ${totalLength}`)
				
				let wholeBuf = Buffer.concat(chunks, totalLength)
				try {
					ws.send(wholeBuf)
					/*
					ws.send(headerText)
					for (let chunk of respObj.chunks) {
						//log('writing body chunk', chunk.length)
						ws.send(chunk)
					}
					*/
				} catch (e) {
					log('Error send back to ws', e)
					restart()
				}
			}
		}
	}

			
	function sendError(msg, seq) {
		let headers = {}
		headers[constants.headers.SEQ_RESP] = seq
		let text = rawHttp.response(503, msg, headers)
		
		if (options.verbose)
			log(`#${seq} <-- Error: ${msg}`)
		
		safeWsCall('send', text)
	}

	function safeWsCall(method, arg) {
		try {
			ws[method](arg)
		} catch (e) {
			log('Error ws call', method, e)
			restart()
		}
	}

	let heartbeatTimer
	function startHeartbeat() {
		const task = () => safeWsCall('ping')
		let interval = options.heartbeatInterval || constants.HEARTBEAT_INTERVAL
		heartbeatTimer = setInterval(task, interval)
	}

	const initialDelay = 1000
	const maxDelay = 300 * 1000
	let restartDelay = initialDelay	
	let restartTimer
	function restart() {
		if (ws)
			ws.terminate()
		
		clearInterval(heartbeatTimer)
		
		events.emit('disconnected')
		
		if (closed) {
			log('Closed.')
			return
		}
		
		restartDelay *= 2
		if (restartDelay > maxDelay)
			restartDelay = maxDelay
		log('reconnect in', restartDelay / 1000)
		clearTimeout(restartTimer)
		restartTimer = setTimeout(createClient, restartDelay)
	}
	
	createClient()
	
	return events
}

function removeRbHeaders(headers) {
	let keys = Object.keys(headers)
	for (let k of keys) {
		if (k.startsWith(constants.headers.PREFIX))
			delete headers[k]
	}
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