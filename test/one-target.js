'use strict'
const {log, error} = require('../shared/log.js')(__filename)
const connect = require('connect')
const app = connect()
const config = require('./config.js')

if (config.testLargeBody) {
	
	const bodyParser = require('body-parser')
	app.use(bodyParser.raw({
		type: '*/*',
		limit: '1024kb'
	}))
}

app.use('/test', function(req, res) {
	let n = Number.parseInt(req.url.substring(1))
	res.writeHead(200, {'x-ret': n})
	
	if (config.testLargeBody) {
		let len = typeof req.body === 'string' ? Buffer.byteLength(req.body) : req.body.length
		res.end(String(len))
	} else {
		res.end()
	}
})

app.use(function(err){
	log('err~', String(err))
})

let parsed = require('url').parse(config.target)

let port = parsed.port
if (!port)
	port = parsed.protocol === 'http:' ? 80 : 443

app.listen(port, err => {
	if (err) {
		error(err)
	} else
		log('Server listening on', port)
})