const os = require('os')
const connect = require('connect')
const bodyParser = require('body-parser')
const http = require('http')

const {log, error} = require('../shared/log.js')(__filename)

const thisNode = require('../shared/node.js')

const mgmtSvc = require('./mgmt-svc.js')
const connectorSvc = require('./connector-svc.js')
const clientSvc = require('./client-svc.js')
const statSvc = require('./stat-svc.js')
const registry = require('./registry.js')

function onError(err, req, res, next) {
	let msg = err.toString()
	log('err~', msg)
	res.writeHead(503)
	res.end(err.toString())
}

let managementServer
let clientServer
let connectorServer

function create(options) {
	
	if (options.id)
		thisNode.id = options.id
	let port = Number.parseInt(options.port)
	thisNode.name = port

	let _reusedServer = options._server
	delete options._server
	log('Creating node', JSON.stringify(options))

	const ips = getIPs()
	log('Network', JSON.stringify(ips))
	thisNode.url = `http://${ips._first}:${port}`

	registry.configStore(options.store)

	//create management app
	let managementApp = connect()
	managementApp.use(bodyParser.text({
		type: '*/*',
		limit: '1024kb'
	}))
	statSvc.init(managementApp, options)
	mgmtSvc.init(managementApp, options)
		
	if (!options.managementPort)
		options.managementPort = options.port
	
	if (_reusedServer) {
		managementServer = _reusedServer
	} else {
		managementServer = http.createServer(managementApp)
		managementServer.listen(options.managementPort, options.managementHost, err => {
			if (err) {
				error('Error starting management server', err)
				process.exit(11)
			}				
			log(`Hub - management server started: ${options.managementHost || ''}:${options.managementPort}`)
		})
	}
		
	//create client app
	if (!options.managementPort || options.managementPort === options.port) {
		clientSvc.init(managementApp, options)		
		clientServer = managementServer
		log('Sharing client server & management server')
	} else {
		let clientApp = connect()
		clientApp.use(bodyParser.text({
			type: '*/*',
			limit: '1024kb'
		}))
		clientSvc.init(clientApp, options)
		clientApp.use(onError)
		clientServer = http.createServer(clientApp)
		clientServer.listen(options.port, options.clientHost, err => {
			if (err) {
				error('Error starting client server', err)
				process.exit(12)
			}				
			log(`Hub - client server started: ${options.clientHost || ''}:${options.port}`)
		})
	}
	
	managementApp.use(onError)
	
	//create connector service
	if (!options.connectorPort || options.connectorPort === options.port) {
		connectorServer = clientServer
		log('Sharing connector server & client server')
	} else if (options.connectorPort === options.managementPort) {
		connectorServer = managementServer
		log('Sharing connector server & management server')
	} else {
		connectorServer = http.createServer()
		connectorServer.listen(options.connectorPort, options.connectorHost, err => {
			if (err) {
				error('Error starting connector server', err)
				process.exit(13)
			}				
			log(`Hub - connector server started: ${options.connectorHost || ''}:${options.connectorPort}`)
		})
	}
	connectorSvc.init(connectorServer, options)
	
	return {
		_close: close,
		_managementApp: managementApp,
		_managementServer: managementServer,
		_clientServer: clientServer,
		_connectorServer: connectorServer,
		_connectorSvc: connectorSvc
	}
}

function getIPs() {
	let ret = {}
	let _first
	
	let ifaces = os.networkInterfaces()
	Object.keys(ifaces).forEach(ifname => {
		let ips = []
		ifaces[ifname].forEach(iface => {
			if ('IPv4' !== iface.family || iface.internal !== false) {
				return	// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
			}
			ips.push(iface.address)
			if (!_first)
				_first = iface.address
		})
		if (ips.length > 0)
			ret[ifname] = ips
	})
	ret._first = _first
	return ret
}

function close() {
	managementServer.close()
	clientServer.close()
	connectorServer.close()
	connectorSvc.close()
}

module.exports = {
	create: create,
	close: close,
	registry: registry
}
