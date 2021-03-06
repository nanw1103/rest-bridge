const WebSocket = require('ws')

const {log} = require('../shared/log.js')()
const constants = require('../shared/constants.js')
const rawHttp = require('../shared/raw-http.js')
const thisNode = require('../shared/node.js')
const rbheaders = require('../shared/constants.js').headers
const registry = require('./registry.js')
const makeContext = require('./context-util.js').makeContext

//----------------------
//	Module data
//----------------------
const connectors = {}

const stat = {
	//connections
	connected: 0,
	history_connected: 0,
	rejected: 0,
	heartbeatTimeout: 0,

	//messages
	outgoing: 0,
	outgoing_bytes: 0,
	response: 0,
	response_bytes: 0,

	//errors
	errWs: 0,
	errMissingWorkingResp: 0,
	errParsingResponse: 0,
	errDupWorkingResp: 0,
	errTimeout: 0,
	errSendError: 0,
}

function parseResMessage(text, id) {
	let res = rawHttp.parseResp(text)

	let seq = res.headers[constants.headers.SEQ_RESP]
	if (!seq) {
		log(`[${id}]: ${constants.headers.SEQ_RESP} not found.`, text)
		return
	}
	delete res.headers[constants.headers.SEQ_RESP]
	res.seq = seq

	let numChunks = res.headers[constants.headers.CHUNKS]
	if (numChunks) {
		res.numChunks = Number.parseInt(numChunks)
		res.chunks = []
		delete res.headers[constants.headers.CHUNKS]
	}
	return res
}

function removeRbHeaders(headers) {
	let keys = Object.keys(headers)
	for (let k of keys) {
		if (k.startsWith(rbheaders.PREFIX))
			delete headers[k]
	}
}

class RemoteConnector {
	constructor(ws, info) {
		Object.defineProperties(this, {
			ws: {
				value: ws
			},
			pendingResp: {
				value: {}
			}
		})

		let now = Date.now()

		this.info = info
		this.stat = {
			outgoing: 0,
			outgoing_bytes: 0,
			response: 0,
			response_bytes: 0,

			//errors
			errWs: 0,
			errMissingWorkingResp: 0,
			errParsingResponse: 0,
			errDupWorkingResp: 0,
			errTimeout: 0,
			errSendError: 0,

			//time
			lastHeartbeat: now,
			connectedAt: now,
			lastActivity: 0
		}

		let id = info.id

		ws.on('open', () => {
			log('ws open', id)
		}).on('close', (code, reason) => {
			registry.onDisconnect(info)
			delete connectors[info.key]
			stat.connected = Object.keys(connectors).length
			log('ws close', id, code, reason)
		}).on('error', e => {
			log('ws error:', id, e.toString())
			stat.errWs++
		}).on('ping', (/*data*/) => {
			//log('ws ping', id, data)
			this.stat.lastHeartbeat = Date.now()
		}).on('pong', data => {
			log('ws pong', id, data)
		}).on('unexpected-response', (/*req, res*/) => {
			log('ws unexpected-response', id)
		}).on('upgrade', (/*res*/) => {
			log('ws upgrade', id)
		}).on('message', this.handleResponseMessage.bind(this))

		connectors[info.key] = this
		stat.connected = Object.keys(connectors).length
	}

	terminate() {
		delete connectors[this.info.key]
		this.ws.terminate()
	}

	close(code, data) {
		if (code === 'quit')
			code = constants.WS_SERVER_CMD_QUIT
		delete connectors[this.info.key]
		try {
			this.ws.close(code, data)
		} catch (e) {
			this.ws.terminate()
		}
	}

	handleResponseMessage(message) {

		stat.response++
		this.stat.response++

		stat.response_bytes += message.length
		this.stat.response_bytes += message.length

		this.stat.lastActivity = Date.now()

		let res
		if (typeof message === 'string') {
			res = parseResMessage(message, this.info.id)
		} else {
			let headerEnd = message.readInt32LE()
			let headerText = message.toString('utf8', 8, headerEnd)
			res = parseResMessage(headerText, this.info.id)

			//console.log('header len', headerText.length, 'body len', message.length -headerEnd)
			if (message.length > headerEnd)
				res.body = message.slice(headerEnd)
		}

		if (!res) {
			stat.errParsingResponse++
			this.stat.errParsingResponse++
			return
		}

		let workingResp = this.pendingResp[res.seq]
		if (!workingResp) {
			stat.errMissingWorkingResp++
			this.stat.errMissingWorkingResp++
			log(`[${this.info.id}]: pending resp not found: ${res.seq}.`)
			return
		}

		workingResp.finish(null, res)
	}

	send(req, callback) {
		stat.outgoing++
		this.stat.outgoing++

		let seq = this.stat.outgoing

		removeRbHeaders(req.headers)
		req.headers[rbheaders.SEQ] = seq

		let text = rawHttp.reqToText(req)

		let bytes = Buffer.byteLength(text)
		stat.outgoing_bytes += bytes
		this.stat.outgoing_bytes += bytes

		//log('sending seq', seq)

		let pending = {
			finish: (err, res) => {
				clearTimeout(pending.monitor)
				delete this.pendingResp[seq]
				callback(err, res)
			},
			/*
			appendBody: chunk => {
				pending.res.chunks.push(chunk)
				if (pending.res.chunks.length === pending.res.numChunks)
					pending.finish()
			},
			*/
			monitor: setTimeout(() => {
				stat.errTimeout++
				this.stat.errTimeout++
				log('timeout', seq)
				pending.finish('Timeout')
			}, 20000)
		}

		this.pendingResp[seq] = pending

		let _this_stat = this.stat
		try {
			this.ws.send(text, err => {
				if (err) {
					onSendError(err)
				}
			})
		} catch (e) {
			onSendError(e)
		}

		function onSendError(e) {
			stat.errSendError++
			_this_stat.errSendError++
			log('Error ws send', e.toString())
			pending.finish(e)
		}
	}
}

function findConnector(k) {
	return connectors[k]
}

function monitorLiveness(heartbeatInterval) {

	heartbeatInterval = heartbeatInterval || constants.HEARTBEAT_INTERVAL
	function scanLiveness() {
		let now = Date.now()
		let keys = Object.keys(connectors)
		for (let k of keys) {
			let c = connectors[k]
			let inactive = now - c.stat.lastHeartbeat
			if (inactive > heartbeatInterval * 2 + 10000) {
				log('Close timeout', c.info.id)
				c.terminate()
				stat.heartbeatTimeout++
			}
		}
	}

	setInterval(scanLiveness, heartbeatInterval)
}

function initConnection(ws, req, options) {

	stat.history_connected++
	let clientInfo = retrieveClientInfo(req)
	clientInfo.ip = req.connection.remoteAddress

	log('Incoming connector', JSON.stringify(clientInfo))

	verifyClient(clientInfo, options).then(() => {
		//send server info
		let serverInfo = JSON.stringify(thisNode.format())
		ws.send(serverInfo, err => {
			if (err) {
				log('Error sending hub info to connector', err.toString())
				ws.terminate()
			} else {
				log('Connector accepted:', clientInfo.id)
				new RemoteConnector(ws, clientInfo)	// eslint-disable-line no-new
			}
		})
	}).catch(e => {
		stat.rejected++
		log('Client rejected: ' + e, clientInfo)
		//https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
		ws.close(constants.WS_AUTH_FAILURE)
	})
}

async function verifyClient(clientInfo, options) {
	if (options.auth.verifyClient) {
		let allow = await options.auth.verifyClient(clientInfo)
		if (!allow)
			return Promise.reject('Failing custom verifyClient')
	}
	await registry.onConnect(clientInfo, options.auth.allowUnregistered)
}

function retrieveClientInfo(req) {
	let ret = {}
	let prefix = constants.headers.PREFIX
	for (let k in req.headers) {
		if (k.startsWith(prefix)) {
			ret[k.substring(prefix.length)] = req.headers[k]
		}
	}
	return ret
}

function init(server, options) {

	//*
	let verifyClientFn = () => {
		//origin {String} The value in the Origin header indicated by the client.
		//secure {Boolean} true if req.connection.authorized or req.connection.encrypted is set.
		//log('verifyClient', info.req.headers)
		return true
	}
	//*/

	let ctx = makeContext(options.baseContext, '/rest-bridge/connect')
	new WebSocket.Server({
		server,
		path: ctx,
		verifyClient: verifyClientFn
	}).on('connection', (ws, req) => initConnection(ws, req, options))
		.on('error', e => {
			log('on error:', e)
			//}).on('headers', (/*headers, request*/) => {
			//	log('on headers')
			//}).on('listening', () => {
			//	log('on listening')
		})

	monitorLiveness(options.heartbeatInterval)
}

function list() {
	return connectors
}

function close() {
	let array = Object.values(connectors)
	for (let c of array) {
		c.terminate()
	}
}

module.exports = {
	init,
	stat,
	list,
	findConnector,
	close
}
