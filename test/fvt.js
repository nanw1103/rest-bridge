const promisify = require('util').promisify
const {log, error} = require('../shared/log.js')()
const hub = require('../hub')
const rbconnector = require('../connector')

const demoDelay = millis => new Promise(resolve => setTimeout(resolve, millis))

//This demo shows how hub, connector, target and http client works.
async function prepare(hubConfig, connectorConfig) {

	hubConfig = hubConfig || require('./defaultHubConfig.js')
	connectorConfig = connectorConfig || require('./defaultConnectorConfig.js')

	await createTarget()
	await hub.create(hubConfig)

	hub.registry.register({
		key: 'demoKey',
		description: 'demo connector'
	})

	await demoDelay(2000)

	return new Promise((resolve, reject) => {
		rbconnector
			.start(connectorConfig)
			.on('failure', reject)
			.on('connected', resolve)
	})
}

function createTarget() {
	const app = require('connect')()
	const bodyParser = require('body-parser')
	app.use(bodyParser.raw({
		type: '*/*',
		limit: '1024kb'
	}))

	app.use('/hello', function(req, res) {
		res.end('Hello, mortal.')
	})
	app.use('/testBody', function(req, res) {
		let len = typeof req.body === 'string' ? Buffer.byteLength(req.body) : req.body.length
		console.log('target: testBody: recv:', len, typeof req.body)
		res.end(String(len))
	})
	let listen = promisify(app.listen.bind(app))
	return listen(10762)
}

async function runTests(tests) {
	let anyError
	for (let f of tests) {
		let ret = 'OK'
		try {
			let v = await f()
			if (!v) {
				ret = 'Non-true result'
				anyError = true
			}
		} catch (e) {
			ret = e
			anyError = true
		}
		log('CASE', f.name.padEnd(16), ret)
	}
	return !anyError
}

function fvt(hubConfig, connectorConfig, testFn) {
	let name = require('newheelog/find-module-name')()

	log('SUITE', name, '------------------------------------------')
	function finish(err) {
		if (err) {
			error('SUITE', name, 'ERROR', err)
			process.exit(123)
		} else {
			log('SUITE', name, 'SUCCESS')
			process.exit()
		}
	}

	prepare(hubConfig, connectorConfig)
		.then(() => {
			if (Array.isArray(testFn)) {
				return runTests(testFn)
			} else {
				return testFn()
			}
		})
		.then(success => {
			let err = success ? null : 'Non-success test result'
			finish(err)
		})
		.catch(finish)
}

module.exports = fvt