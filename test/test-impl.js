'use strict'

const {log, error} = require('../shared/log.js')(__filename)
const delay = millis => new Promise(resolve => setTimeout(resolve, millis))

//const role = process.env['test-node-role'] || 'test-master'
let role
let testForward
let testLargeBody
let testStore

for (let i = 2; i < process.argv.length; i++) {
	let arg = process.argv[i]
	
	if (arg === 'testForward=true')
		testForward = true
	else if (arg === 'testLargeBody=true')
		testLargeBody = true
	else if (arg.startsWith('role='))
		role = arg.substring('role='.length)
	else if (arg.startsWith('store='))
		testStore = arg.substring('store='.length)
}

if (role)
	log('Node started:', role)

function main() {
	switch (role) {
	case 'test-hub':		return createHub()
	case 'test-connector':	return createConnector()
	case 'test-target':		return createTargetService()
	case 'test-master':		return createTestMaster()
	case undefined:			return
	default:				throw 'Invalid role ' + role
	}
}
main()

//------------------------------------------------------------------------------------------
//	Create REST-bridge Hub
//	It accpets connections from clients and connectors. 
//	Forward requests from client to connector, and forward response from connector to client.
//------------------------------------------------------------------------------------------
function createHub() {
	const hub = require('../hub')
	
	const options = {
		port: 10763
	}
	
	if (testForward) {
		options.nodes = 2
		//options.store = 'fs-store:/efs/rest-bridge'
		//options.store = 'cluster-mem-store'
	}
	
	if (testStore) {
		options.store = testStore
	}
	
	hub.create(options)
	hub.registry.register({key: 'demoKey'})
}

//------------------------------------------------------------------------------------------
//	Create REST-bridge connector
//	It connects to hub, and target service. 
//	Conector forward requests from hub to target service, and response from target to hub.
//------------------------------------------------------------------------------------------
function createConnector() {		
	const rbconnector = require('../connector')
	rbconnector.start({	
		hub: 'ws://localhost:10763',
		info: {
			key: 'demoKey',
			id: 'demoConnector'
		},	
		routes: {
			'.*': 'http://localhost:10762'
		}		
	})
}

//------------------------------------------------------------------------------------------
//	Create target REST service for testing.
//------------------------------------------------------------------------------------------
function createTargetService() {
	const connect = require('connect')
	const targetServer = connect()

	if (testLargeBody) {
		const bodyParser = require('body-parser')
		targetServer.use(bodyParser.text({
			type: '*/*',
			limit: '1024kb'
		}))
	}

	targetServer.use('/test', function(req, res) {
		let n = Number.parseInt(req.url.substring(1))
		res.writeHead(200, {'x-ret': n})
		
		if (testLargeBody) {
			let len = typeof req.body === 'string' ? Buffer.byteLength(req.body) : 0
			res.end(String(len))
		} else {
			res.end()
		}
	})
	targetServer.listen(10762, log)
}

//------------------------------------------------------------------------------------------
//	Create a client simulator
//	Client simulator sends thousands of requests to hub and verifies results.
//------------------------------------------------------------------------------------------
async function createClientSimulator() {
	const http = require('http')

	let processed = 0
	let total = 0
	function test1(n) {
		return new Promise((resolve, reject) => {
			if (++processed % 2000 === 0) {
				let percent = (processed * 100 / total) | 0
				log(`Processed ${processed}, ${percent}%...`)
			}
			
			//*
			let options = {
				method: 'POST',
				hostname: 'localhost',
				port: 10763,
				path: `/test/${n}`,
				headers: {
					'x-rest-bridge-key': 'demoKey'					
				}
			}
			
			if (testForward)
				options.port = 10764
			
			let bodyLength
			if (testLargeBody) {
				let maxLen = 1024 * 1024
				bodyLength = Math.floor(Math.random() * maxLen)
				
				options.headers['content-type'] = 'text/plain'
				options.headers['content-length'] = bodyLength
			}
			
			//*/	
			
			
			//http.get(`http://localhost:10763/rest-bridge-forward/demoKey/test/${n}`, resp => {
			let req = http.request(options, resp => {
				let ret = resp.headers['x-ret']
				let success = ret === String(n)
				if (!success) {
					error('status', resp.statusCode, resp.statusMessage)
					error('headers', resp.headers)
					return reject(`Fail processing request #${n}.`)
				}
				
				if (!testLargeBody)
					return resolve()

				let body = ''
				resp.setEncoding('utf8')				
					.on('data', chunk => body += chunk)
					.on('end', () => {
						let result = Number.parseInt(body)
						if (result === bodyLength)
							resolve()
						else
							reject(`Body length error: sent=${bodyLength}, server=${result}`)
					})
				
			}).on('error', err => console.error('client req error', err.toString()))
			
			if (testLargeBody) {
				let body = ''.padEnd(bodyLength, '.')
				req.write(body)
			}
			
			req.end()
		})
	}

	async function testSequenceN(n) {
		for (let i = 0; i < n; i++)
			await test1(i)
	}

	let parallel = 10
	let seq = testLargeBody ? 100 : 1000
	total = parallel * seq
	log(`Testing: requests=${total}, parallel=${parallel}`)
	
	let tasks = []
	for (let i = 0; i < parallel; i++)
		tasks.push(testSequenceN(seq))
	
	let start = Date.now()
	await Promise.all(tasks)
	let cost = Date.now() - start
	let speed = (total * 1000 / cost) | 0
	log(`Time=${cost} (ms). ${speed} req/s (CPU=1, testForward=${!!testForward}, testLargeBody=${!!testLargeBody})`)
	log('PASS')
	//hub.close()
	//rbconnector.close()
}

function createChild(role) {
	const fork = require('child_process').fork
	let modulePath = process.argv[1]
	let args = process.argv.slice(2)
	args.push('role=' + role)
	let options = {
		env: {
		}
	}
	fork(modulePath, args, options)
}

function createTestMaster() {
	log(`Test config: testForward=${!!testForward}, testLargeBody=${!!testLargeBody}, store=${testStore}`)
	
	createTestMasterImpl().then(() => {
		process.exit(0)
	}).catch(e => {
		log('FAILED:', e)
		process.exit(1)
	})
}

async function createTestMasterImpl() {
	
	createChild('test-target')
	createChild('test-hub')
	await delay(2000)
	createChild('test-connector')
	await delay(2000)	
	await createClientSimulator()
}
