const os = require('os')
const connect = require('connect')
const bodyParser = require('body-parser')
const http = require('http')

const {log} = require('../shared/log.js')(__filename)

const thisNode = require('../shared/node.js')

const mgmtSvc = require('./mgmt-svc.js')
const connectorSvc = require('./connector-svc.js')
const clientSvc = require('./client-svc.js')
const statSvc = require('./stat-svc.js')
const registry = require('./registry.js')

const app = connect()

// parse urlencoded request bodies into req.body

//app.use(bodyParser.raw({
//	type: '*/*',
//	inflate: false,
//	limit: '1024kb'
//}))

app.use(bodyParser.text({
	type: '*/*',
	limit: '1024kb'
}))


const server = http.createServer(app)

connectorSvc.init(server)
statSvc.init(app)
mgmtSvc.init(app)
clientSvc.init(app)

app.use(function onerror(err, req) {
	log(err)
	req.writeHeader(500)
	req.end(err.toString())
})

function create(options, callback) {
	/*
	let store
	if (options.store) {
		//'fs-store:/efs/rest-bridge-reg',
		let fsStoreType = 'fs-store:'
		if (options.store.startsWith(fsStoreType)) {
			let FsStore = require('./fs-store.js')
			store = new FsStore(options.store.substring(fsStoreType.length))
		} else {
			throw 'Unknown store type: ' + options.store
		}
	} else {
		store = require('./mem-store.js')
	}
	registry.useStore(store)
	*/
	
	if (options.id)
		thisNode.id = options.id
	
	const ips = getIPs()
	console.log('network', ips)
	
	let port = Number.parseInt(options.port)
	thisNode.port = port
	thisNode.url = `http://${ips._first}:${port}`

	log('Creating node', options)
	
	server.listen(port, options.host, err => {
		if (err) {
			error(err)
		} else {
			let host = options.host
			if (!host)
				host = '*'
			log(`Hub started on ${host}:${options.port}`)
		}
		
		if (callback)
			callback(err)
	})
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
	server.close(() => {
		connectorSvc.close()
	})
}

const DEFAULTS = {
	port: 80,
	store: 'fs-store:/efs/rest-bridge-reg'
}

module.exports = {
	create: create,
	close: close,
	registry: registry,
	DEFAULTS: DEFAULTS
}
