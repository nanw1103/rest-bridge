const WebSocket = require('ws')

const {log, error} = require('../shared/log.js')(__filename)
const constants = require('../shared/constants.js')
const rawHttp = require('../shared/raw-http.js')

const registry = require('./registry.js')



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

let workingResp

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
			lastHeartbeat: Date.now()
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
		this.ws.terminate()
		delete connectors[this.info.key]
	}
	
	handleResponseMessage(message) {
		
		stat.response++
		this.stat.response++
		
		let type = typeof message
		if (type === 'string') {
			let res = parseResMessage(message, this.info.id)
			if (!res) {
				stat.errParsingResponse++
				this.stat.errParsingResponse++
				return
			}

			if (workingResp) {
				stat.errDupWorkingResp++
				this.stat.errDupWorkingResp++
				throw 'Invalid state: existing workingResp'
			}
			workingResp = this.pendingResp[res.seq]
			if (!workingResp) {
				stat.errMissingWorkingResp++
				this.stat.errMissingWorkingResp++
				log(`[${this.info.id}]: pending resp not found: ${res.seq}.`)
				return
			}

			stat.response_bytes += Buffer.byteLength(message)
			this.stat.response_bytes += Buffer.byteLength(message)
			
			workingResp.res = res
			if (!res.chunks)
				workingResp.finish()

		} else if (Buffer.isBuffer(message)) {
			stat.response_bytes += message.length
			this.stat.response_bytes += message.length
			if (!workingResp)
				return	//discard

			workingResp.appendBody(message)
		} else {
			if (!workingResp)
				return	//discard
			workingResp.finish('Invalid msg type: ' + type)
		}
	}
	
	send(text, seq, callback) {
		
		stat.outgoing++
		this.stat.outgoing++
		
		let bytes = Buffer.byteLength(text)
		stat.outgoing_bytes += bytes
		this.stat.outgoing_bytes += bytes
		
		//log('sending seq', seq)

		let pending = {
			res: null,
			finish: err => {
				if (workingResp === pending)
					workingResp = null
				clearTimeout(pending.monitor)
				delete this.pendingResp[seq]
				callback(err, pending.res)
			},
			appendBody: chunk => {
				pending.res.chunks.push(chunk)
				if (pending.res.chunks.length === pending.res.numChunks)
					pending.finish()
			},
			monitor: setTimeout(() => {
				stat.errTimeout++
				this.stat.errTimeout++
				log('timeout', seq)
				pending.finish('Timeout')
			}, 20000)
		}
		
		this.pendingResp[seq] = pending
		
		try {
			this.ws.send(text, err => {
				if (err) {
					stat.errSendError++
					this.stat.errSendError++
					pending.finish(err)
					return
				}
			})
		} catch (e) {
			stat.errSendError++
			this.stat.errSendError++
			log(e.toString())
		}
	}
}

const connectors = {}

function findConnector(/*k*/) {
	//return connectors[k]
	return connectors[Object.keys(connectors)[0]]
}

function monitorLiveness() {
	function scanLiveness() {
		let now = Date.now()
		let keys = Object.keys(connectors)
		for (let k of keys) {
			let c = connectors[k]
			let inactive = now - c.stat.lastHeartbeat
			if (inactive > constants.HEARTBEAT_INTERVAL * 2) {
				log('Close timeout', c.info.id)
				c.terminate()
				stat.heartbeatTimeout++
			}
		}
	}
	
	setInterval(scanLiveness, constants.HEARTBEAT_INTERVAL)
}
monitorLiveness()

function init(server/*, options*/) {
	new WebSocket.Server({ 
		server: server,
		path: '/rest-bridge/connect',
		verifyClient: (/*info*/) => {
			//origin {String} The value in the Origin header indicated by the client.
			//secure {Boolean} true if req.connection.authorized or req.connection.encrypted is set.
			//log('verifyClient', info.req.headers)
			return true
		}
	}).on('connection', (ws, req) => {
		
		stat.history_connected++
		
		const ip = req.connection.remoteAddress
		
		let clientInfo = retrieveClientInfo()
		clientInfo.ip = ip

		if (!registry.onConnect(clientInfo)) {
			stat.rejected++
			log('Rejected', clientInfo)
			
			//https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
			ws.close(constants.AUTH_FAILURE)
			return
		}
		log('Incoming connector', clientInfo)
		
		new RemoteConnector(ws, clientInfo)		
		
		function retrieveClientInfo() {
			let ret = {}
			let prefix = constants.headers.PREFIX
			for (let k in req.headers) {
				if (k.startsWith(prefix)) {
					ret[k.substring(prefix.length)] = req.headers[k]
				}
			}
			return ret
		}
	}).on('error', e => {
		log('on error:', e)
	}).on('headers', (/*headers, request*/) => {
		//log('on headers')
	}).on('listening', () => {
		log('on listening')
	})
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
	init: init,
	stat: stat,
	list: list,
	findConnector: findConnector,
	close: close
}
