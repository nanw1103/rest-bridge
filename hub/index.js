const connect = require('connect')
const bodyParser = require('body-parser')
const http = require('http')

const {log} = require('../shared/log.js')(__filename)

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

statSvc.init(app)
mgmtSvc.init(app)
clientSvc.init(app)
connectorSvc.init(server)

app.use(function onerror(err, req) {
	log(err)
	req.writeHeader(500)
	req.end(err.toString())
})

function create(options, callback) {
	server.listen(options.port, options.host, err => {
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

function close() {
	server.close(() => {
		connectorSvc.close()
	})
}

module.exports = {
	create: create,
	close: close,
	registry: registry
}